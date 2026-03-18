import UserNotifications
import UIKit

@MainActor
final class NotificationService: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    @Published var isAuthorized = false
    @Published var deviceToken: String?

    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    func requestPermission() async {
        let center = UNUserNotificationCenter.current()

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            isAuthorized = granted
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        } catch {
            print("[NotificationService] Permission error: \(error)")
        }
    }

    func checkCurrentStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        isAuthorized = settings.authorizationStatus == .authorized
    }

    func handleDeviceToken(_ tokenData: Data) {
        let tokenString = tokenData.map { String(format: "%02.2hhx", $0) }.joined()
        deviceToken = tokenString
        print("[NotificationService] Device token: \(tokenString)")
    }

    func handleRegistrationError(_ error: Error) {
        print("[NotificationService] Registration failed: \(error)")
    }

    /// Send FCM/device token to backend
    func syncTokenToBackend(accessToken: String) async {
        guard let token = deviceToken else { return }

        do {
            try await APIService.shared.sendFCMToken(token, accessToken: accessToken)
        } catch {
            print("[NotificationService] Failed to sync token: \(error)")
        }
    }

    // MARK: - UNUserNotificationCenterDelegate

    /// Show notification banner when app is in foreground
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .badge]
    }

    /// Handle notification tap — deep link based on triggerType
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo

        if let triggerType = userInfo["triggerType"] as? String {
            await MainActor.run {
                NotificationCenter.default.post(
                    name: .vitalDeepLink,
                    object: nil,
                    userInfo: ["triggerType": triggerType]
                )
            }
        }
    }
}

// MARK: - Deep Link Notification Name

extension Notification.Name {
    static let vitalDeepLink = Notification.Name("VitalAI.deepLink")
}
