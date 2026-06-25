"""
Extract features from raw 15-second IMU windows.

Features match those used in MotionClassifier.swift (the on-device heuristic)
so the Core ML model is a drop-in replacement.

Per window (750 samples at 50Hz), we compute 17 features:
- Accelerometer: mean, std, peak-to-peak for each axis (9)
- Gyroscope: mean, std for y and z axes (4)
- Zero-crossing rate on accel z-axis (1)
- Signal magnitude area (SMA) for accel (1)
- Dominant frequency estimate via autocorrelation peak (1)
- Jerk magnitude mean (derivative of accel magnitude) (1)
"""

import numpy as np
import pandas as pd
from pathlib import Path


SAMPLE_RATE = 50
SAMPLES_PER_WINDOW = 750


def zero_crossing_rate(signal: np.ndarray) -> int:
    centered = signal - np.mean(signal)
    crossings = np.sum(np.diff(np.sign(centered)) != 0)
    return int(crossings // 2)


def dominant_frequency(signal: np.ndarray, sample_rate: int = SAMPLE_RATE) -> float:
    """Estimate dominant frequency via autocorrelation peak."""
    centered = signal - np.mean(signal)
    if np.std(centered) < 1e-6:
        return 0.0
    autocorr = np.correlate(centered, centered, mode="full")
    autocorr = autocorr[len(autocorr) // 2:]
    autocorr = autocorr / (autocorr[0] + 1e-10)

    # Find first peak after the initial decay (skip first 5 samples = 0.1s)
    min_lag = max(5, sample_rate // 10)
    max_lag = min(len(autocorr) - 1, sample_rate * 5)  # up to 5s period

    if max_lag <= min_lag:
        return 0.0

    segment = autocorr[min_lag:max_lag]
    if len(segment) == 0:
        return 0.0

    peak_idx = np.argmax(segment) + min_lag
    if autocorr[peak_idx] < 0.1:
        return 0.0

    return sample_rate / peak_idx


def extract_window_features(window: np.ndarray) -> dict:
    """Extract features from a single window (750 x 6 array).

    Columns: accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z
    """
    ax, ay, az = window[:, 0], window[:, 1], window[:, 2]
    gx, gy, gz = window[:, 3], window[:, 4], window[:, 5]

    # Accelerometer statistics
    features = {
        "accel_mean_x": np.mean(ax),
        "accel_mean_y": np.mean(ay),
        "accel_mean_z": np.mean(az),
        "accel_std_x": np.std(ax, ddof=1),
        "accel_std_y": np.std(ay, ddof=1),
        "accel_std_z": np.std(az, ddof=1),
        "accel_ptp_x": np.ptp(ax),
        "accel_ptp_y": np.ptp(ay),
        "accel_ptp_z": np.ptp(az),
    }

    # Gyroscope statistics (focus on y and z — most relevant for eating)
    features["gyro_mean_y"] = np.mean(gy)
    features["gyro_std_y"] = np.std(gy, ddof=1)
    features["gyro_std_z"] = np.std(gz, ddof=1)
    features["gyro_mean_z"] = np.mean(gz)

    # Zero-crossing rate on z-axis (rhythmic eating motion indicator)
    features["zcr_z"] = zero_crossing_rate(az)

    # Signal Magnitude Area — total motion energy
    accel_mag = np.sqrt(ax**2 + ay**2 + az**2)
    features["sma"] = np.mean(accel_mag)

    # Dominant frequency of z-axis acceleration
    features["dom_freq_z"] = dominant_frequency(az)

    # Jerk (derivative of acceleration magnitude) — smoothness of motion
    jerk = np.diff(accel_mag) * SAMPLE_RATE
    features["jerk_mean"] = np.mean(np.abs(jerk))

    return features


FEATURE_COLUMNS = [
    "accel_mean_x", "accel_mean_y", "accel_mean_z",
    "accel_std_x", "accel_std_y", "accel_std_z",
    "accel_ptp_x", "accel_ptp_y", "accel_ptp_z",
    "gyro_mean_y", "gyro_std_y", "gyro_std_z", "gyro_mean_z",
    "zcr_z", "sma", "dom_freq_z", "jerk_mean",
]


def process_dataset(raw_path: Path) -> pd.DataFrame:
    """Load raw parquet, group by window, extract features."""
    raw = pd.read_parquet(raw_path)

    sensor_cols = ["accel_x", "accel_y", "accel_z", "gyro_x", "gyro_y", "gyro_z"]
    results = []

    for window_id, group in raw.groupby("window_id"):
        group = group.sort_values("sample_idx")
        window_data = group[sensor_cols].values

        if len(window_data) != SAMPLES_PER_WINDOW:
            continue

        features = extract_window_features(window_data)
        features["window_id"] = window_id
        features["activity"] = group["activity"].iloc[0]
        features["label"] = group["label"].iloc[0]
        results.append(features)

    return pd.DataFrame(results)


def main():
    data_dir = Path(__file__).parent / "data"

    for split in ["train", "test"]:
        raw_path = data_dir / f"{split}_raw.parquet"
        if not raw_path.exists():
            print(f"  {raw_path} not found — run generate_synthetic_data.py first")
            continue

        print(f"Extracting features from {split} set...")
        features_df = process_dataset(raw_path)
        out_path = data_dir / f"{split}_features.parquet"
        features_df.to_parquet(out_path, index=False)

        eating = features_df[features_df["label"] == 1]
        non_eating = features_df[features_df["label"] == 0]
        print(f"  {len(features_df)} windows: {len(eating)} eating, {len(non_eating)} non-eating")
        print(f"  Saved to {out_path}")

    print("Done.")


if __name__ == "__main__":
    main()
