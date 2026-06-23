import CoreMotion
import Foundation

struct MotionFeatures {
    let accelMeanX: Double
    let accelMeanY: Double
    let accelMeanZ: Double
    let accelStdX: Double
    let accelStdY: Double
    let accelStdZ: Double
    let accelPeakToPeakZ: Double
    let gyroMeanY: Double
    let gyroStdY: Double
    let gyroStdZ: Double
    let zeroCrossingRateZ: Int
}

struct ClassificationResult {
    let isEating: Bool
    let confidence: Double
}

final class MotionClassifier {
    static let shared = MotionClassifier()

    private let confidenceThreshold: Double = 0.85

    func extractFeatures(from samples: [CMDeviceMotion]) -> MotionFeatures? {
        guard samples.count >= 500 else { return nil }

        let accelX = samples.map { $0.userAcceleration.x }
        let accelY = samples.map { $0.userAcceleration.y }
        let accelZ = samples.map { $0.userAcceleration.z }
        let gyroY = samples.map { $0.rotationRate.y }
        let gyroZ = samples.map { $0.rotationRate.z }

        return MotionFeatures(
            accelMeanX: mean(accelX),
            accelMeanY: mean(accelY),
            accelMeanZ: mean(accelZ),
            accelStdX: std(accelX),
            accelStdY: std(accelY),
            accelStdZ: std(accelZ),
            accelPeakToPeakZ: (accelZ.max() ?? 0) - (accelZ.min() ?? 0),
            gyroMeanY: mean(gyroY),
            gyroStdY: std(gyroY),
            gyroStdZ: std(gyroZ),
            zeroCrossingRateZ: zeroCrossings(accelZ)
        )
    }

    func classify(_ features: MotionFeatures) -> ClassificationResult {
        // Heuristic classifier — placeholder for Core ML model.
        //
        // Eating gestures: rhythmic hand-to-mouth motion with wrist rotation.
        // Characterized by moderate vertical acceleration variance (not as high as
        // walking/running), periodic z-axis movement at ~0.2-0.5 Hz, and
        // gyroscope y-axis activity from fork/spoon manipulation.

        var score = 0.0

        // Rhythmic vertical movement: std of z-accel in eating range (0.15-0.8 g)
        // Walking/running produces > 1.0, sitting still < 0.05
        if features.accelStdZ >= 0.15 && features.accelStdZ <= 0.8 {
            score += 0.25
        }

        // Moderate peak-to-peak on z-axis (hand raising/lowering)
        if features.accelPeakToPeakZ >= 0.3 && features.accelPeakToPeakZ <= 2.0 {
            score += 0.20
        }

        // Zero crossing rate for z-axis: eating is ~3-8 crossings per 15s window
        // (one bite cycle every 2-5 seconds)
        if features.zeroCrossingRateZ >= 3 && features.zeroCrossingRateZ <= 12 {
            score += 0.20
        }

        // Wrist rotation (gyro y-axis) — fork/spoon manipulation
        if features.gyroStdY >= 0.3 && features.gyroStdY <= 3.0 {
            score += 0.20
        }

        // Low horizontal movement (person is seated, not walking)
        let horizontalActivity = features.accelStdX + features.accelStdY
        if horizontalActivity < 0.6 {
            score += 0.15
        }

        return ClassificationResult(
            isEating: score >= confidenceThreshold,
            confidence: min(score, 1.0)
        )
    }

    // MARK: - Math Helpers

    private func mean(_ values: [Double]) -> Double {
        guard !values.isEmpty else { return 0 }
        return values.reduce(0, +) / Double(values.count)
    }

    private func std(_ values: [Double]) -> Double {
        guard values.count > 1 else { return 0 }
        let avg = mean(values)
        let variance = values.reduce(0) { $0 + ($1 - avg) * ($1 - avg) } / Double(values.count - 1)
        return variance.squareRoot()
    }

    private func zeroCrossings(_ values: [Double]) -> Int {
        guard values.count > 1 else { return 0 }
        let avg = mean(values)
        let centered = values.map { $0 - avg }
        var crossings = 0
        for i in 1..<centered.count {
            if (centered[i - 1] >= 0 && centered[i] < 0) || (centered[i - 1] < 0 && centered[i] >= 0) {
                crossings += 1
            }
        }
        return crossings
    }
}
