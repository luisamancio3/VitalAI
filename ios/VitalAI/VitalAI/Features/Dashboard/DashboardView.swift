import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var healthKitService: HealthKitService
    @EnvironmentObject private var connectivityService: PhoneConnectivityService

    private var healthScore: Int {
        let sleepWeight = 0.4
        let hrvWeight = 0.3
        let stepsWeight = 0.2
        let hrWeight = 0.1

        let sleepScore: Double = {
            switch healthKitService.lastSleepQuality {
            case "Bom": return 1.0
            case "Regular": return 0.6
            case "Ruim": return 0.2
            default: return 0.5
            }
        }()

        let hrvScore: Double = {
            guard let hrv = healthKitService.latestHRV else { return 0.5 }
            return min(max(hrv / 50.0, 0), 1.5) / 1.5
        }()

        let stepsScore: Double = {
            guard let steps = healthKitService.todaySteps else { return 0.0 }
            return min(Double(steps) / 10000.0, 1.0)
        }()

        let hrScore: Double = {
            guard let hr = healthKitService.latestHeartRate else { return 0.5 }
            if hr >= 50 && hr <= 70 { return 1.0 }
            if hr > 70 && hr <= 90 { return 0.7 }
            return 0.4
        }()

        let raw = (sleepScore * sleepWeight) + (hrvScore * hrvWeight) + (stepsScore * stepsWeight) + (hrScore * hrWeight)
        return min(Int(raw * 100), 100)
    }

    private var scoreLabel: String {
        if healthScore >= 80 { return "Excelente" }
        if healthScore >= 60 { return "Bom" }
        if healthScore >= 40 { return "Regular" }
        return "Atenção"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: VitalSpacing.lg) {
                    // Health Score Card
                    VitalCard {
                        HStack {
                            VStack(alignment: .leading, spacing: VitalSpacing.xs) {
                                Text("Seu Health Score")
                                    .font(.vitalCaptionMedium)
                                    .foregroundStyle(.secondary)
                                Text("\(healthScore)")
                                    .font(.system(size: 48, weight: .bold))
                                    .foregroundStyle(.vitalPrimary)
                                Text(scoreLabel)
                                    .font(.vitalCaption)
                                    .foregroundStyle(.vitalPrimary)
                            }
                            Spacer()
                            ProgressRing(
                                progress: Double(healthScore) / 100.0,
                                label: "\(healthScore)%"
                            )
                        }
                    }

                    // Metric Cards
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: VitalSpacing.md) {
                            MetricCard(
                                icon: "heart.fill",
                                title: "FC",
                                value: healthKitService.latestHeartRate.map { "\(Int($0))" } ?? "—",
                                unit: "bpm",
                                color: .vitalError
                            )
                            MetricCard(
                                icon: "waveform.path.ecg",
                                title: "HRV",
                                value: healthKitService.latestHRV.map { "\(Int($0))" } ?? "—",
                                unit: "ms",
                                color: .vitalAccentBlue
                            )
                            MetricCard(
                                icon: "figure.walk",
                                title: "Passos",
                                value: healthKitService.todaySteps.map { formatSteps($0) } ?? "—",
                                unit: "hoje",
                                color: .vitalSuccess
                            )
                            MetricCard(
                                icon: "moon.fill",
                                title: "Sono",
                                value: healthKitService.lastSleepHours.map { String(format: "%.1f", $0) } ?? "—",
                                unit: "horas",
                                color: .vitalSlate600
                            )
                            MetricCard(
                                icon: "drop.fill",
                                title: "Água",
                                value: healthKitService.todayWaterMl.map { formatWater($0) } ?? "—",
                                unit: "ml",
                                color: .vitalAccentBlue
                            )
                        }
                        .padding(.horizontal, VitalSpacing.lg)
                    }
                    .padding(.horizontal, -VitalSpacing.lg)

                    // Day Timeline
                    VitalCard {
                        VStack(alignment: .leading, spacing: VitalSpacing.sm) {
                            Text("Timeline do Dia")
                                .font(.vitalSubheadline)
                            if healthKitService.lastWorkoutEndDate != nil || healthKitService.latestHeartRate != nil {
                                Text("Última atualização: \(Date(), style: .time)")
                                    .font(.vitalMicro)
                                    .foregroundStyle(.secondary)
                            } else {
                                Text("Puxe para atualizar")
                                    .font(.vitalCaption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                .padding(VitalSpacing.lg)
            }
            .background(Color.vitalBackground)
            .navigationTitle("VitalAI")
            .refreshable {
                await healthKitService.refreshAll()
                syncToWatch()
            }
            .task {
                await healthKitService.refreshAll()
                syncToWatch()
            }
        }
    }

    private func syncToWatch() {
        connectivityService.syncHealthDataToWatch(
            healthScore: healthScore,
            heartRate: Int(healthKitService.latestHeartRate ?? 0),
            sleepHours: healthKitService.lastSleepHours ?? 0
        )
    }

    private func formatWater(_ ml: Double) -> String {
        if ml >= 1000 {
            return String(format: "%.1fL", ml / 1000.0)
        }
        return "\(Int(ml))"
    }

    private func formatSteps(_ steps: Int) -> String {
        if steps >= 1000 {
            return String(format: "%.1fk", Double(steps) / 1000.0)
        }
        return "\(steps)"
    }
}

// MARK: - Metric Card

private struct MetricCard: View {
    let icon: String
    let title: String
    let value: String
    let unit: String
    let color: Color

    var body: some View {
        VitalCard {
            VStack(alignment: .leading, spacing: VitalSpacing.sm) {
                Image(systemName: icon)
                    .font(.vitalBody)
                    .foregroundStyle(color)
                Text(title)
                    .font(.vitalMicro)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.vitalHeadline)
                Text(unit)
                    .font(.vitalMicro)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 120)
    }
}
