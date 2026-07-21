# Watch Resources

## EatingGestureDetector.mlmodel

Core ML model that classifies 15-second IMU windows (accelerometer + gyroscope)
as eating vs non-eating. Trained on the real Clemson Cafeteria dataset
(264 participants): 79% accuracy, F1 = 0.79, 89.4% precision at the 0.85
confidence threshold. Loaded by `MotionClassifier.swift` via
`Bundle.main.url(forResource: "EatingGestureDetector", ...)`.

Regenerate with the `ml/` pipeline:
`convert_clemson.py` → `extract_features.py` → `train_model.py` → `export_coreml.py`.

## Bundling into the Watch app (required before this runs on-device)

The `VitalAIWatch/` sources are not yet part of the Xcode project — there is no
watchOS target. Before `MotionClassifier` can load this model at runtime:

1. In Xcode: File → New → Target → **Watch App** (companion to VitalAI).
2. Add the `VitalAIWatch/` sources to the new target. If you set it up as a
   file-system-synchronized group (matching the iOS app's setup), the sources
   and this `.mlmodel` are picked up automatically.
3. Otherwise, drag `EatingGestureDetector.mlmodel` into the Watch target and
   confirm it appears under the target's **Copy Bundle Resources** build phase.
   Xcode compiles `.mlmodel` → `.mlmodelc` at build time.
4. Build and run; the console prints `[MotionClassifier] Core ML model loaded`
   when the model is found (otherwise it falls back to the heuristic).
