"""
Convert Clemson Cafeteria Dataset to VitalAI pipeline format.

Clemson format:
- 15 Hz sampling rate
- 7 columns per row (tab-separated): accel_x, accel_y, accel_z, gyro_yaw, gyro_pitch, gyro_roll, scale_weight
- Accelerometer values in VOLTS: G = (V - 1.65) * (5.0 / 3.3)
- Gyroscope values in VOLTS: D = (V - zero_voltage) * 400 deg/s
- Gesture ground truth: gesture_type, start_index, end_index, (extra cols)
- Files per participant (p###) per course (c#)

VitalAI pipeline format:
- 50 Hz sampling rate (we upsample from 15 Hz via linear interpolation)
- Columns: window_id, sample_idx, activity, label, accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z
- Accelerometer in g, gyroscope in rad/s
- 15-second windows (750 samples at 50 Hz)
- Binary label: 1 = eating (bite gesture), 0 = non-eating

Key decisions:
- Upsample 15→50 Hz: linear interpolation preserves frequency content up to 7.5 Hz
  (eating gestures are 0.2-2 Hz, well within Nyquist)
- Map "bite" gestures → eating (label=1), everything else → non-eating (label=0)
- "drink" is kept as non-eating since our detector targets food intake specifically
- Windows with >50% bite samples are labeled eating
- 80/20 train/test split by participant (not by window) to avoid data leakage
"""

import numpy as np
import pandas as pd
from pathlib import Path
from scipy import interpolate
import re


CLEMSON_SAMPLE_RATE = 15
TARGET_SAMPLE_RATE = 50
WINDOW_SECONDS = 15
TARGET_SAMPLES_PER_WINDOW = TARGET_SAMPLE_RATE * WINDOW_SECONDS  # 750
CLEMSON_SAMPLES_PER_WINDOW = CLEMSON_SAMPLE_RATE * WINDOW_SECONDS  # 225

# Clemson sensor conversion constants
ACCEL_ZERO_V = 1.65
ACCEL_SCALE = 5.0 / 3.3  # V to g

# Gyroscope zero voltage varies per device, but 1.23V is typical for LPY410al
GYRO_ZERO_V = 1.23
GYRO_SCALE = 400.0  # V to deg/s
DEG_TO_RAD = np.pi / 180.0

GESTURE_MAP = {
    "bite": "eating",
    "drink": "drinking",
    "rest": "idle",
    "utensiling": "utensiling",
    "other": "other",
}


def volts_to_g(volts: np.ndarray) -> np.ndarray:
    return (volts - ACCEL_ZERO_V) * ACCEL_SCALE


def volts_to_rads(volts: np.ndarray) -> np.ndarray:
    return (volts - GYRO_ZERO_V) * GYRO_SCALE * DEG_TO_RAD


def upsample_signal(signal: np.ndarray, from_rate: int, to_rate: int) -> np.ndarray:
    """Upsample a 1D signal from from_rate to to_rate using linear interpolation."""
    n_original = len(signal)
    n_target = int(n_original * to_rate / from_rate)

    x_original = np.arange(n_original)
    x_target = np.linspace(0, n_original - 1, n_target)

    f = interpolate.interp1d(x_original, signal, kind="linear", fill_value="extrapolate")
    return f(x_target)


def load_sensor_file(filepath: Path) -> np.ndarray | None:
    """Load a Clemson sensor data file (tab-separated, 7 columns)."""
    try:
        data = np.loadtxt(filepath, delimiter="\t")
        if data.ndim != 2 or data.shape[1] < 6:
            print(f"    Skipping {filepath.name}: unexpected shape {data.shape}")
            return None
        return data
    except Exception as e:
        print(f"    Error loading {filepath.name}: {e}")
        return None


def load_gesture_file(filepath: Path) -> list[dict] | None:
    """Load a Clemson gesture ground truth file.

    Format: gesture_type  start_index  end_index  [extra_cols...]
    """
    try:
        gestures = []
        with open(filepath, "r") as f:
            for line in f:
                parts = line.strip().split("\t")
                if len(parts) < 3:
                    parts = line.strip().split()
                if len(parts) < 3:
                    continue

                gesture_type = parts[0].lower().strip()
                try:
                    start_idx = int(parts[1])
                    end_idx = int(parts[2])
                except ValueError:
                    continue

                if gesture_type in GESTURE_MAP:
                    gestures.append({
                        "type": gesture_type,
                        "activity": GESTURE_MAP[gesture_type],
                        "start": start_idx,
                        "end": end_idx,
                    })
        return gestures if gestures else None
    except Exception as e:
        print(f"    Error loading gesture file {filepath.name}: {e}")
        return None


