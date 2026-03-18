import SwiftUI

struct WeeklyReportView: View {
    let reportId: String
    @State private var report: WeeklyReport?
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(.top, VitalSpacing.xxl)
            } else if let report {
                VStack(spacing: VitalSpacing.lg) {
                    // Header
                    VitalCard {
                        VStack(alignment: .leading, spacing: VitalSpacing.sm) {
                            Text("Relatório Semanal")
                                .font(.vitalTitle)
                                .foregroundStyle(.vitalPrimary)
                            Text(formatWeekRange(start: report.weekStart, end: report.weekEnd))
                                .font(.vitalCaption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    // Metrics cards
                    if let metrics = report.metrics {
                        metricsSection(metrics)
                    }

                    // Coach report text
                    VitalCard {
                        VStack(alignment: .leading, spacing: VitalSpacing.sm) {
                            HStack {
                                Image(systemName: "person.wave.2")
                                    .foregroundStyle(.vitalPrimary)
                                Text("Seu Coach")
                                    .font(.vitalSubheadline)
                            }
                            Text(report.reportText)
                                .font(.vitalBody)
                                .lineSpacing(4)
                        }
                    }
                }
                .padding(VitalSpacing.lg)
            } else {
                VStack(spacing: VitalSpacing.md) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.largeTitle)
                        .foregroundStyle(.secondary)
                    Text("Relatório não encontrado")
                        .font(.vitalCaption)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, VitalSpacing.xxl)
            }
        }
        .background(Color.vitalBackground)
        .navigationTitle("Relatório")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadReport()
        }
    }

    @ViewBuilder
    private func metricsSection(_ metrics: ReportMetrics) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: VitalSpacing.md) {
            if let hr = metrics.avgHeartRate {
                metricCard(icon: "heart.fill", title: "FC Média", value: "\(Int(hr))", unit: "bpm", color: .vitalError)
            }
            if let hrv = metrics.avgHrv {
                metricCard(icon: "waveform.path.ecg", title: "HRV Médio", value: "\(Int(hrv))", unit: "ms", color: .vitalAccentBlue)
            }
            if let sleep = metrics.avgSleepHours {
                metricCard(icon: "moon.fill", title: "Sono Médio", value: String(format: "%.1f", sleep), unit: "horas", color: .vitalSlate600)
            }
            if let workouts = metrics.workoutCount {
                metricCard(icon: "figure.run", title: "Treinos", value: "\(workouts)", unit: "sessões", color: .vitalSuccess)
            }
        }
    }

    private func metricCard(icon: String, title: String, value: String, unit: String, color: Color) -> some View {
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
    }

    private func loadReport() async {
        guard let token = await AuthService.shared?.getAccessToken() else {
            isLoading = false
            return
        }

        do {
            report = try await APIService.shared.getWeeklyReport(id: reportId, accessToken: token)
        } catch {
            print("[WeeklyReport] Failed to load: \(error)")
        }

        isLoading = false
    }

    private func formatWeekRange(start: String, end: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate, .withTime, .withColonSeparatorInTime]

        let displayFormatter = DateFormatter()
        displayFormatter.locale = Locale(identifier: "pt_BR")
        displayFormatter.dateFormat = "dd MMM"

        guard let startDate = formatter.date(from: start),
              let endDate = formatter.date(from: end) else {
            return "\(start) — \(end)"
        }

        return "\(displayFormatter.string(from: startDate)) — \(displayFormatter.string(from: endDate))"
    }
}
