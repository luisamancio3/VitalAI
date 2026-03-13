import SwiftUI

@main
struct VitalAIApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    @State private var hasCompletedOnboarding = false

    var body: some View {
        if hasCompletedOnboarding {
            MainTabView()
        } else {
            OnboardingFlow(onComplete: {
                hasCompletedOnboarding = true
            })
        }
    }
}

// Main tab navigation — matches bottom nav from component library:
// Home, Nutrição, Relatórios, Perfil
struct MainTabView: View {
    var body: some View {
        TabView {
            Tab("Home", systemImage: "house") {
                DashboardView()
            }
            Tab("Nutrição", systemImage: "fork.knife") {
                NutritionView()
            }
            Tab("Relatórios", systemImage: "chart.line.uptrend.xyaxis") {
                ReportsHubView()
            }
            Tab("Perfil", systemImage: "person") {
                ProfileView()
            }
        }
        .tint(.vitalPrimary)
    }
}
