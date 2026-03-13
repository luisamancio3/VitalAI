import SwiftUI

// Reference: design/screens/generated_screen_7/screen.png ("Comendo agora?")

struct MealPromptView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "fork.knife")
                .font(.title)
                .foregroundStyle(Color(hex: "2bd4a7"))

            Text("Comendo agora?")
                .font(.headline)

            HStack(spacing: 8) {
                Button("Sim") {
                    // TODO: Confirm meal detection
                }
                .tint(Color(hex: "2bd4a7"))

                Button("Não") {
                    // TODO: Dismiss meal detection
                }
                .tint(.gray)
            }
        }
        .padding()
    }
}
