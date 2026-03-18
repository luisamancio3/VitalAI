import SwiftUI

struct MealFeedbackView: View {
    let recipeId: String
    let context: String?
    let onComplete: () -> Void

    @State private var rating = 0
    @State private var comment = ""
    @State private var isSubmitting = false
    @State private var showSuccess = false

    var body: some View {
        NavigationStack {
            VStack(spacing: VitalSpacing.xl) {
                if showSuccess {
                    successView
                } else {
                    feedbackForm
                }
            }
            .padding(VitalSpacing.xl)
            .navigationTitle("Avaliar Refeição")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fechar") { onComplete() }
                }
            }
        }
    }

    private var feedbackForm: some View {
        VStack(spacing: VitalSpacing.xl) {
            Spacer()

            Text("Como foi essa refeição?")
                .font(.vitalHeadline)

            // Star rating
            HStack(spacing: VitalSpacing.md) {
                ForEach(1...5, id: \.self) { star in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            rating = star
                        }
                    } label: {
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.system(size: 36))
                            .foregroundStyle(star <= rating ? .vitalStar : .vitalSlate300)
                    }
                }
            }

            // Optional comment
            TextField("Algum comentário? (opcional)", text: $comment)
                .textFieldStyle(.roundedBorder)
                .font(.vitalCaption)

            Spacer()

            VitalButton(
                title: isSubmitting ? "Enviando..." : "Enviar",
                variant: .primary,
                isDisabled: rating == 0 || isSubmitting
            ) {
                submitFeedback()
            }
        }
    }

    private var successView: some View {
        VStack(spacing: VitalSpacing.lg) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(.vitalSuccess)

            Text("Obrigado!")
                .font(.vitalTitle)

            Text("Sua avaliação ajuda a melhorar suas sugestões")
                .font(.vitalCaption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Spacer()

            VitalButton(title: "Fechar", variant: .primary) {
                onComplete()
            }
        }
    }

    private func submitFeedback() {
        isSubmitting = true

        Task {
            guard let token = await AuthService.shared?.getAccessToken() else {
                isSubmitting = false
                return
            }

            do {
                try await APIService.shared.sendMealFeedback(
                    recipeId: recipeId,
                    rating: rating,
                    comment: comment.isEmpty ? nil : comment,
                    context: context,
                    accessToken: token
                )
                withAnimation { showSuccess = true }
            } catch {
                print("[MealFeedback] Failed to submit: \(error)")
            }

            isSubmitting = false
        }
    }
}
