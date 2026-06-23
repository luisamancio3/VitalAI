import CoreMotion
import Foundation
import Combine

@MainActor
final class MealGestureDetector: ObservableObject {
    @Published var isMonitoring = false
    @Published var lastDetectionTime: Date?

    private let motionManager = CMMotionManager()
    private let classifier = MotionClassifier.shared
    private let sampleRate: TimeInterval = 1.0 / 50.0  // 50 Hz
    private let windowDuration: TimeInterval = 15.0      // 15-second windows
    private let windowSamples = 750                       // 50Hz * 15s
    private let overlapFraction = 0.5                     // 50% overlap

    private var sampleBuffer: [CMDeviceMotion] = []
    private var analysisTimer: Timer?
    private let defaults = UserDefaults.standard

    private var lastMealDetection: Date {
        get { defaults.object(forKey: "mealGesture.lastDetection") as? Date ?? .distantPast }
        set { defaults.set(newValue, forKey: "mealGesture.lastDetection") }
    }

    private var lastConfirmedMeal: Date {
        get { defaults.object(forKey: "mealGesture.lastConfirmed") as? Date ?? .distantPast }
        set { defaults.set(newValue, forKey: "mealGesture.lastConfirmed") }
    }

    // MARK: - Lifecycle

    func startMonitoring() {
        guard motionManager.isDeviceMotionAvailable else {
            print("[MealGesture] Device motion not available")
            return
        }
        guard !isMonitoring else { return }

        motionManager.deviceMotionUpdateInterval = sampleRate
        motionManager.startDeviceMotionUpdates(to: .init()) { [weak self] motion, error in
            guard let motion, error == nil else { return }
            Task { @MainActor [weak self] in
                self?.handleMotionSample(motion)
            }
        }

        scheduleAnalysis()
        isMonitoring = true
        print("[MealGesture] Started monitoring at 50Hz")
    }

    func stopMonitoring() {
        motionManager.stopDeviceMotionUpdates()
        analysisTimer?.invalidate()
        analysisTimer = nil
        sampleBuffer.removeAll()
        isMonitoring = false
        print("[MealGesture] Stopped monitoring")
    }

    func recordMealConfirmation() {
        lastConfirmedMeal = Date()
    }

    // MARK: - Sample Collection

    private func handleMotionSample(_ motion: CMDeviceMotion) {
        sampleBuffer.append(motion)

        let maxBufferSize = windowSamples * 2
        if sampleBuffer.count > maxBufferSize {
            sampleBuffer.removeFirst(sampleBuffer.count - maxBufferSize)
        }
    }

    // MARK: - Window Analysis

    private func scheduleAnalysis() {
        let interval = windowDuration * (1.0 - overlapFraction)
        analysisTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.analyzeCurrentWindow()
            }
        }
    }

    private func analyzeCurrentWindow() {
        guard sampleBuffer.count >= windowSamples else { return }
        guard passesContextFilters() else { return }

        let window = Array(sampleBuffer.suffix(windowSamples))

        guard let features = classifier.extractFeatures(from: window) else { return }

        let result = classifier.classify(features)

        guard result.isEating else { return }

        print("[MealGesture] Eating detected (confidence: \(String(format: "%.2f", result.confidence)))")
        lastMealDetection = Date()
        lastDetectionTime = Date()

        onGestureDetected(confidence: result.confidence)
    }

    // MARK: - Context Filters (anti-false-positive)

    private func passesContextFilters() -> Bool {
        let now = Date()
        let hour = Calendar.current.component(.hour, from: now)

        // Ignore between 23h-5h (sleeping)
        if hour >= 23 || hour < 5 {
            return false
        }

        // Ignore if confirmed meal < 45 min ago
        if now.timeIntervalSince(lastConfirmedMeal) < 2700 {
            return false
        }

        // Ignore if already detected (unconfirmed) < 30 min ago
        if now.timeIntervalSince(lastMealDetection) < 1800 {
            return false
        }

        return true
    }

    // MARK: - Detection Callback

    private var onDetection: ((Double) -> Void)?

    func setDetectionHandler(_ handler: @escaping (Double) -> Void) {
        onDetection = handler
    }

    private func onGestureDetected(confidence: Double) {
        onDetection?(confidence)
    }
}
