import SwiftUI

struct DashboardView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: VitalSpacing.lg) {
                    VitalCard {
                        HStack {
                            VStack(alignment: .leading, spacing: VitalSpacing.xs) {
                                Text("Seu Health Score")
                                    .font(.vitalCaptionMedium)
                                    .foregroundStyle(.secondary)
                                Text("78")
                                    .font(.system(size: 48, weight: .bold))
                                    .foregroundStyle(.vitalPrimary)
                                Text("Bom")
                                    .font(.vitalCaption)
                                    .foregroundStyle(.vitalPrimary)
                            }
                            Spacer()
                            ProgressRing(progress: 0.78, label: "78%")
                        }
                    }

                    VitalCard {
                        Text("Timeline do Dia")
                            .font(.vitalSubheadline)
                        Text("Seus eventos de saúde aparecerão aqui")
                            .font(.vitalCaption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(VitalSpacing.lg)
            }
            .background(Color.vitalBackground)
            .navigationTitle("VitalAI")
        }
    }
}
