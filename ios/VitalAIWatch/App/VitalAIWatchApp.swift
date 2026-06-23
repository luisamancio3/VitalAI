import SwiftUI

@main
struct VitalAIWatchApp: App {
    @StateObject private var sessionManager = WatchSessionManager.shared
    @StateObject private var gestureDetector = MealGestureDetector()

    var body: some Scene {
        WindowGroup {
            WatchDashboardView()
                .environmentObject(sessionManager)
                .environmentObject(gestureDetector)
                .onAppear {
                    gestureDetector.setDetectionHandler { confidence in
                        sessionManager.pendingMealConfidence = confidence
                        sessionManager.showMealPrompt = true
                    }
                    gestureDetector.startMonitoring()
                }
        }
    }
}
