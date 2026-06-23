import WatchConnectivity
import SwiftUI

final class WatchSessionManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchSessionManager()

    @Published var healthScore: Int = 0
    @Published var heartRate: Int = 0
    @Published var sleepHours: Double = 0
    @Published var isReachable: Bool = false
    @Published var showMealPrompt: Bool = false
    var pendingMealConfidence: Double = 0

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // MARK: - Send Event to Phone

    /// Send a classified trigger event to the paired iPhone for backend relay
    func sendTriggerEvent(type: String, payload: [String: Any]) {
        let message: [String: Any] = [
            "triggerType": type,
            "payload": payload,
            "timestamp": ISO8601DateFormatter().string(from: Date()),
        ]

        if WCSession.default.isReachable {
            WCSession.default.sendMessage(message, replyHandler: nil) { error in
                // Fall back to transferUserInfo for guaranteed delivery
                print("[WatchSession] sendMessage failed, queuing: \(error)")
                WCSession.default.transferUserInfo(message)
            }
        } else {
            // Queue for delivery when phone becomes reachable
            WCSession.default.transferUserInfo(message)
        }
    }

    // MARK: - WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error {
            print("[WatchSession] Activation error: \(error)")
        }
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
    }

    /// Receive health data from phone via applicationContext
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            self.healthScore = applicationContext["healthScore"] as? Int ?? self.healthScore
            self.heartRate = applicationContext["heartRate"] as? Int ?? self.heartRate
            self.sleepHours = applicationContext["sleepHours"] as? Double ?? self.sleepHours
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
    }
}
