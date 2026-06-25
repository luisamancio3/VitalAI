"""
Export trained eating gesture detector to Core ML format (.mlmodel).

The exported model:
- Input: 17 features from a 15-second IMU window
- Output: classification (eating/non_eating) + confidence probability
- Size target: <800KB after quantization (INT8)
- Compatible with watchOS 10+ via Core ML framework
"""

import pickle
import coremltools as ct
from pathlib import Path

from extract_features import FEATURE_COLUMNS


def export_model(data_dir: Path, output_dir: Path):
    model_path = data_dir / "eating_detector.pkl"
    with open(model_path, "rb") as f:
        sklearn_model = pickle.load(f)

    print("Converting to Core ML...")
    coreml_model = ct.converters.sklearn.convert(
        sklearn_model,
        input_features=FEATURE_COLUMNS,
        output_feature_names="label",
    )

    coreml_model.author = "VitalAI"
    coreml_model.short_description = (
        "Classifies 15-second IMU windows (accelerometer + gyroscope) "
        "as eating or non-eating gestures."
    )
    coreml_model.input_description["accel_mean_x"] = "Mean acceleration X-axis (g)"
    coreml_model.input_description["accel_mean_y"] = "Mean acceleration Y-axis (g)"
    coreml_model.input_description["accel_mean_z"] = "Mean acceleration Z-axis (g)"
    coreml_model.input_description["accel_std_x"] = "Std dev acceleration X-axis"
    coreml_model.input_description["accel_std_y"] = "Std dev acceleration Y-axis"
    coreml_model.input_description["accel_std_z"] = "Std dev acceleration Z-axis"
    coreml_model.input_description["accel_ptp_x"] = "Peak-to-peak acceleration X-axis"
    coreml_model.input_description["accel_ptp_y"] = "Peak-to-peak acceleration Y-axis"
    coreml_model.input_description["accel_ptp_z"] = "Peak-to-peak acceleration Z-axis"
    coreml_model.input_description["gyro_mean_y"] = "Mean rotation rate Y-axis (rad/s)"
    coreml_model.input_description["gyro_std_y"] = "Std dev rotation rate Y-axis"
    coreml_model.input_description["gyro_std_z"] = "Std dev rotation rate Z-axis"
    coreml_model.input_description["gyro_mean_z"] = "Mean rotation rate Z-axis"
    coreml_model.input_description["zcr_z"] = "Zero-crossing rate of Z-axis acceleration"
    coreml_model.input_description["sma"] = "Signal magnitude area (total motion energy)"
    coreml_model.input_description["dom_freq_z"] = "Dominant frequency Z-axis (Hz)"
    coreml_model.input_description["jerk_mean"] = "Mean jerk magnitude (motion smoothness)"

    # Save full precision model
    mlmodel_path = output_dir / "EatingGestureDetector.mlmodel"
    coreml_model.save(str(mlmodel_path))
    model_size = mlmodel_path.stat().st_size
    print(f"Saved Core ML model: {mlmodel_path} ({model_size / 1024:.1f} KB)")

    if model_size < 800 * 1024:
        print(f"✓ Model size ({model_size / 1024:.0f} KB) is within the 800KB target")
    else:
        print(f"⚠ Model size ({model_size / 1024:.0f} KB) exceeds 800KB target — consider reducing n_estimators")


def main():
    data_dir = Path(__file__).parent / "data"
    output_dir = Path(__file__).parent / "models"
    output_dir.mkdir(exist_ok=True)
    export_model(data_dir, output_dir)
    print("Done. Copy the .mlmodel to the Watch Xcode target.")


if __name__ == "__main__":
    main()
