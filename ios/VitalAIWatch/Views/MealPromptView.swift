import SwiftUI

// Reference: design/screens/generated_screen_7/screen.png ("Comendo agora?")

enum MealDetectionSource: String {
    case watchPrompt = "watch_prompt"
    case gesture = "gesture_confirmed"
    case manual = "manual"
}

struct MealPromptView: View {
    @EnvironmentObject private var sessionManager: WatchSessionManager
    @EnvironmentObject private var gestureDetector: MealGestureDetector
    @Environment(\.dismiss) private var dismiss

    let source: MealDetectionSource
    var confidence: Double = 0

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "fork.knife")
                .font(.title)
                .foregroundStyle(Color.vitalPrimary)

            Text("Comendo agora?")
                .font(.headline)

            if source == .gesture {
                Text("Detectamos um gesto")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 8) {
                Button("Sim") {
                    gestureDetector.recordMealConfirmation()
                    sessionManager.sendTriggerEvent(
                        type: "meal_detected",
                        payload: [
                            "confirmed": true,
                            "source": source.rawValue,
                            "confidence": confidence,
                        ]
                    )
                    dismiss()
                }
                .tint(Color.vitalPrimary)

                Button("Não") {
                    sessionManager.sendTriggerEvent(
                        type: "meal_detected",
                        payload: [
                            "confirmed": false,
                            "source": source.rawValue,
                            "confidence": confidence,
                        ]
                    )
                    dismiss()
                }
                .tint(.gray)
            }
        }
        .padding()
    }
}
