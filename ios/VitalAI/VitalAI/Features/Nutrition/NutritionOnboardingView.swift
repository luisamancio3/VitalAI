import SwiftUI

struct NutritionOnboardingView: View {
    @State private var step = 0
    @State private var goal = ""
    @State private var restrictions: Set<String> = []
    @State private var cookingSkill = ""
    @State private var isLoading = false

    let onComplete: () -> Void

    private let restrictionOptions = [
        ("vegetarian", "Vegetariano"),
        ("vegan", "Vegano"),
        ("gluten_free", "Sem Glúten"),
        ("lactose_free", "Sem Lactose"),
        ("low_carb", "Low Carb"),
    ]

    var body: some View {
        VStack(spacing: VitalSpacing.xl) {
            // Progress dots
            HStack(spacing: VitalSpacing.sm) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(i <= step ? Color.vitalPrimary : Color.vitalSlate200)
                        .frame(width: 8, height: 8)
                }
            }
            .padding(.top, VitalSpacing.lg)

            Spacer()

            switch step {
            case 0:
                goalStep
            case 1:
                restrictionsStep
            case 2:
                cookingSkillStep
            default:
                EmptyView()
            }

            Spacer()

            VitalButton(title: step < 2 ? "Continuar" : "Concluir", variant: .primary, isDisabled: !canProceed) {
                if step < 2 {
                    withAnimation { step += 1 }
                } else {
                    saveProfile()
                }
            }

            if step < 2 {
                Button("Pular") {
                    onComplete()
                }
                .font(.vitalCaption)
                .foregroundStyle(.secondary)
            }
        }
        .padding(VitalSpacing.xl)
    }

    private var canProceed: Bool {
        switch step {
        case 0: return !goal.isEmpty
        case 1: return true // restrictions are optional
        case 2: return !cookingSkill.isEmpty
        default: return false
        }
    }

    // MARK: - Step 1: Goal

    private var goalStep: some View {
        VStack(spacing: VitalSpacing.lg) {
            Text("Qual é seu objetivo?")
                .font(.vitalTitle)
                .multilineTextAlignment(.center)

            VStack(spacing: VitalSpacing.md) {
                GoalCard(title: "Perder Peso", icon: "arrow.down.circle", value: "lose", selected: goal) {
                    goal = "lose"
                }
                GoalCard(title: "Manter Peso", icon: "equal.circle", value: "maintain", selected: goal) {
                    goal = "maintain"
                }
                GoalCard(title: "Ganhar Massa", icon: "arrow.up.circle", value: "gain", selected: goal) {
                    goal = "gain"
                }
            }
        }
    }

    // MARK: - Step 2: Restrictions

    private var restrictionsStep: some View {
        VStack(spacing: VitalSpacing.lg) {
            Text("Alguma restrição alimentar?")
                .font(.vitalTitle)
                .multilineTextAlignment(.center)

            Text("Selecione todas que se aplicam")
                .font(.vitalCaption)
                .foregroundStyle(.secondary)

            FlowLayout(spacing: VitalSpacing.sm) {
                ForEach(restrictionOptions, id: \.0) { key, label in
                    ChipButton(label: label, isSelected: restrictions.contains(key)) {
                        if restrictions.contains(key) {
                            restrictions.remove(key)
                        } else {
                            restrictions.insert(key)
                        }
                    }
                }

                ChipButton(label: "Nenhuma", isSelected: restrictions.isEmpty) {
                    restrictions.removeAll()
                }
            }
        }
    }

    // MARK: - Step 3: Cooking Skill

    private var cookingSkillStep: some View {
        VStack(spacing: VitalSpacing.lg) {
            Text("Seu nível na cozinha?")
                .font(.vitalTitle)
                .multilineTextAlignment(.center)

            VStack(spacing: VitalSpacing.md) {
                GoalCard(title: "Iniciante", icon: "leaf", value: "beginner", selected: cookingSkill, subtitle: "Receitas simples e rápidas") {
                    cookingSkill = "beginner"
                }
                GoalCard(title: "Intermediário", icon: "flame", value: "intermediate", selected: cookingSkill, subtitle: "Já se viro bem na cozinha") {
                    cookingSkill = "intermediate"
                }
                GoalCard(title: "Avançado", icon: "star", value: "advanced", selected: cookingSkill, subtitle: "Gosto de receitas elaboradas") {
                    cookingSkill = "advanced"
                }
            }
        }
    }

    // MARK: - Save

    private func saveProfile() {
        isLoading = true

        Task {
            guard let token = await AuthService.shared?.getAccessToken() else {
                isLoading = false
                return
            }

            do {
                try await APIService.shared.saveNutritionProfile(
                    goal: goal,
                    restrictions: Array(restrictions),
                    cookingSkill: cookingSkill,
                    accessToken: token
                )
                onComplete()
            } catch {
                print("[NutritionOnboarding] Failed to save: \(error)")
            }

            isLoading = false
        }
    }
}

// MARK: - Supporting Views

private struct GoalCard: View {
    let title: String
    let icon: String
    let value: String
    let selected: String
    var subtitle: String? = nil
    let action: () -> Void

    var isSelected: Bool { value == selected }

    var body: some View {
        Button(action: action) {
            HStack(spacing: VitalSpacing.md) {
                Image(systemName: icon)
                    .font(.vitalHeadline)
                    .foregroundStyle(isSelected ? .white : .vitalPrimary)
                    .frame(width: 40)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.vitalBodyMedium)
                        .foregroundStyle(isSelected ? .white : .primary)
                    if let subtitle {
                        Text(subtitle)
                            .font(.vitalMicro)
                            .foregroundStyle(isSelected ? .white.opacity(0.8) : .secondary)
                    }
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.white)
                }
            }
            .padding(VitalSpacing.lg)
            .background(isSelected ? Color.vitalPrimary : Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: VitalRadius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: VitalRadius.lg)
                    .strokeBorder(isSelected ? Color.clear : Color.vitalSlate200, lineWidth: 1)
            )
        }
    }
}

private struct ChipButton: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.vitalCaptionMedium)
                .padding(.horizontal, VitalSpacing.lg)
                .padding(.vertical, VitalSpacing.sm)
                .foregroundStyle(isSelected ? .white : .primary)
                .background(isSelected ? Color.vitalPrimary : Color(.systemBackground))
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(isSelected ? Color.clear : Color.vitalSlate200, lineWidth: 1)
                )
        }
    }
}

// Simple flow layout for chips
private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrangeSubviews(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrangeSubviews(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrangeSubviews(proposal: ProposedViewSize, subviews: Subviews) -> (positions: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x)
        }

        return (positions, CGSize(width: maxX, height: y + rowHeight))
    }
}
