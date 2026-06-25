import SwiftUI

struct HydrationView: View {
    @EnvironmentObject private var healthKitService: HealthKitService
    @State private var status: HydrationStatus?
    @State private var isLoading = true
    @State private var showQuickAdd = false
    @State private var customAmount = ""

    private let quickAmounts = [150, 250, 350, 500]

    private var progressColor: Color {
        guard let progress = status?.progress else { return .secondary }
        if progress >= 1.0 { return .vitalSuccess }
        if progress >= 0.6 { return .vitalAccentBlue }
        if progress >= 0.3 { return .orange }
        return .vitalError
    }

    private var displayProgress: Double {
        status?.progress ?? 0
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: VitalSpacing.lg) {
                    // Progress Ring
                    VitalCard {
                        VStack(spacing: VitalSpacing.md) {
                            ProgressRing(
                                progress: displayProgress,
                                label: "\(status?.todayTotalMl ?? 0)ml",
                                color: progressColor
                            )
                            .frame(height: 140)

                            if let status {
                                Text("\(status.todayTotalMl) / \(status.goalMl) ml")
                                    .font(.vitalSubheadline)
                                    .foregroundStyle(progressColor)

                                Text("\(Int(status.progress * 100))% da meta diária")
                                    .font(.vitalCaption)
                                    .foregroundStyle(.secondary)
                            } else if isLoading {
                                ProgressView()
                            }
                        }
                    }

                    // Quick Add Buttons
                    VStack(alignment: .leading, spacing: VitalSpacing.sm) {
                        Text("Adicionar Água")
                            .font(.vitalSubheadline)
                            .padding(.horizontal, VitalSpacing.xs)

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                        ], spacing: VitalSpacing.sm) {
                            ForEach(quickAmounts, id: \.self) { amount in
                                QuickAddButton(amount: amount) {
                                    await logIntake(amount)
                                }
                            }
                        }

                        VitalButton(title: "Quantidade personalizada", style: .secondary) {
                            showQuickAdd = true
                        }
                    }

                    // Today's Log
                    if let status, status.todayTotalMl > 0 {
                        VitalCard {
                            VStack(alignment: .leading, spacing: VitalSpacing.sm) {
                                Text("Hoje")
                                    .font(.vitalCaptionMedium)

                                HStack {
                                    Image(systemName: "drop.fill")
                                        .foregroundStyle(.vitalAccentBlue)
                                    Text("\(status.todayTotalMl) ml consumidos")
                                        .font(.vitalCaption)
                                    Spacer()
                                    if let nextReminder = status.nextReminderIn {
                                        Text("Próximo lembrete: \(nextReminder) min")
                                            .font(.vitalMicro)
                                            .foregroundStyle(.secondary)
                                    }
                                }

                                if status.progress >= 1.0 {
                                    HStack {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(.vitalSuccess)
                                        Text("Meta atingida!")
                                            .font(.vitalCaption)
                                            .foregroundStyle(.vitalSuccess)
                                    }
                                }
                            }
                        }
                    }

                    // Tips
                    VitalCard {
                        VStack(alignment: .leading, spacing: VitalSpacing.sm) {
                            HStack {
                                Image(systemName: "lightbulb.fill")
                                    .foregroundStyle(.orange)
                                Text("Dicas de Hidratação")
                                    .font(.vitalCaptionMedium)
                            }

                            Text("Beba água regularmente ao longo do dia. Após exercícios, aumente a ingestão para repor os líquidos perdidos.")
                                .font(.vitalMicro)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding(VitalSpacing.lg)
            }
            .background(Color.vitalBackground)
            .navigationTitle("Hidratação")
            .refreshable {
                await loadStatus()
            }
            .task {
                await loadStatus()
            }
            .alert("Quantidade (ml)", isPresented: $showQuickAdd) {
                TextField("Ex: 300", text: $customAmount)
                    .keyboardType(.numberPad)
                Button("Cancelar", role: .cancel) {
                    customAmount = ""
                }
                Button("Adicionar") {
                    if let amount = Int(customAmount), amount > 0 {
                        Task { await logIntake(amount) }
                    }
                    customAmount = ""
                }
            }
        }
    }

    private func loadStatus() async {
        guard let token = await AuthService.shared?.getAccessToken() else {
            isLoading = false
            return
        }

        do {
            status = try await APIService.shared.getHydrationStatus(accessToken: token)
        } catch {
            print("[HydrationView] Failed to load status: \(error)")
        }
        isLoading = false
    }

    private func logIntake(_ amountMl: Int) async {
        guard let token = await AuthService.shared?.getAccessToken() else { return }

        do {
            let response = try await APIService.shared.logWaterIntake(
                amountMl: amountMl,
                source: "quick_add",
                accessToken: token
            )
            try? await healthKitService.saveWaterIntake(milliliters: Double(amountMl))
            status = HydrationStatus(
                todayTotalMl: response.todayTotalMl,
                goalMl: status?.goalMl ?? 2500,
                progress: Double(response.todayTotalMl) / Double(status?.goalMl ?? 2500),
                lastIntakeAt: ISO8601DateFormatter().string(from: Date()),
                nextReminderIn: status?.nextReminderIn
            )
        } catch {
            print("[HydrationView] Failed to log intake: \(error)")
        }
    }
}

// MARK: - Quick Add Button

private struct QuickAddButton: View {
    let amount: Int
    let action: () async -> Void

    @State private var isPressed = false

    var body: some View {
        VitalCard {
            Button {
                Task { await action() }
            } label: {
                HStack {
                    Image(systemName: "drop.fill")
                        .foregroundStyle(.vitalAccentBlue)
                    Text("\(amount) ml")
                        .font(.vitalCaptionMedium)
                        .foregroundStyle(.primary)
                    Spacer()
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(.vitalAccentBlue)
                }
            }
            .buttonStyle(.plain)
        }
    }
}
