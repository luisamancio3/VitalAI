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
- Windows with >5% bite samples are labeled eating
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


def process_participant_to_arrays(sensor_data: np.ndarray, gestures: list[dict],
                                   participant: str, window_id_offset: int) -> tuple[np.ndarray, int, int]:
    """Process one participant's data into 15-second windows.

    Returns a numpy array of shape (n_windows, SAMPLES_PER_WINDOW, 10) where
    the 10 columns are: window_id, sample_idx, label, accel_x..z, gyro_x..z,
    plus eating_count for stats. Returns (array, n_windows, n_eating_windows).
    """
    n_samples_original = sensor_data.shape[0]
    if n_samples_original < CLEMSON_SAMPLES_PER_WINDOW:
        return np.empty((0, TARGET_SAMPLES_PER_WINDOW, 8)), 0, 0

    # Convert sensor values from volts to physical units
    accel_x = volts_to_g(sensor_data[:, 0])
    accel_y = volts_to_g(sensor_data[:, 1])
    accel_z = volts_to_g(sensor_data[:, 2])
    gyro_x = volts_to_rads(sensor_data[:, 3])
    gyro_y = volts_to_rads(sensor_data[:, 4])
    gyro_z = volts_to_rads(sensor_data[:, 5])

    labels_orig, activities_orig = create_label_array(n_samples_original, gestures)

    # Upsample all channels from 15 Hz to 50 Hz
    channels = np.column_stack([accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z])
    n_target = int(n_samples_original * TARGET_SAMPLE_RATE / CLEMSON_SAMPLE_RATE)

    x_orig = np.arange(n_samples_original)
    x_target = np.linspace(0, n_samples_original - 1, n_target)

    upsampled = np.zeros((n_target, 6))
    for col in range(6):
        f = interpolate.interp1d(x_orig, channels[:, col], kind="linear", fill_value="extrapolate")
        upsampled[:, col] = f(x_target)

    # Upsample labels (nearest-neighbor)
    label_indices = np.round(np.linspace(0, n_samples_original - 1, n_target)).astype(int)
    labels_up = labels_orig[label_indices]
    activities_up = activities_orig[label_indices]

    # Create windows with 50% overlap
    step = TARGET_SAMPLES_PER_WINDOW // 2
    window_starts = list(range(0, n_target - TARGET_SAMPLES_PER_WINDOW + 1, step))
    n_windows = len(window_starts)

    if n_windows == 0:
        return np.empty((0, TARGET_SAMPLES_PER_WINDOW, 8)), 0, 0

    # Pre-allocate: columns = [window_id, sample_idx, label, ax, ay, az, gx, gy, gz]
    # We'll build window metadata separately
    window_labels = np.zeros(n_windows, dtype=int)
    window_activities = []
    window_data = np.zeros((n_windows, TARGET_SAMPLES_PER_WINDOW, 6))

    for wi, start in enumerate(window_starts):
        end = start + TARGET_SAMPLES_PER_WINDOW
        window_data[wi] = upsampled[start:end]

        eating_ratio = labels_up[start:end].mean()
        window_labels[wi] = 1 if eating_ratio > 0.05 else 0

        unique, counts = np.unique(activities_up[start:end], return_counts=True)
        window_activities.append(unique[np.argmax(counts)])

    n_eating = int(window_labels.sum())
    return (window_data, window_labels, window_activities, window_id_offset, n_windows, n_eating)


def write_windows_to_parquet(window_result, output_path: Path, window_id_offset: int, append: bool = False):
    """Write processed windows to parquet, expanding to per-sample rows.

    Memory-efficient: processes one file's windows at a time.
    """
    window_data, window_labels, window_activities, _, n_windows, _ = window_result

    if n_windows == 0:
        return

    rows = []
    for wi in range(n_windows):
        wid = window_id_offset + wi
        label = int(window_labels[wi])
        activity = window_activities[wi]

        for si in range(TARGET_SAMPLES_PER_WINDOW):
            rows.append({
                "window_id": wid,
                "sample_idx": si,
                "activity": activity,
                "label": label,
                "accel_x": float(window_data[wi, si, 0]),
                "accel_y": float(window_data[wi, si, 1]),
                "accel_z": float(window_data[wi, si, 2]),
                "gyro_x": float(window_data[wi, si, 3]),
                "gyro_y": float(window_data[wi, si, 4]),
                "gyro_z": float(window_data[wi, si, 5]),
            })

    chunk_df = pd.DataFrame(rows)

    if append and output_path.exists():
        existing = pd.read_parquet(output_path)
        combined = pd.concat([existing, chunk_df], ignore_index=True)
        combined.to_parquet(output_path, index=False)
    else:
        chunk_df.to_parquet(output_path, index=False)