def find_matching_files(sensor_dir: Path, gesture_dir: Path) -> list[dict]:
    """Find sensor files that have matching gesture ground truth files.

    Clemson structure:
      sensor: p###/c#/TIMESTAMP.txt (one sensor data file per course)
      gesture: p###/c#/gesture_union.txt (one gesture GT file per course)

    We match by directory: same p###/c# path.
    """
    matches = []

    # Walk sensor directory to find all participant/course directories
    for participant_dir in sorted(sensor_dir.iterdir()):
        if not participant_dir.is_dir():
            continue
        participant = participant_dir.name

        for course_dir in sorted(participant_dir.iterdir()):
            if not course_dir.is_dir():
                continue

            # Find sensor data file (timestamp-named .txt)
            sensor_files = [f for f in course_dir.glob("*.txt") if f.stem.isdigit() or len(f.stem) > 10]
            if not sensor_files:
                # Fall back to any .txt file that looks like data
                sensor_files = list(course_dir.glob("*.txt"))

            # Find gesture ground truth file
            gesture_course_dir = gesture_dir / participant / course_dir.name
            gesture_file = gesture_course_dir / "gesture_union.txt"
            if not gesture_file.exists():
                # Try other gesture file patterns
                gesture_files = list(gesture_course_dir.glob("gesture*.txt")) if gesture_course_dir.exists() else []
                if gesture_files:
                    gesture_file = gesture_files[0]
                else:
                    continue

            for sf in sensor_files:
                matches.append({
                    "sensor_file": sf,
                    "gesture_file": gesture_file,
                    "participant": participant,
                    "rel_path": f"{participant}/{course_dir.name}/{sf.name}",
                })

    return matches


def create_label_array(n_samples: int, gestures: list[dict]) -> tuple[np.ndarray, np.ndarray]:
    """Create per-sample label and activity arrays from gesture annotations.

    Returns: (labels, activities) where labels is binary (1=eating, 0=not)
    and activities is a string array with gesture type names.
    """
    labels = np.zeros(n_samples, dtype=int)
    activities = np.full(n_samples, "rest", dtype=object)

    for g in gestures:
        start = max(0, g["start"])
        end = min(n_samples, g["end"])
        if start >= end:
            continue

        if g["type"] == "bite":
            labels[start:end] = 1
        activities[start:end] = g["activity"]

    return labels, activities


def process_participant(sensor_data: np.ndarray, gestures: list[dict],
                        participant: str, window_id_offset: int) -> tuple[list[dict], int]:
    """Process one participant's data into 15-second windows.

    Steps:
    1. Convert volts to physical units (g, rad/s)
    2. Create per-sample labels from gesture annotations
    3. Upsample from 15 Hz to 50 Hz
    4. Cut into 15-second windows (750 samples) with 50% overlap
    5. Label each window by majority vote
    """
    n_samples_original = sensor_data.shape[0]

    # Convert sensor values from volts to physical units
    accel_x = volts_to_g(sensor_data[:, 0])
    accel_y = volts_to_g(sensor_data[:, 1])
    accel_z = volts_to_g(sensor_data[:, 2])

    # Gyro columns: yaw, pitch, roll → map to x, y, z
    gyro_x = volts_to_rads(sensor_data[:, 3])
    gyro_y = volts_to_rads(sensor_data[:, 4])
    gyro_z = volts_to_rads(sensor_data[:, 5])

    # Create label array at original sample rate
    labels_orig, activities_orig = create_label_array(n_samples_original, gestures)

    # Upsample all channels from 15 Hz to 50 Hz
    channels = [accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z]
    upsampled = [upsample_signal(ch, CLEMSON_SAMPLE_RATE, TARGET_SAMPLE_RATE) for ch in channels]

    # Upsample labels (nearest-neighbor to preserve boundaries)
    n_target = len(upsampled[0])
    label_indices = np.round(np.linspace(0, n_samples_original - 1, n_target)).astype(int)
    labels_up = labels_orig[label_indices]
    activities_up = activities_orig[label_indices]

    # Create windows with 50% overlap
    step = TARGET_SAMPLES_PER_WINDOW // 2  # 375 samples
    rows = []
    window_count = 0

    for start in range(0, n_target - TARGET_SAMPLES_PER_WINDOW + 1, step):
        end = start + TARGET_SAMPLES_PER_WINDOW
        window_labels = labels_up[start:end]
        window_activities = activities_up[start:end]

        # Window label: majority vote
        eating_ratio = window_labels.mean()
        window_label = 1 if eating_ratio > 0.5 else 0

        # Window activity: most common activity
        unique, counts = np.unique(window_activities, return_counts=True)
        window_activity = unique[np.argmax(counts)]

        wid = window_id_offset + window_count

        for sample_idx in range(TARGET_SAMPLES_PER_WINDOW):
            rows.append({
                "window_id": wid,
                "sample_idx": sample_idx,
                "activity": window_activity,
                "label": window_label,
                "accel_x": upsampled[0][start + sample_idx],
                "accel_y": upsampled[1][start + sample_idx],
                "accel_z": upsampled[2][start + sample_idx],
                "gyro_x": upsampled[3][start + sample_idx],
                "gyro_y": upsampled[4][start + sample_idx],
                "gyro_z": upsampled[5][start + sample_idx],
                "participant": participant,
            })

        window_count += 1

    return rows, window_count


