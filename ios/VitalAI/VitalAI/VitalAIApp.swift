import SwiftUI

@main
struct VitalAIApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var authService = AuthService()
    @StateObject private var healthKitService = HealthKitService()
    @StateObject private var notificationService = NotificationService()
    @StateObject private var triggerEngine = TriggerEngine()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
                .environmentObject(healthKitService)
                .environmentObject(notificationService)
                .environmentObject(triggerEngine)
                .onReceive(NotificationCenter.default.publisher(for: .vitalAPNsToken)) { notification in
                    if let tokenData = notification.object as? Data {
                        notificationService.handleDeviceToken(tokenData)

                        // Sync token to backend
                        Task {
                            if let accessToken = await authService.getAccessToken() {
                                await notificationService.syncTokenToBackend(accessToken: accessToken)
                            }
                        }
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: .vitalAPNsError)) { notification in
                    if let error = notification.object as? Error {
                        notificationService.handleRegistrationError(error)
                    }
                }
                .onChange(of: authService.state) { _, newState in
                    if case .authenticated = newState {
                        Task {
                            await notificationService.requestPermission()
                            triggerEngine.startMonitoring()
                        }
                    } else {
                        triggerEngine.stopMonitoring()
                    }
                }
        }
    }
}

// MARK: - AppDelegate for APNs Token

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        NotificationCenter.default.post(name: .vitalAPNsToken, object: deviceToken)
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        NotificationCenter.default.post(name: .vitalAPNsError, object: error)
    }
}

extension Notification.Name {
    static let vitalAPNsToken = Notification.Name("VitalAI.APNsToken")
    static let vitalAPNsError = Notification.Name("VitalAI.APNsError")
}