def main():
    data_dir = Path(__file__).parent / "data" / "clemson"
    output_dir = Path(__file__).parent / "data"

    sensor_dir = data_dir / "sensor_data"
    gesture_dir = data_dir / "gesture_gt"

    print("Clemson Cafeteria → VitalAI Pipeline Converter")
    print("=" * 55)
    print(f"Sensor data dir:  {sensor_dir}")
    print(f"Gesture GT dir:   {gesture_dir}")
    print(f"Output dir:       {output_dir}")
    print()

    matches = find_matching_files(sensor_dir, gesture_dir)

    if not matches:
        print("ERROR: No matching sensor/gesture file pairs found.")
        print(f"  Checked: {sensor_dir}")
        print(f"  Against: {gesture_dir}")
        print("  Make sure you ran download_clemson.py first.")
        return

    print(f"Found {len(matches)} sensor/gesture file pairs")

    participants = sorted(set(m["participant"] for m in matches))
    n_participants = len(participants)
    n_train = int(n_participants * 0.8)

    rng = np.random.default_rng(42)
    rng.shuffle(participants)
    train_participants = set(participants[:n_train])
    test_participants = set(participants[n_train:])

    print(f"Participants: {n_participants} total, {len(train_participants)} train, {len(test_participants)} test")
    print()

    train_path = output_dir / "train_raw.parquet"
    test_path = output_dir / "test_raw.parquet"

    # Remove old files to start fresh
    train_path.unlink(missing_ok=True)
    test_path.unlink(missing_ok=True)

    train_window_offset = 0
    test_window_offset = 0
    total_eating_windows = 0
    total_windows = 0
    BATCH_SIZE = 20

    train_batch = []
    test_batch = []

    for i, match in enumerate(matches):
        sensor_data = load_sensor_file(match["sensor_file"])
        if sensor_data is None:
            continue

        gestures = load_gesture_file(match["gesture_file"])
        if gestures is None:
            continue

        is_train = match["participant"] in train_participants

        if is_train:
            result = process_participant_to_arrays(
                sensor_data, gestures, match["participant"], train_window_offset
            )
            _, _, _, _, n_w, n_eat = result
            train_window_offset += n_w
            train_batch.append(result)
        else:
            result = process_participant_to_arrays(
                sensor_data, gestures, match["participant"], test_window_offset
            )
            _, _, _, _, n_w, n_eat = result
            test_window_offset += n_w
            test_batch.append(result)

        total_eating_windows += n_eat
        total_windows += n_w

        # Flush batches to disk periodically to control memory
        if len(train_batch) >= BATCH_SIZE:
            flush_batch(train_batch, train_path)
            train_batch = []
        if len(test_batch) >= BATCH_SIZE:
            flush_batch(test_batch, test_path)
            test_batch = []

        if (i + 1) % 50 == 0 or i == len(matches) - 1:
            print(f"  Processed {i + 1}/{len(matches)} files... "
                  f"({total_windows} windows, {total_eating_windows} eating)")

    # Flush remaining
    if train_batch:
        flush_batch(train_batch, train_path)
    if test_batch:
        flush_batch(test_batch, test_path)

    print()

    for label, path, n_w in [("Train", train_path, train_window_offset), ("Test", test_path, test_window_offset)]:
        if path.exists():
            df = pd.read_parquet(path)
            n_eating = df[df["sample_idx"] == 0]["label"].sum()
            print(f"{label} set: {n_w} windows ({n_eating} eating, {n_w - n_eating} non-eating)")
            print(f"  Saved to {path} ({path.stat().st_size / 1024 / 1024:.1f} MB)")
            del df

    print()
    print("Conversion complete.")
    print(f"Total: {total_windows} windows, {total_eating_windows} eating "
          f"({total_eating_windows / max(1, total_windows) * 100:.1f}%)")
    print()
    print("Next steps:")
    print("  1. python extract_features.py")
    print("  2. python train_model.py")
    print("  3. python export_coreml.py")


def flush_batch(batch: list, output_path: Path):
    """Expand a batch of window results into rows and append to parquet."""
    all_rows = []
    wid_offset = 0

    for result in batch:
        window_data, window_labels, window_activities, base_offset, n_windows, _ = result

        for wi in range(n_windows):
            wid = base_offset + wi
            label = int(window_labels[wi])
            activity = window_activities[wi]

            for si in range(TARGET_SAMPLES_PER_WINDOW):
                all_rows.append((
                    wid, si, activity, label,
                    float(window_data[wi, si, 0]),
                    float(window_data[wi, si, 1]),
                    float(window_data[wi, si, 2]),
                    float(window_data[wi, si, 3]),
                    float(window_data[wi, si, 4]),
                    float(window_data[wi, si, 5]),
                ))

    if not all_rows:
        return

    chunk_df = pd.DataFrame(all_rows, columns=[
        "window_id", "sample_idx", "activity", "label",
        "accel_x", "accel_y", "accel_z", "gyro_x", "gyro_y", "gyro_z",
    ])

    if output_path.exists():
        existing = pd.read_parquet(output_path)
        combined = pd.concat([existing, chunk_df], ignore_index=True)
        combined.to_parquet(output_path, index=False)
        del existing, combined
    else:
        chunk_df.to_parquet(output_path, index=False)

    del chunk_df, all_rows


if __name__ == "__main__":
    main()
