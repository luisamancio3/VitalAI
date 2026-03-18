import SwiftUI

struct HealthKitPermissionView: View {
    let onComplete: () -> Void
    @EnvironmentObject private var healthKitService: HealthKitService

    var body: some View {
        VStack(spacing: VitalSpacing.xl) {
            Spacer()

            // Icon
            Image(systemName: "heart.text.clipboard")
                .resizable()
                .scaledToFit()
                .frame(width: 80, height: 80)
                .foregroundStyle(.vitalPrimary)

            // Title & description
            VStack(spacing: VitalSpacing.sm) {
                Text("Conecte seus dados de saúde")
                    .font(.vitalTitle)
                    .multilineTextAlignment(.center)

                Text("Para personalizar sua experiência, precisamos acessar alguns dados do Apple Health.")
                    .font(.vitalCaption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, VitalSpacing.lg)
            }

            // Data types list
            VStack(alignment: .leading, spacing: VitalSpacing.md) {
                HealthDataRow(icon: "heart.fill", title: "Frequência Cardíaca", subtitle: "Monitoramento contínuo")
                HealthDataRow(icon: "waveform.path.ecg", title: "Variabilidade Cardíaca", subtitle: "Indicador de estresse")
                HealthDataRow(icon: "bed.double.fill", title: "Análise do Sono", subtitle: "Qualidade e duração")
                HealthDataRow(icon: "figure.walk", title: "Atividade Física", subtitle: "Passos e movimento")
            }
            .padding(VitalSpacing.lg)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: VitalRadius.lg))
            .padding(.horizontal, VitalSpacing.lg)

            // Privacy badge
            HStack(spacing: VitalSpacing.sm) {
                Image(systemName: "lock.shield.fill")
                    .foregroundStyle(.vitalPrimary)
                Text("Seus dados são processados no seu dispositivo")
                    .font(.vitalMicro)
                    .foregroundStyle(.vitalSlate500)
            }

            Spacer()

            // Buttons
            VStack(spacing: VitalSpacing.md) {
                VitalButton(title: "Conectar Apple Health", variant: .primary) {
                    Task {
                        do {
                            try await healthKitService.requestAuthorization()
                        } catch {
                            print("[HealthKit] Authorization failed: \(error)")
                        }
                        onComplete()
                    }
                }

                Button {
                    onComplete()
                } label: {
                    Text("Pular por enquanto")
                        .font(.vitalCaptionMedium)
                        .foregroundStyle(.vitalAccentBlue)
                }
            }
            .padding(.horizontal, VitalSpacing.lg)
            .padding(.bottom, VitalSpacing.xxl)
        }
        .background(Color.vitalBackground)
    }
}

private struct HealthDataRow: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: VitalSpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(.vitalPrimary)
                .frame(width: 32, height: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.vitalBodyMedium)
                Text(subtitle)
                    .font(.vitalMicro)
                    .foregroundStyle(.vitalSlate400)
            }
        }
    }
}
