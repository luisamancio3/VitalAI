import SwiftUI

struct ReportsHubView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: VitalSpacing.lg) {
                    VitalCard {
                        Text("Relatórios")
                            .font(.vitalSubheadline)
                        Text("Seus relatórios semanais e mensais aparecerão aqui")
                            .font(.vitalCaption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(VitalSpacing.lg)
            }
            .background(Color.vitalBackground)
            .navigationTitle("Relatórios")
        }
    }
}
