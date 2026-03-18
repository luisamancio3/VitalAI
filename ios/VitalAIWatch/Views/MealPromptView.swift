import SwiftUI

// Reference: design/screens/generated_screen_7/screen.png ("Comendo agora?")

struct MealPromptView: View {
    @EnvironmentObject private var sessionManager: WatchSessionManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "fork.knife")
                .font(.title)
                .foregroundStyle(Color(hex: "2bd4a7"))

            Text("Comendo agora?")
                .font(.headline)

            HStack(spacing: 8) {
                Button("Sim") {
                    sessionManager.sendTriggerEvent(
                        type: "meal_detected",
                        payload: ["confirmed": true, "source": "watch_prompt"]
                    )
                    dismiss()
                }
                .tint(Color(hex: "2bd4a7"))

                Button("Não") {
                    dismiss()
                }
                .tint(.gray)
            }
        }
        .padding()
    }
}
