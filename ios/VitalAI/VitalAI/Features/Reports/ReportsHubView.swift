import SwiftUI

struct ReportsHubView: View {
    @State private var reports: [WeeklyReportSummary] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if reports.isEmpty {
                    emptyState
                } else {
                    reportsList
                }
            }
            .background(Color.vitalBackground)
            .navigationTitle("Relatórios")
        }
        .task {
            await loadReports()
        }
    }

    private var emptyState: some View {
        VStack(spacing: VitalSpacing.lg) {
            Spacer()

            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 48))
                .foregroundStyle(.vitalSlate300)

            Text("Seus relatórios semanais aparecerão aqui")
                .font(.vitalCaption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Text("O primeiro relatório será gerado no domingo")
                .font(.vitalMicro)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Spacer()
        }
        .padding(VitalSpacing.xl)
    }

    private var reportsList: some View {
        ScrollView {
            VStack(spacing: VitalSpacing.md) {
                ForEach(reports) { report in
                    NavigationLink(destination: WeeklyReportView(reportId: report.id)) {
                        VitalCard {
                            HStack {
                                VStack(alignment: .leading, spacing: VitalSpacing.xs) {
                                    Text("Semana de \(formatDate(report.weekStart))")
                                        .font(.vitalBodyMedium)
                                        .foregroundStyle(.primary)
                                    Text(formatDate(report.weekStart) + " — " + formatDate(report.weekEnd))
                                        .font(.vitalMicro)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.vitalCaption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .padding(VitalSpacing.lg)
        }
        .refreshable {
            await loadReports()
        }
    }

    private func loadReports() async {
        guard let token = await AuthService.shared?.getAccessToken() else {
            isLoading = false
            return
        }

        do {
            reports = try await APIService.shared.getWeeklyReports(accessToken: token)
        } catch {
            print("[ReportsHub] Failed to load: \(error)")
        }

        isLoading = false
    }

    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate, .withTime, .withColonSeparatorInTime]

        let displayFormatter = DateFormatter()
        displayFormatter.locale = Locale(identifier: "pt_BR")
        displayFormatter.dateFormat = "dd/MM"

        guard let date = formatter.date(from: isoString) else {
            return isoString
        }
        return displayFormatter.string(from: date)
    }
}
