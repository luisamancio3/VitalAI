import SwiftUI

struct MealSuggestionCard: View {
    let suggestion: MealSuggestion
    let onLike: () -> Void
    let onSwap: () -> Void

    var body: some View {
        VitalCard {
            VStack(alignment: .leading, spacing: VitalSpacing.md) {
                // Recipe name and message
                Text(suggestion.recipe.name)
                    .font(.vitalSubheadline)

                Text(suggestion.message)
                    .font(.vitalCaption)
                    .foregroundStyle(.secondary)

                // Macros
                HStack(spacing: VitalSpacing.sm) {
                    MacroPill(label: "\(suggestion.recipe.macros.calories) cal", color: .macroCalories)
                    MacroPill(label: "\(suggestion.recipe.macros.protein)g prot", color: .macroProtein)
                    MacroPill(label: "\(suggestion.recipe.macros.carbs)g carb", color: .macroCarbs)
                    MacroPill(label: "\(suggestion.recipe.macros.fat)g fat", color: .macroFat)
                }

                // Meta
                HStack(spacing: VitalSpacing.lg) {
                    Label("\(suggestion.recipe.prepTime) min", systemImage: "clock")
                        .font(.vitalMicro)
                        .foregroundStyle(.secondary)

                    Label(difficultyLabel, systemImage: "chart.bar")
                        .font(.vitalMicro)
                        .foregroundStyle(.secondary)

                    Label("\(suggestion.recipe.servings) porção", systemImage: "person")
                        .font(.vitalMicro)
                        .foregroundStyle(.secondary)
                }

                // Actions
                HStack(spacing: VitalSpacing.md) {
                    VitalButton(title: "Gostei", variant: .primary, size: .medium) {
                        onLike()
                    }

                    VitalButton(title: "Trocar", variant: .secondary, size: .medium) {
                        onSwap()
                    }
                }
            }
        }
    }

    private var difficultyLabel: String {
        switch suggestion.recipe.difficulty {
        case "easy": return "Fácil"
        case "medium": return "Médio"
        case "hard": return "Difícil"
        default: return suggestion.recipe.difficulty
        }
    }
}

private struct MacroPill: View {
    let label: String
    let color: Color

    var body: some View {
        Text(label)
            .font(.vitalMicro)
            .foregroundStyle(.white)
            .padding(.horizontal, VitalSpacing.sm)
            .padding(.vertical, VitalSpacing.xs)
            .background(color)
            .clipShape(Capsule())
    }
}
