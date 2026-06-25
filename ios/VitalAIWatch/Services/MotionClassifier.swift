import CoreMotion
import CoreML
import Foundation

struct MotionFeatures {
    let accelMeanX: Double
    let accelMeanY: Double
    let accelMeanZ: Double
    let accelStdX: Double
    let accelStdY: Double
    let accelStdZ: Double
    let accelPtpX: Double
    let accelPtpY: Double
    let accelPtpZ: Double
    let gyroMeanY: Double
    let gyroStdY: Double
    let gyroStdZ: Double
    let gyroMeanZ: Double
    let zcrZ: Int
    let sma: Double
    let domFreqZ: Double
    let jerkMean: Double
}

struct ClassificationResult {
    let isEating: Bool
    let confidence: Double
    let usedCoreML: Bool
}

final class MotionClassifier {
    static let shared = MotionClassifier()

    private let confidenceThreshold: Double = 0.85
    private var coreMLModel: MLModel?

    init() {
        loadCoreMLModel()
    }

    // MARK: - Core ML

    private func loadCoreMLModel() {
        guard let url = Bundle.main.url(forResource: "EatingGestureDetector", withExtension: "mlmodelc")
                ?? Bundle.main.url(forResource: "EatingGestureDetector", withExtension: "mlmodel") else {
            print("[MotionClassifier] Core ML model not found — using heuristic fallback")
            return
        }
        do {
            coreMLModel = try MLModel(contentsOf: url)
            print("[MotionClassifier] Core ML model loaded")
        } catch {
            print("[MotionClassifier] Failed to load Core ML model: \(error)")
        }
    }

    // MARK: - Feature Extraction

    func extractFeatures(from samples: [CMDeviceMotion]) -> MotionFeatures? {
        guard samples.count >= 500 else { return nil }

        let accelX = samples.map { $0.userAcceleration.x }
        let accelY = samples.map { $0.userAcceleration.y }
        let accelZ = samples.map { $0.userAcceleration.z }
        let gyroY = samples.map { $0.rotationRate.y }
        let gyroZ = samples.map { $0.rotationRate.z }

        let accelMag = zip(zip(accelX, accelY), accelZ).map { (xy, z) in
            (xy.0 * xy.0 + xy.1 * xy.1 + z * z).squareRoot()
        }
        var jerkValues: [Double] = []
        for i in 1..<accelMag.count {
            jerkValues.append(abs(accelMag[i] - accelMag[i - 1]) * 50.0)
        }

        return MotionFeatures(
            accelMeanX: mean(accelX),
            accelMeanY: mean(accelY),
            accelMeanZ: mean(accelZ),
            accelStdX: std(accelX),
            accelStdY: std(accelY),
            accelStdZ: std(accelZ),
            accelPtpX: (accelX.max() ?? 0) - (accelX.min() ?? 0),
            accelPtpY: (accelY.max() ?? 0) - (accelY.min() ?? 0),
            accelPtpZ: (accelZ.max() ?? 0) - (accelZ.min() ?? 0),
            gyroMeanY: mean(gyroY),
            gyroStdY: std(gyroY),
            gyroStdZ: std(gyroZ),
            gyroMeanZ: mean(gyroZ),
            zcrZ: zeroCrossings(accelZ),
            sma: mean(accelMag),
            domFreqZ: dominantFrequency(accelZ),
            jerkMean: jerkValues.isEmpty ? 0 : mean(jerkValues)
        )
    }

    // MARK: - Classification

    func classify(_ features: MotionFeatures) -> ClassificationResult {
        if let model = coreMLModel {
            if let result = classifyWithCoreML(features, model: model) {
                return result
            }
        }
        return classifyWithHeuristic(features)
    }

    private func classifyWithCoreML(_ features: MotionFeatures, model: MLModel) -> ClassificationResult? {
        let input: [String: Double] = [
            "accel_mean_x": features.accelMeanX,
            "accel_mean_y": features.accelMeanY,
            "accel_mean_z": features.accelMeanZ,
            "accel_std_x": features.accelStdX,
            "accel_std_y": features.accelStdY,
            "accel_std_z": features.accelStdZ,
            "accel_ptp_x": features.accelPtpX,
            "accel_ptp_y": features.accelPtpY,
            "accel_ptp_z": features.accelPtpZ,
            "gyro_mean_y": features.gyroMeanY,
            "gyro_std_y": features.gyroStdY,
            "gyro_std_z": features.gyroStdZ,
            "gyro_mean_z": features.gyroMeanZ,
            "zcr_z": Double(features.zcrZ),
            "sma": features.sma,
            "dom_freq_z": features.domFreqZ,
            "jerk_mean": features.jerkMean,
        ]

        guard let provider = try? MLDictionaryFeatureProvider(dictionary: input as [String: NSNumber]) else {
            return nil
        }

        guard let prediction = try? model.prediction(from: provider) else {
            return nil
        }

        let label = prediction.featureValue(for: "label")?.int64Value ?? 0
        let probs = prediction.featureValue(for: "labelProbability")?.dictionaryValue as? [Int64: Double]
        let confidence = probs?[1] ?? (label == 1 ? 1.0 : 0.0)

        return ClassificationResult(
            isEating: confidence >= confidenceThreshold,
            confidence: confidence,
            usedCoreML: true
        )
    }

    private func classifyWithHeuristic(_ features: MotionFeatures) -> ClassificationResult {
        var score = 0.0

        if features.accelStdZ >= 0.15 && features.accelStdZ <= 0.8 {
            score += 0.25
        }

        if features.accelPtpZ >= 0.3 && features.accelPtpZ <= 2.0 {
            score += 0.20
        }

        if features.zcrZ >= 3 && features.zcrZ <= 12 {
            score += 0.20
        }

        if features.gyroStdY >= 0.3 && features.gyroStdY <= 3.0 {
            score += 0.20
        }

        let horizontalActivity = features.accelStdX + features.accelStdY
        if horizontalActivity < 0.6 {
            score += 0.15
        }

        return ClassificationResult(
            isEating: score >= confidenceThreshold,
            confidence: min(score, 1.0),
            usedCoreML: false
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

    private func dominantFrequency(_ signal: [Double], sampleRate: Double = 50.0) -> Double {
        let avg = mean(signal)
        let centered = signal.map { $0 - avg }
        guard std(centered) > 1e-6 else { return 0 }

        let n = centered.count
        var autocorr = [Double](repeating: 0, count: n)
        for lag in 0..<n {
            var sum = 0.0
            for i in 0..<(n - lag) {
                sum += centered[i] * centered[i + lag]
            }
            autocorr[lag] = sum / (autocorr[0] == 0 ? 1.0 : autocorr[0])
        }
        if autocorr[0] != 0 {
            for i in 0..<n { autocorr[i] /= autocorr[0] }
        }

        let minLag = max(5, Int(sampleRate) / 10)
        let maxLag = min(n - 1, Int(sampleRate) * 5)
        guard maxLag > minLag else { return 0 }

        var peakIdx = minLag
        var peakVal = autocorr[minLag]
        for i in (minLag + 1)..<maxLag {
            if autocorr[i] > peakVal {
                peakVal = autocorr[i]
                peakIdx = i
            }
        }

        guard peakVal > 0.1 else { return 0 }
        return sampleRate / Double(peakIdx)
    }
}
