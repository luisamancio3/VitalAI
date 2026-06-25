"""
Generate synthetic IMU data that mimics wrist-worn accelerometer + gyroscope
signals during eating vs non-eating activities.

Based on characteristics from peer-reviewed IMU eating detection research:
- PMC7963188: ML from imbalanced smartwatch data
- PMC8924783: Free-living eating detection
- PMC8869422: CNN top-down eating episodes
- PMC6566929: Systematic review of upper limb motion sensors

Sensor specs (matching VitalAI Watch pipeline):
- Sampling rate: 50 Hz
- Window duration: 15 seconds (750 samples per window)
- Channels: accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z
"""

import numpy as np
import pandas as pd
import os
from pathlib import Path


SAMPLE_RATE = 50       # Hz
WINDOW_SECONDS = 15    # seconds
SAMPLES_PER_WINDOW = SAMPLE_RATE * WINDOW_SECONDS  # 750


def generate_eating_window(rng: np.random.Generator) -> np.ndarray:
    """Generate a 15s window of IMU data simulating eating gestures.

    Eating pattern: rhythmic hand-to-mouth motion with wrist rotation.
    - Z-axis (vertical): periodic raises at 0.2-0.5 Hz (one bite every 2-5s)
    - Y-axis (lateral): small drift from arm position
    - X-axis (forward): moderate from reach-to-plate motion
    - Gyro Y: wrist rotation from fork/spoon manipulation
    - Gyro Z: forearm pronation/supination
    """
    t = np.linspace(0, WINDOW_SECONDS, SAMPLES_PER_WINDOW)

    bite_freq = rng.uniform(0.2, 0.5)
    bite_amplitude = rng.uniform(0.3, 0.7)
    phase = rng.uniform(0, 2 * np.pi)

    # Accelerometer
    accel_z = (bite_amplitude * np.sin(2 * np.pi * bite_freq * t + phase)
               + rng.normal(0, 0.08, SAMPLES_PER_WINDOW))
    accel_x = rng.normal(0, 0.12, SAMPLES_PER_WINDOW)
    accel_y = rng.normal(0, 0.10, SAMPLES_PER_WINDOW)

    # Add occasional reach-to-plate bursts on x
    n_reaches = rng.integers(2, 6)
    for _ in range(n_reaches):
        center = rng.integers(50, SAMPLES_PER_WINDOW - 50)
        width = rng.integers(20, 40)
        accel_x[center - width:center + width] += rng.uniform(0.15, 0.35)

    # Gyroscope - wrist rotation during utensil use
    gyro_y = (rng.uniform(0.5, 1.5) * np.sin(2 * np.pi * bite_freq * t + phase + 0.3)
              + rng.normal(0, 0.3, SAMPLES_PER_WINDOW))
    gyro_x = rng.normal(0, 0.2, SAMPLES_PER_WINDOW)
    gyro_z = (rng.uniform(0.3, 0.8) * np.sin(2 * np.pi * bite_freq * 0.5 * t)
              + rng.normal(0, 0.25, SAMPLES_PER_WINDOW))

    return np.column_stack([accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z])


def generate_idle_window(rng: np.random.Generator) -> np.ndarray:
    """Sitting still / desk work — very low motion."""
    noise_level = rng.uniform(0.02, 0.06)
    data = rng.normal(0, noise_level, (SAMPLES_PER_WINDOW, 6))
    return data


def generate_walking_window(rng: np.random.Generator) -> np.ndarray:
    """Walking — high periodic vertical acceleration, arm swing."""
    t = np.linspace(0, WINDOW_SECONDS, SAMPLES_PER_WINDOW)
    step_freq = rng.uniform(1.5, 2.2)  # steps per second
    step_amp = rng.uniform(0.8, 1.5)

    accel_z = step_amp * np.sin(2 * np.pi * step_freq * t) + rng.normal(0, 0.15, SAMPLES_PER_WINDOW)
    accel_x = rng.uniform(0.3, 0.7) * np.sin(2 * np.pi * step_freq * t + 1.0) + rng.normal(0, 0.1, SAMPLES_PER_WINDOW)
    accel_y = rng.uniform(0.2, 0.5) * np.sin(2 * np.pi * step_freq * 0.5 * t) + rng.normal(0, 0.1, SAMPLES_PER_WINDOW)

    gyro_x = rng.normal(0, 0.4, SAMPLES_PER_WINDOW)
    gyro_y = rng.normal(0, 0.3, SAMPLES_PER_WINDOW)
    gyro_z = rng.normal(0, 0.35, SAMPLES_PER_WINDOW)

    return np.column_stack([accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z])


def generate_drinking_window(rng: np.random.Generator) -> np.ndarray:
    """Drinking — similar to eating but fewer cycles, longer hold at top.
    This is the hardest confounding activity to distinguish from eating.
    """
    t = np.linspace(0, WINDOW_SECONDS, SAMPLES_PER_WINDOW)

    # 1-3 sips in 15s (much less frequent than eating bites)
    n_sips = rng.integers(1, 4)
    accel_z = rng.normal(0, 0.05, SAMPLES_PER_WINDOW)

    for _ in range(n_sips):
        center = rng.integers(100, SAMPLES_PER_WINDOW - 100)
        # Raise (fast up, hold, slow down)
        raise_width = rng.integers(30, 60)
        hold_width = rng.integers(40, 80)
        amplitude = rng.uniform(0.4, 0.8)

        start = max(0, center - raise_width - hold_width)
        end = min(SAMPLES_PER_WINDOW, center + hold_width)

        for i in range(start, center):
            progress = (i - start) / max(1, center - start)
            accel_z[i] += amplitude * progress
        for i in range(center, end):
            progress = 1.0 - (i - center) / max(1, end - center)
            accel_z[i] += amplitude * progress

    accel_x = rng.normal(0, 0.08, SAMPLES_PER_WINDOW)
    accel_y = rng.normal(0, 0.07, SAMPLES_PER_WINDOW)

    # Less wrist rotation than eating (no utensil manipulation)
    gyro_x = rng.normal(0, 0.15, SAMPLES_PER_WINDOW)
    gyro_y = rng.normal(0, 0.2, SAMPLES_PER_WINDOW)
    gyro_z = rng.normal(0, 0.15, SAMPLES_PER_WINDOW)

    return np.column_stack([accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z])


