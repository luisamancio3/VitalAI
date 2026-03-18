import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var authService: AuthService
    @EnvironmentObject private var healthKitService: HealthKitService
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @AppStorage("hasCompletedHealthKit") private var hasCompletedHealthKit = false
    @State private var showLogin = false

    var body: some View {
        Group {
            switch authService.state {
            case .unknown:
                SplashView()

            case .unauthenticated:
                if showLogin {
                    LoginView(onShowSignUp: { showLogin = false })
                } else {
                    OnboardingFlow(
                        onComplete: {
                            hasCompletedOnboarding = true
                        },
                        onShowLogin: { showLogin = true }
                    )
                }

            case .authenticated:
                if !hasCompletedHealthKit {
                    HealthKitPermissionView {
                        hasCompletedHealthKit = true
                    }
                } else {
                    MainTabView()
                }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authService.state)
        .task {
            await authService.checkSession()
        }
    }
}

// Main tab navigation — matches bottom nav from component library:
// Home, Nutrição, Relatórios, Perfil
struct MainTabView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Home", systemImage: "house")
                }
            NutritionView()
                .tabItem {
                    Label("Nutrição", systemImage: "fork.knife")
                }
            ReportsHubView()
                .tabItem {
                    Label("Relatórios", systemImage: "chart.line.uptrend.xyaxis")
                }
            ProfileView()
                .tabItem {
                    Label("Perfil", systemImage: "person")
                }
        }
        .tint(.vitalPrimary)
    }
}
