import SwiftUI

struct OnboardingSlide: Identifiable {
    let id: Int
    let icon: String
    let title: String
    let description: String
    let buttonTitle: String
}

let onboardingSlides = [
    OnboardingSlide(
        id: 0,
        icon: "applewatch",
        title: "Seus dados de saúde, finalmente úteis",
        description: "VitalAI se conecta ao seu Apple Watch para coletar dados de saúde em tempo real.",
        buttonTitle: "Começar agora"
    ),
    OnboardingSlide(
        id: 1,
        icon: "brain.head.profile",
        title: "Você não precisa abrir o app",
        description: "Receba insights e sugestões baseados nos seus dados biométricos, sem precisar abrir o app.",
        buttonTitle: "Continuar"
    ),
    OnboardingSlide(
        id: 2,
        icon: "chart.bar.fill",
        title: "Seu coach de saúde pessoal",
        description: "Relatórios semanais com linguagem de coach, não de planilha.",
        buttonTitle: "Começar"
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
                    .font(.vitalTitle)
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
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            LinearGradient(
                colors: [.vitalOnboardingGradientTop, .white],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }
}
