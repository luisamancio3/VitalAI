import SwiftUI

struct OnboardingSlide: Identifiable {
    let id: Int
    let icon: String
    let title: String
    let description: String
}

let onboardingSlides = [
    OnboardingSlide(
        id: 0,
        icon: "applewatch",
        title: "Dados do seu smartwatch",
        description: "VitalAI se conecta ao seu Apple Watch para coletar dados de saúde em tempo real."
    ),
    OnboardingSlide(
        id: 1,
        icon: "brain.head.profile",
        title: "Coach de IA personalizado",
        description: "Receba insights e sugestões baseados nos seus dados biométricos, sem precisar abrir o app."
    ),
    OnboardingSlide(
        id: 2,
        icon: "chart.bar.fill",
        title: "Relatórios detalhados",
        description: "Acompanhe seu progresso com relatórios semanais e mensais gerados por inteligência artificial."
    ),
]

struct OnboardingSlideView: View {
    let slide: OnboardingSlide

    var body: some View {
        VStack(spacing: VitalSpacing.xxl) {
            Spacer()

            Image(systemName: slide.icon)
                .resizable()
                .scaledToFit()
                .frame(width: 120, height: 120)
                .foregroundStyle(.vitalPrimary)

            VStack(spacing: VitalSpacing.sm) {
                Text(slide.title)
                    .font(.vitalHeadline)
                    .multilineTextAlignment(.center)

                Text(slide.description)
                    .font(.vitalCaption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, VitalSpacing.xl)
            }

            Spacer()
            Spacer()
        }
    }
}
