import SwiftUI
import Combine

@main
struct VitalAIApp: App {
    @StateObject private var authService = AuthService()
    @StateObject private var healthKitService = HealthKitService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
                .environmentObject(healthKitService)
        }
    }
}
