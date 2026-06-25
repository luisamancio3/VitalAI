import SwiftUI

struct BreathingExerciseView: View {
    let exercise: BreathingExercise
    @Environment(\.dismiss) private var dismiss

    @State private var currentCycle = 0
    @State private var phase: BreathingPhase = .ready
    @State private var progress: Double = 0
    @State private var isRunning = false
    @State private var timer: Timer?
    @State private var elapsedInPhase: Double = 0

    private enum BreathingPhase: String {
        case ready = "Pronto?"
        case inhale = "Inspire"
        case hold = "Segure"
        case exhale = "Expire"
        case holdAfter = "Segure"
        case done = "Concluído!"
    }

    private var phaseColor: Color {
        switch phase {
        case .ready: return .secondary
        case .inhale: return .vitalAccentBlue
        case .hold, .holdAfter: return .orange
        case .exhale: return .vitalSuccess
        case .done: return .vitalPrimary
        }
    }

    private var phaseDuration: Double {
        switch phase {
        case .inhale: return Double(exercise.inhale)
        case .hold: return Double(exercise.hold)
        case .exhale: return Double(exercise.exhale)
        case .holdAfter: return Double(exercise.holdAfter)
        default: return 0
        }
    }

    private var circleScale: CGFloat {
        switch phase {
        case .inhale: return 1.0 + CGFloat(progress) * 0.4
        case .exhale: return 1.4 - CGFloat(progress) * 0.4
        case .hold, .holdAfter: return 1.4
        case .ready: return 1.0
        case .done: return 1.2
        }
    }

    var body: some View {
        VStack(spacing: VitalSpacing.xl) {
            Text(exercise.name)
                .font(.vitalHeadline)

            Spacer()

            ZStack {
                Circle()
                    .fill(phaseColor.opacity(0.15))
                    .frame(width: 200, height: 200)
                    .scaleEffect(circleScale)
                    .animation(.easeInOut(duration: 0.5), value: circleScale)

                Circle()
                    .stroke(phaseColor, lineWidth: 4)
                    .frame(width: 200, height: 200)
                    .scaleEffect(circleScale)
                    .animation(.easeInOut(duration: 0.5), value: circleScale)

                VStack(spacing: 8) {
                    Text(phase.rawValue)
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundStyle(phaseColor)

                    if isRunning {
                        Text("Ciclo \(currentCycle + 1)/\(exercise.cycles)")
                            .font(.vitalCaption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            if phase == .ready {
                VitalButton(title: "Começar", style: .primary) {
                    startExercise()
                }
            } else if phase == .done {
                VStack(spacing: VitalSpacing.md) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.vitalSuccess)
                    Text("Exercício concluído!")
                        .font(.vitalSubheadline)
                    VitalButton(title: "Fechar", style: .secondary) {
                        dismiss()
                    }
                }
            } else {
                Button("Parar") {
                    stopExercise()
                    dismiss()
                }
                .foregroundStyle(.secondary)
            }
        }
        .padding(VitalSpacing.xl)
        .onDisappear {
            stopExercise()
        }
    }

    private func startExercise() {
        isRunning = true
        currentCycle = 0
        startPhase(.inhale)
    }

    private func stopExercise() {
        timer?.invalidate()
        timer = nil
        isRunning = false
    }

    private func startPhase(_ newPhase: BreathingPhase) {
        phase = newPhase
        elapsedInPhase = 0
        progress = 0

        let duration = phaseDuration
        guard duration > 0 else {
            advancePhase()
            return
        }

        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
            elapsedInPhase += 0.05
            progress = min(elapsedInPhase / duration, 1.0)

            if elapsedInPhase >= duration {
                timer?.invalidate()
                advancePhase()
            }
        }
    }

    private func advancePhase() {
        switch phase {
        case .inhale:
            if exercise.hold > 0 {
                startPhase(.hold)
            } else {
                startPhase(.exhale)
            }
        case .hold:
            startPhase(.exhale)
        case .exhale:
            if exercise.holdAfter > 0 {
                startPhase(.holdAfter)
            } else {
                completeCycle()
            }
        case .holdAfter:
            completeCycle()
        default:
            break
        }
    }

    private func completeCycle() {
        currentCycle += 1
        if currentCycle >= exercise.cycles {
            stopExercise()
            phase = .done
        } else {
            startPhase(.inhale)
        }
    }
}
