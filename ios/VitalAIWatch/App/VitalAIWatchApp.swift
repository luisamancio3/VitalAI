import SwiftUI

@main
struct VitalAIWatchApp: App {
    @StateObject private var sessionManager = WatchSessionManager.shared

    var body: some Scene {
        WindowGroup {
            WatchDashboardView()
                .environmentObject(sessionManager)
        }
    }
}