def main():
    data_dir = Path(__file__).parent / "data" / "clemson"
    output_dir = Path(__file__).parent / "data"

    sensor_dir = data_dir / "sensor_data"
    gesture_dir = data_dir / "gesture_gt"

    # Find the actual data directories (may be nested after extraction)
    # Clemson zips sometimes have a top-level folder
    sensor_candidates = list(sensor_dir.rglob("p0*"))
    if not sensor_candidates:
        # Try one level deeper
        for subdir in sensor_dir.iterdir():
            if subdir.is_dir():
                sensor_candidates = list(subdir.rglob("p0*"))
                if sensor_candidates:
                    sensor_dir = subdir
                    break

    gesture_candidates = list(gesture_dir.rglob("p0*"))
    if not gesture_candidates:
        for subdir in gesture_dir.iterdir():
            if subdir.is_dir():
                gesture_candidates = list(subdir.rglob("p0*"))
                if gesture_candidates:
                    gesture_dir = subdir
                    break

    print("Clemson Cafeteria → VitalAI Pipeline Converter")
    print("=" * 55)
    print(f"Sensor data dir:  {sensor_dir}")
    print(f"Gesture GT dir:   {gesture_dir}")
    print(f"Output dir:       {output_dir}")
    print()

    # Find matching sensor + gesture file pairs
    matches = find_matching_files(sensor_dir, gesture_dir)

    if not matches:
        print("ERROR: No matching sensor/gesture file pairs found.")
        print()
        print("Expected directory structure:")
        print(f"  {sensor_dir}/p001/c1/filename.txt")
        print(f"  {gesture_dir}/p001/c1/filename.txt")
        print()
        print("Make sure you ran download_clemson.py first.")
        return

    print(f"Found {len(matches)} sensor/gesture file pairs")

    # Get unique participants and split 80/20 by participant
    participants = sorted(set(m["participant"] for m in matches))
    n_participants = len(participants)
    n_train = int(n_participants * 0.8)

    rng = np.random.default_rng(42)
    rng.shuffle(participants)
    train_participants = set(participants[:n_train])
    test_participants = set(participants[n_train:])

    print(f"Participants: {n_participants} total, {len(train_participants)} train, {len(test_participants)} test")
    print()

    # Process all files
    train_rows = []
    test_rows = []
    train_window_offset = 0
    test_window_offset = 0
    total_eating_windows = 0
    total_windows = 0

    for i, match in enumerate(matches):
        sensor_data = load_sensor_file(match["sensor_file"])
        if sensor_data is None:
            continue

        gestures = load_gesture_file(match["gesture_file"])
        if gestures is None:
            continue

        is_train = match["participant"] in train_participants

        if is_train:
            rows, n_windows = process_participant(
                sensor_data, gestures, match["participant"], train_window_offset
            )
            train_rows.extend(rows)
            train_window_offset += n_windows
        else:
            rows, n_windows = process_participant(
                sensor_data, gestures, match["participant"], test_window_offset
            )
            test_rows.extend(rows)
            test_window_offset += n_windows

        eating_in_session = sum(1 for r in rows if r["sample_idx"] == 0 and r["label"] == 1)
        total_eating_windows += eating_in_session
        total_windows += n_windows

        if (i + 1) % 50 == 0 or i == len(matches) - 1:
            print(f"  Processed {i + 1}/{len(matches)} files... "
                  f"({total_windows} windows, {total_eating_windows} eating)")

    print()

    # Save as parquet (same format as synthetic data)
    if train_rows:
        train_df = pd.DataFrame(train_rows)
        # Drop participant column before saving (not in pipeline format)
        participant_col = train_df.pop("participant")
        train_path = output_dir / "train_raw.parquet"
        train_df.to_parquet(train_path, index=False)
        n_train_windows = train_df["window_id"].nunique()
        n_train_eating = train_df[train_df["sample_idx"] == 0]["label"].sum()
        print(f"Train set: {n_train_windows} windows ({n_train_eating} eating, "
              f"{n_train_windows - n_train_eating} non-eating)")
        print(f"  Saved to {train_path}")
    else:
        print("WARNING: No training data generated")

    if test_rows:
        test_df = pd.DataFrame(test_rows)
        test_df.pop("participant")
        test_path = output_dir / "test_raw.parquet"
        test_df.to_parquet(test_path, index=False)
        n_test_windows = test_df["window_id"].nunique()
        n_test_eating = test_df[test_df["sample_idx"] == 0]["label"].sum()
        print(f"Test set:  {n_test_windows} windows ({n_test_eating} eating, "
              f"{n_test_windows - n_test_eating} non-eating)")
        print(f"  Saved to {test_path}")
    else:
        print("WARNING: No test data generated")

    print()
    print("Conversion complete.")
    print(f"Total: {total_windows} windows, {total_eating_windows} eating "
          f"({total_eating_windows / max(1, total_windows) * 100:.1f}%)")
    print()
    print("Next steps:")
    print("  1. python extract_features.py    # Extract 17 features per window")
    print("  2. python train_model.py         # Train Gradient Boosting classifier")
    print("  3. python export_coreml.py       # Export to Core ML for Apple Watch")


if __name__ == "__main__":
    main()
