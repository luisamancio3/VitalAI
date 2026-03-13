import SwiftUI

// Reference: design/screens/vitalai_splash_screen/screen.png

struct SplashView: View {
    var body: some View {
        ZStack {
            Color.vitalBackgroundDark
                .ignoresSafeArea()

            VStack(spacing: VitalSpacing.lg) {
                // TODO: Replace with actual VitalAI logo asset
                Image(systemName: "heart.circle.fill")
                    .resizable()
                    .frame(width: 80, height: 80)
                    .foregroundStyle(.vitalPrimary)

                Text("VitalAI")
                    .font(.vitalTitle)
                    .foregroundStyle(.white)

                Text("Seu coach de saúde proativo")
                    .font(.vitalCaption)
                    .foregroundStyle(.vitalSlate400)
            }
        }
    }
}
