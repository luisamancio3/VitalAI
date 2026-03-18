import WatchConnectivity
import Foundation

@MainActor
final class PhoneConnectivityService: NSObject, ObservableObject {
    @Published var isWatchPaired = false
    @Published var isWatchReachable = false

    override init() {
        super.init()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Push current health data to watch for display
    func syncHealthDataToWatch(healthScore: Int, heartRate: Int, sleepHours: Double) {
        guard WCSession.default.activationState == .activated else { return }
        do {
            try WCSession.default.updateApplicationContext([
                "healthScore": healthScore,
                "heartRate": heartRate,
                "sleepHours": sleepHours,
            ])
        } catch {
            print("[PhoneConnectivity] Failed to update watch context: \(error)")
        }
    }
}

// MARK: - WCSessionDelegate

extension PhoneConnectivityService: WCSessionDelegate {
    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error {
            print("[PhoneConnectivity] Activation error: \(error)")
        }
        Task { @MainActor in
            isWatchPaired = session.isPaired
            isWatchReachable = session.isReachable
        }
    }

    nonisolated func sessionDidBecomeInactive(_ session: WCSession) {}

    nonisolated func sessionDidDeactivate(_ session: WCSession) {
        // Re-activate after handoff
        WCSession.default.activate()
    }

    /// Receive real-time messages from watch (when reachable)
    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor in
            await handleWatchEvent(message)
        }
    }

    /// Receive queued user info from watch (guaranteed delivery)
    nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        Task { @MainActor in
            await handleWatchEvent(userInfo)
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in
            isWatchReachable = session.isReachable
        }
    }

    // MARK: - Event Handling

    @MainActor
    private func handleWatchEvent(_ data: [String: Any]) async {
        guard let triggerType = data["triggerType"] as? String,
              let payload = data["payload"] as? [String: Any],
              let timestamp = data["timestamp"] as? String
        else {
            print("[PhoneConnectivity] Invalid watch event data")
            return
        }

        guard let token = await AuthService.shared?.getAccessToken() else {
            print("[PhoneConnectivity] No access token, dropping watch event: \(triggerType)")
            return
        }

        do {
            try await APIService.shared.sendHealthEvent(
                triggerType: triggerType,
                payload: payload,
                accessToken: token
            )
            print("[PhoneConnectivity] Forwarded watch event: \(triggerType)")
        } catch {
            print("[PhoneConnectivity] Failed to forward watch event: \(error)")
        }
    }
}
