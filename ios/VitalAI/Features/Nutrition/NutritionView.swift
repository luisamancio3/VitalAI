import SwiftUI

// Reference: design/screens/nutri_o_vitalai/screen.png

struct NutritionView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: VitalSpacing.lg) {
                    // Macro summary
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
