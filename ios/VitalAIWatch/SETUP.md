# VitalAI Watch — Xcode Target Setup

The `VitalAIWatch/` sources are audited and compile-ready, but they are **not yet
part of any Xcode target**. `VitalAI.xcodeproj` currently ships only the iOS app.
Follow these steps to add the watchOS app so the eating-gesture model runs
on-device.

## 1. Add the Watch App target

1. Open `ios/VitalAI/VitalAI.xcodeproj` in Xcode 16+.
2. **File → New → Target… → watchOS → Watch App**.
3. Set:
   - Product Name: `VitalAIWatch`
   - Interface: **SwiftUI**, Life Cycle: **SwiftUI App**
   - "Watch App for Existing iOS App" → companion to **VitalAI**
4. When prompted "Activate scheme?", click **Activate**.

Xcode generates a new `VitalAIWatch` group with a stub `App`, `Assets`, and
`Info.plist`. Delete Xcode's stub `*App.swift` and `ContentView` — we use the
sources already in `ios/VitalAIWatch/`.

## 2. Add our sources (folder-synchronized — matches the iOS app)

The iOS target uses a **file-system-synchronized group** (`PBXFileSystemSynchronizedRootGroup`).
Set the Watch target up the same way so sources + the `.mlmodel` are picked up
automatically with no manual project-file edits:

1. In the Project navigator, right-click the project → **Add Files to "VitalAI"…**
2. Select the `ios/VitalAIWatch` folder.
3. Choose **"Create groups"** → and enable **"Create folder references"** is *not*
   what you want; instead, in Xcode 16 drag the folder in and confirm it appears
   as a **synchronized group** (blue folder icon). Assign it to the
   `VitalAIWatch` target only.
4. Verify the target membership:
   - `App/`, `Services/`, `Views/`, `Shared/`, `Resources/` → **VitalAIWatch**
   - `Resources/README.md` and `SETUP.md` are docs — exclude from the build
     (they don't harm anything, but keep the bundle clean).

## 3. Confirm the Core ML model is bundled

1. Select the project → **VitalAIWatch** target → **Build Phases → Copy Bundle
   Resources**.
2. Confirm `EatingGestureDetector.mlmodel` is listed. If not, drag it in from
   `ios/VitalAIWatch/Resources/`.
3. Xcode compiles `.mlmodel` → `.mlmodelc` at build time. `MotionClassifier`
   loads it via `Bundle.main.url(forResource: "EatingGestureDetector", …)`.

## 4. Capabilities & Info.plist

- **Motion usage:** add `NSMotionUsageDescription` to the Watch target's
  Info.plist (CoreMotion device-motion requires it). Suggested string:
  `"VitalAI usa o movimento do pulso para detectar refeições automaticamente."`
- **WatchConnectivity** needs no entitlement, but confirm the iOS app sends
  `applicationContext` with `healthScore` / `heartRate` / `sleepHours`
  (see `WatchSessionManager.session(_:didReceiveApplicationContext:)`).

## 5. Build & verify

1. Select the `VitalAIWatch` scheme + a paired Watch simulator (or device).
2. **⌘B** to build — should compile clean (all sources audited).
3. Run. In the console, look for:
   - `[MotionClassifier] Core ML model loaded` → model bundled correctly.
     (If you see `Core ML model not found — using heuristic fallback`, the
     model isn't in Copy Bundle Resources — revisit step 3.)
   - `[MealGesture] Started monitoring at 50Hz`

## 6. On-device validation (can't be done from CI)

The feature extraction is verified identical to the training pipeline, **except
one thing that only physical testing can confirm:** the Apple Watch CoreMotion
axes (x/y/z) may be permuted or sign-flipped relative to the Clemson wrist
sensor the model trained on. If detection accuracy is poor on-device despite a
clean build:

1. Log raw `accelStdZ` / `accelPtpZ` during known eating vs idle.
2. If the discriminative axis differs, remap axes in
   `MotionClassifier.extractFeatures` (e.g. swap Y/Z) to match training.

The model's top feature is `accel_std_z` (importance 0.47), so axis alignment on
Z matters most.

## Model provenance

`EatingGestureDetector.mlmodel` — Gradient Boosting on the real Clemson
Cafeteria dataset (264 participants): 79% accuracy, F1 = 0.79, 89.4% precision
at the 0.85 confidence threshold. Regenerate via the `ml/` pipeline:
`convert_clemson.py → extract_features.py → train_model.py → export_coreml.py`.
