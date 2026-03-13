import SwiftUI

struct SplashView: View {
    var body: some View {
        ZStack {
            Color.vitalBackgroundDark
                .ignoresSafeArea()

            VStack(spacing: VitalSpacing.lg) {
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