def generate_phone_use_window(rng: np.random.Generator) -> np.ndarray:
    """Phone use — hand raised and relatively still with small thumb taps."""
    t = np.linspace(0, WINDOW_SECONDS, SAMPLES_PER_WINDOW)

    # Low-level sustained elevation with micro-movements
    accel_z = rng.uniform(0.1, 0.25) + rng.normal(0, 0.04, SAMPLES_PER_WINDOW)
    accel_x = rng.normal(0, 0.05, SAMPLES_PER_WINDOW)
    accel_y = rng.normal(0, 0.04, SAMPLES_PER_WINDOW)

    # Small tap impulses
    n_taps = rng.integers(5, 20)
    for _ in range(n_taps):
        pos = rng.integers(0, SAMPLES_PER_WINDOW)
        accel_x[pos:pos + 3] += rng.uniform(0.1, 0.25)

    gyro_x = rng.normal(0, 0.1, SAMPLES_PER_WINDOW)
    gyro_y = rng.normal(0, 0.12, SAMPLES_PER_WINDOW)
    gyro_z = rng.normal(0, 0.1, SAMPLES_PER_WINDOW)

    return np.column_stack([accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z])


def generate_typing_window(rng: np.random.Generator) -> np.ndarray:
    """Typing at a keyboard — rapid small movements, both hands low."""
    accel_x = rng.normal(0, 0.06, SAMPLES_PER_WINDOW)
    accel_y = rng.normal(0, 0.08, SAMPLES_PER_WINDOW)
    accel_z = rng.normal(0, 0.05, SAMPLES_PER_WINDOW)

    # Rapid micro-movements from keystrokes
    n_bursts = rng.integers(10, 30)
    for _ in range(n_bursts):
        pos = rng.integers(0, SAMPLES_PER_WINDOW - 5)
        accel_y[pos:pos + 3] += rng.uniform(0.08, 0.2)
        accel_z[pos:pos + 2] += rng.uniform(0.05, 0.12)

    gyro_x = rng.normal(0, 0.15, SAMPLES_PER_WINDOW)
    gyro_y = rng.normal(0, 0.1, SAMPLES_PER_WINDOW)
    gyro_z = rng.normal(0, 0.12, SAMPLES_PER_WINDOW)

    return np.column_stack([accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z])


ACTIVITY_GENERATORS = {
    "eating": generate_eating_window,
    "idle": generate_idle_window,
    "walking": generate_walking_window,
    "drinking": generate_drinking_window,
    "phone_use": generate_phone_use_window,
    "typing": generate_typing_window,
}

# Class distribution matching real-world imbalance (eating is rare)
ACTIVITY_WEIGHTS = {
    "eating": 0.15,
    "idle": 0.25,
    "walking": 0.20,
    "drinking": 0.12,
    "phone_use": 0.15,
    "typing": 0.13,
}


def generate_dataset(n_windows: int = 2000, seed: int = 42) -> pd.DataFrame:
    """Generate a full labeled dataset of IMU windows."""
    rng = np.random.default_rng(seed)

    activities = list(ACTIVITY_WEIGHTS.keys())
    weights = np.array([ACTIVITY_WEIGHTS[a] for a in activities])
    weights /= weights.sum()

    columns = ["accel_x", "accel_y", "accel_z", "gyro_x", "gyro_y", "gyro_z"]
    rows = []

    for i in range(n_windows):
        activity = rng.choice(activities, p=weights)
        window = ACTIVITY_GENERATORS[activity](rng)

        # Add per-person variation (simulates different users)
        person_scale = rng.uniform(0.7, 1.3, 6)
        person_offset = rng.uniform(-0.05, 0.05, 6)
        window = window * person_scale + person_offset

        for sample_idx in range(SAMPLES_PER_WINDOW):
            row = {
                "window_id": i,
                "sample_idx": sample_idx,
                "activity": activity,
                "label": 1 if activity == "eating" else 0,
            }
            for col_idx, col_name in enumerate(columns):
                row[col_name] = window[sample_idx, col_idx]
            rows.append(row)

    return pd.DataFrame(rows)


def main():
    output_dir = Path(__file__).parent / "data"
    output_dir.mkdir(exist_ok=True)

    print("Generating training dataset (1600 windows)...")
    train_df = generate_dataset(n_windows=1600, seed=42)
    train_path = output_dir / "train_raw.parquet"
    train_df.to_parquet(train_path, index=False)
    print(f"  Saved {len(train_df)} samples ({len(train_df) // SAMPLES_PER_WINDOW} windows) to {train_path}")

    activity_counts = train_df.groupby("window_id")["activity"].first().value_counts()
    print(f"  Distribution: {dict(activity_counts)}")

    print("Generating test dataset (400 windows)...")
    test_df = generate_dataset(n_windows=400, seed=99)
    test_path = output_dir / "test_raw.parquet"
    test_df.to_parquet(test_path, index=False)
    print(f"  Saved {len(test_df)} samples ({len(test_df) // SAMPLES_PER_WINDOW} windows) to {test_path}")

    print("Done.")


if __name__ == "__main__":
    main()
