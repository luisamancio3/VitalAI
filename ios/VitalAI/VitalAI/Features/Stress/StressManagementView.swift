import SwiftUI

struct StressManagementView: View {
    @EnvironmentObject private var healthKitService: HealthKitService
    @State private var stressScore: Int?
    @State private var stressLevel: String?
    @State private var recommendation: String?
    @State private var isLoading = false
    @State private var showBreathingExercise = false
    @State private var selectedExercise: BreathingExercise?

    private var stressColor: Color {
        guard let score = stressScore else { return .secondary }
        if score <= 25 { return .vitalSuccess }
        if score <= 50 { return .vitalAccentBlue }
        if score <= 75 { return .orange }
        return .vitalError
    }

    private var stressLabel: String {
        switch stressLevel {
        case "low": return "Baixo"
        case "moderate": return "Moderado"
        case "high": return "Alto"
        case "very_high": return "Muito Alto"
        default: return "—"
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: VitalSpacing.lg) {
                    // Stress Score Card
                    VitalCard {
                        VStack(spacing: VitalSpacing.md) {
                            if let score = stressScore {
                                ProgressRing(
                                    progress: Double(score) / 100.0,
                                    label: "\(score)",
                                    color: stressColor
                                )
                                .frame(height: 120)

                                Text("Nível de Estresse: \(stressLabel)")
                                    .font(.vitalSubheadline)
                                    .foregroundStyle(stressColor)

                                if let rec = recommendation {
                                    Text(rec)
                                        .font(.vitalCaption)
                                        .foregroundStyle(.secondary)
                                        .multilineTextAlignment(.center)
                                }
                            } else {
                                VStack(spacing: VitalSpacing.sm) {
                                    Image(systemName: "brain.head.profile")
                                        .font(.largeTitle)
                                        .foregroundStyle(.secondary)
                                    Text("Toque para avaliar seu estresse")
                                        .font(.vitalCaption)
                                        .foregroundStyle(.secondary)
                                }
                                .frame(height: 120)
                            }

                            VitalButton(title: isLoading ? "Avaliando..." : "Avaliar Estresse", style: .primary) {
                                await assessStress()
                            }
                            .disabled(isLoading)
                        }
                    }

                    // Breathing Exercises
                    VStack(alignment: .leading, spacing: VitalSpacing.sm) {
                        Text("Exercícios de Respiração")
                            .font(.vitalSubheadline)
                            .padding(.horizontal, VitalSpacing.lg)

                        ForEach(BreathingExercise.catalog, id: \.id) { exercise in
                            BreathingExerciseCard(exercise: exercise) {
                                selectedExercise = exercise
                                showBreathingExercise = true
                            }
                        }
                    }
                }
                .padding(VitalSpacing.lg)
            }
            .background(Color.vitalBackground)
            .navigationTitle("Estresse")
            .sheet(isPresented: $showBreathingExercise) {
                if let exercise = selectedExercise {
                    BreathingExerciseView(exercise: exercise)
                }
            }
        }
    }

    private func assessStress() async {
        isLoading = true
        defer { isLoading = false }

        guard let token = await AuthService.shared?.getAccessToken() else { return }

        let currentHRV = healthKitService.latestHRV ?? 35
        let avgHRV = 45.0
        let currentHR = healthKitService.latestHeartRate ?? 75
        let avgHR = 65.0

        do {
            let result = try await APIService.shared.assessStress(
                currentHRV: currentHRV,
                averageHRV: avgHRV,
                currentHR: currentHR,
                averageHR: avgHR,
                accessToken: token
            )
            stressScore = result.score
            stressLevel = result.level
            recommendation = result.recommendation
        } catch {
            print("[StressView] Assessment failed: \(error)")
        }
    }
}

// MARK: - Breathing Exercise Data

struct BreathingExercise: Identifiable {
    let id: String
    let name: String
    let description: String
    let durationSeconds: Int
    let inhale: Int
    let hold: Int
    let exhale: Int
    let holdAfter: Int
    let cycles: Int

    static let catalog: [BreathingExercise] = [
        BreathingExercise(
            id: "box_breathing",
            name: "Respiração Quadrada",
            description: "Inspire 4s, segure 4s, expire 4s, segure 4s",
            durationSeconds: 64,
            inhale: 4, hold: 4, exhale: 4, holdAfter: 4, cycles: 4
        ),
        BreathingExercise(
            id: "478_breathing",
            name: "Respiração 4-7-8",
            description: "Inspire 4s, segure 7s, expire 8s",
            durationSeconds: 57,
            inhale: 4, hold: 7, exhale: 8, holdAfter: 0, cycles: 3
        ),
        BreathingExercise(
            id: "coherent_breathing",
            name: "Respiração Coerente",
            description: "Inspire 5s, expire 5s. Ritmo constante",
            durationSeconds: 120,
            inhale: 5, hold: 0, exhale: 5, holdAfter: 0, cycles: 12
        ),
        BreathingExercise(
            id: "physiological_sigh",
            name: "Suspiro Fisiológico",
            description: "Inspire rápido 2x pelo nariz, expire longo pela boca",
            durationSeconds: 50,
            inhale: 2, hold: 0, exhale: 8, holdAfter: 0, cycles: 5
        ),
    ]
}

// MARK: - Exercise Card

private struct BreathingExerciseCard: View {
    let exercise: BreathingExercise
    let onTap: () -> Void

    var body: some View {
        VitalCard {
            Button(action: onTap) {
                HStack {
                    VStack(alignment: .leading, spacing: VitalSpacing.xs) {
                        Text(exercise.name)
                            .font(.vitalCaptionMedium)
                            .foregroundStyle(.primary)
                        Text(exercise.description)
                            .font(.vitalMicro)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    VStack {
                        Image(systemName: "wind")
                            .foregroundStyle(.vitalAccentBlue)
                        Text("\(exercise.durationSeconds)s")
                            .font(.vitalMicro)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .buttonStyle(.plain)
        }
    }
}
