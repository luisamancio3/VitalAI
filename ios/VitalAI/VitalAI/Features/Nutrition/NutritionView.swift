import SwiftUI

struct NutritionView: View {
    @State private var hasProfile = false
    @State private var isLoading = true
    @State private var suggestion: MealSuggestion?
    @State private var showFeedback = false
    @State private var feedbackRecipeId: String?
    @State private var feedbackContext: String?
    @State private var history: [MealFeedbackItem] = []

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if !hasProfile {
                    NutritionOnboardingView {
                        hasProfile = true
                        Task { await loadSuggestion() }
                    }
                } else {
                    nutritionContent
                }
            }
            .background(Color.vitalBackground)
            .navigationTitle("Nutrição")
        }
        .task {
            await checkProfile()
        }
    }

    private var nutritionContent: some View {
        ScrollView {
            VStack(spacing: VitalSpacing.lg) {
                // Current Suggestion
                if let suggestion {
                    MealSuggestionCard(suggestion: suggestion) {
                        // Gostei -> show feedback
                        feedbackRecipeId = suggestion.recipe.id
                        feedbackContext = suggestion.context
                        showFeedback = true
                    } onSwap: {
                        Task { await loadSuggestion() }
                    }
                } else {
                    VitalCard {
                        VStack(spacing: VitalSpacing.sm) {
                            Image(systemName: "fork.knife")
                                .font(.vitalTitle)
                                .foregroundStyle(.vitalPrimary)
                            Text("Carregando sugestão...")
                                .font(.vitalCaption)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }

                // History
                if !history.isEmpty {
                    VStack(alignment: .leading, spacing: VitalSpacing.sm) {
                        Text("Histórico")
                            .font(.vitalSubheadline)
                            .padding(.horizontal, VitalSpacing.xs)

                        ForEach(history.prefix(10)) { item in
                            HStack {
                                Text(item.recipeId)
                                    .font(.vitalCaption)
                                    .lineLimit(1)
                                Spacer()
                                HStack(spacing: 2) {
                                    ForEach(1...5, id: \.self) { star in
                                        Image(systemName: star <= item.rating ? "star.fill" : "star")
                                            .font(.vitalMicro)
                                            .foregroundStyle(.vitalStar)
                                    }
                                }
                            }
                            .padding(.vertical, VitalSpacing.xs)
                        }
                    }
                }
            }
            .padding(VitalSpacing.lg)
        }
        .refreshable {
            await loadSuggestion()
            await loadHistory()
        }
        .sheet(isPresented: $showFeedback) {
            if let recipeId = feedbackRecipeId {
                MealFeedbackView(recipeId: recipeId, context: feedbackContext) {
                    showFeedback = false
                    Task {
                        await loadSuggestion()
                        await loadHistory()
                    }
                }
            }
        }
    }

    private func checkProfile() async {
        guard let token = await AuthService.shared?.getAccessToken() else {
            isLoading = false
            return
        }

        do {
            let profile = try await APIService.shared.getNutritionProfile(accessToken: token)
            hasProfile = profile != nil
            if hasProfile {
                await loadSuggestion()
                await loadHistory()
            }
        } catch {
            hasProfile = false
        }

        isLoading = false
    }

    private func loadSuggestion() async {
        guard let token = await AuthService.shared?.getAccessToken() else { return }

        let context = suggestedContext()
        do {
            suggestion = try await APIService.shared.getMealSuggestion(context: context, accessToken: token)
        } catch {
            print("[NutritionView] Failed to load suggestion: \(error)")
        }
    }

    private func loadHistory() async {
        guard let token = await AuthService.shared?.getAccessToken() else { return }
        do {
            history = try await APIService.shared.getMealHistory(accessToken: token)
        } catch {
            print("[NutritionView] Failed to load history: \(error)")
        }
    }

    /// Suggest context based on time of day
    private func suggestedContext() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 10 { return "breakfast" }
        if hour < 14 { return "lunch" }
        if hour < 17 { return "snack" }
        return "dinner"
    }
}
