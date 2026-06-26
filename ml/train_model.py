"""
Train a Gradient Boosting classifier for eating gesture detection.

The model takes 17 features extracted from 15-second IMU windows and
outputs a binary classification (eating vs non-eating) with confidence score.

Why Gradient Boosting:
- Works well with small-medium tabular datasets
- Handles class imbalance via sample_weight (eating is ~0.7% of Clemson data)
- Feature importances help validate the model learns real patterns
- Converts cleanly to Core ML via coremltools
- ~800KB model size after quantization (within spec target)
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    classification_report,
    precision_recall_fscore_support,
    confusion_matrix,
)
from sklearn.model_selection import cross_val_predict

from extract_features import FEATURE_COLUMNS


def load_features(data_dir: Path, split: str) -> tuple[pd.DataFrame, np.ndarray]:
    df = pd.read_parquet(data_dir / f"{split}_features.parquet")
    X = df[FEATURE_COLUMNS]
    y = df["label"].values
    return X, y


def train_and_evaluate(data_dir: Path) -> GradientBoostingClassifier:
    print("Loading features...")
    X_train, y_train = load_features(data_dir, "train")
    X_test, y_test = load_features(data_dir, "test")

    print(f"  Train: {len(X_train)} windows ({y_train.sum()} eating, {(1 - y_train).sum()} non-eating)")
    print(f"  Test:  {len(X_test)} windows ({y_test.sum()} eating, {(1 - y_test).sum()} non-eating)")

    # Compute sample weights to handle class imbalance
    n_pos = y_train.sum()
    n_neg = len(y_train) - n_pos
    ratio = n_neg / max(1, n_pos)
    print(f"  Class ratio: {ratio:.1f}:1 (non-eating:eating)")

    sample_weights = np.where(y_train == 1, ratio, 1.0)

    model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        min_samples_leaf=10,
        random_state=42,
    )

    print("\nTraining Gradient Boosting classifier...")
    model.fit(X_train, y_train, sample_weight=sample_weights)

    # Cross-validation on training set
    print("\n5-fold cross-validation on training set:")
    cv_preds = cross_val_predict(model, X_train, y_train, cv=5)
    cv_prec, cv_rec, cv_f1, _ = precision_recall_fscore_support(y_train, cv_preds, pos_label=1, average="binary")
    print(f"  Precision: {cv_prec:.3f}")
    print(f"  Recall:    {cv_rec:.3f}")
    print(f"  F1:        {cv_f1:.3f}")

    # Test set evaluation
    print("\nTest set evaluation:")
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print(classification_report(y_test, y_pred, target_names=["non_eating", "eating"]))

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    print(f"Confusion matrix: TP={tp}, FP={fp}, FN={fn}, TN={tn}")

    prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, pos_label=1, average="binary")

    # Feature importances
    print("\nFeature importances:")
    importances = sorted(
        zip(FEATURE_COLUMNS, model.feature_importances_),
        key=lambda x: x[1],
        reverse=True,
    )
    for name, imp in importances:
        bar = "█" * int(imp * 50)
        print(f"  {name:20s} {imp:.4f} {bar}")

    # Threshold analysis (matching the 0.85 confidence threshold from spec)
    print("\nThreshold analysis (spec target: 0.85):")
    for threshold in [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95]:
        y_thresh = (y_prob >= threshold).astype(int)
        p, r, f, _ = precision_recall_fscore_support(y_test, y_thresh, pos_label=1, average="binary", zero_division=0)
        n_pred = y_thresh.sum()
        print(f"  threshold={threshold:.2f}: precision={p:.3f} recall={r:.3f} f1={f:.3f} predictions={n_pred}")

    # Save metrics
    metrics = {
        "train_size": len(X_train),
        "test_size": len(X_test),
        "cv_precision": round(float(cv_prec), 4),
        "cv_recall": round(float(cv_rec), 4),
        "cv_f1": round(float(cv_f1), 4),
        "test_precision": round(float(prec), 4),
        "test_recall": round(float(rec), 4),
        "test_f1": round(float(f1), 4),
        "confusion_matrix": {"tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn)},
        "feature_importances": {name: round(float(imp), 4) for name, imp in importances},
    }
    metrics_path = data_dir / "metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\nMetrics saved to {metrics_path}")

    return model


def main():
    data_dir = Path(__file__).parent / "data"
    model = train_and_evaluate(data_dir)

    # Save sklearn model for export step
    import pickle
    model_path = data_dir / "eating_detector.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    print(f"Model saved to {model_path}")


if __name__ == "__main__":
    main()
