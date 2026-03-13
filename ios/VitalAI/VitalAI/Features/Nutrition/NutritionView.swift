import SwiftUI

struct NutritionView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: VitalSpacing.lg) {
                    VitalCard {
                        Text("Resumo Nutricional")
                            .font(.vitalSubheadline)
                        Text("Registre suas refeições para ver os macros do dia")
                            .font(.vitalCaption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(VitalSpacing.lg)
            }
            .background(Color.vitalBackground)
            .navigationTitle("Nutrição")
        }
    }
}
