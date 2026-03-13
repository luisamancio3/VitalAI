import SwiftUI

struct OnboardingFlow: View {
    let onComplete: () -> Void
    @State private var currentSlide = 0
    @State private var showSignUp = false

    var body: some View {
        if showSignUp {
            SignUpView(onComplete: onComplete)
        } else {
            VStack(spacing: 0) {
                TabView(selection: $currentSlide) {
                    ForEach(onboardingSlides) { slide in
                        OnboardingSlideView(slide: slide)
                            .tag(slide.id)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .always))

                VStack(spacing: VitalSpacing.md) {
                    VitalButton(
                        title: currentSlide < onboardingSlides.count - 1 ? "Próximo" : "Começar",
                        variant: .primary
                    ) {
                        if currentSlide < onboardingSlides.count - 1 {
                            withAnimation {
                                currentSlide += 1
                            }
                        } else {
                            showSignUp = true
                        }
                    }

                    if currentSlide < onboardingSlides.count - 1 {
                        VitalButton(title: "Pular", variant: .ghost) {
                            showSignUp = true
                        }
                    }
                }
                .padding(.horizontal, VitalSpacing.lg)
                .padding(.bottom, VitalSpacing.xxl)
            }
            .background(Color.vitalBackground)
        }
    }
}
