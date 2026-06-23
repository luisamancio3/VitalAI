import SwiftUI

struct WatchDashboardView: View {
    @EnvironmentObject private var sessionManager: WatchSessionManager
    @EnvironmentObject private var gestureDetector: MealGestureDetector

    private var hasData: Bool {
        sessionManager.healthScore > 0 || sessionManager.heartRate > 0 || sessionManager.sleepHours > 0
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                if hasData {
                    // Health Score
                    Text("\(sessionManager.healthScore)")
                        .font(.system(size: 44, weight: .bold))
                        .foregroundStyle(Color.vitalPrimary)

                    Text("Health Score")
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    Divider()

                    // Quick stats
                    HStack {
                        VStack {
                            Image(systemName: "heart.fill")
                                .foregroundStyle(.red)
                            Text("\(sessionManager.heartRate)")
                                .font(.caption)
                                .bold()
                            Text("BPM")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }

                        VStack {
                            Image(systemName: "bed.double.fill")
                                .foregroundStyle(.indigo)
                            Text(String(format: "%.1fh", sessionManager.sleepHours))
                                .font(.caption)
                                .bold()
                            Text("Sono")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }

                    if gestureDetector.isMonitoring {
                        Divider()
                        HStack(spacing: 4) {
                            Image(systemName: "fork.knife")
                                .font(.caption2)
                            Text("Detecção ativa")
                                .font(.caption2)
                        }
                        .foregroundStyle(Color.vitalPrimary.opacity(0.7))
                    }
                } else {
                    VStack(spacing: 8) {
                        Image(systemName: "iphone.and.arrow.forward")
                            .font(.title2)
                            .foregroundStyle(Color.vitalPrimary)
                        Text("Conecte o iPhone para ver seus dados")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                }
            }
            .padding()
        }
        .sheet(isPresented: $sessionManager.showMealPrompt) {
            MealPromptView(source: .gesture, confidence: sessionManager.pendingMealConfidence)
        }
    }
}
