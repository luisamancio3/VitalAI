import SwiftUI

struct OnboardingFlow: View {
    let onComplete: () -> Void
    var onShowLogin: (() -> Void)? = nil

    @State private var currentSlide = 0
    @State private var showSignUp = false

    var body: some View {
        if showSignUp {
            SignUpView(
                onComplete: onComplete,
                onShowLogin: { onShowLogin?() }
            )
        } else {
            VStack(spacing: 0) {
                TabView(selection: $currentSlide) {
                    ForEach(onboardingSlides) { slide in
                        OnboardingSlideView(slide: slide)
                            .tag(slide.id)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                VStack(spacing: VitalSpacing.lg) {
                    PageIndicator(
                        totalPages: onboardingSlides.count,
                        currentPage: currentSlide
                    )

                    VitalButton(
                        title: onboardingSlides[currentSlide].buttonTitle,
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

                    Button {
                        onShowLogin?()
                    } label: {
                        Text("Já tenho conta")
                            .font(.vitalCaptionMedium)
                            .foregroundStyle(.vitalAccentBlue)
                    }
                }
                .padding(.horizontal, VitalSpacing.lg)
                .padding(.bottom, VitalSpacing.xxl)
            }
            .background(Color.vitalBackground)
        }
    }
}
