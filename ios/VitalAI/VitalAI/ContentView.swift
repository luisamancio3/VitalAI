//
//  ContentView.swift
//  VitalAI
//
//  Created by Luis Amancio on 13/03/26.
//

import SwiftUI

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

#Preview {
    ContentView()
}
