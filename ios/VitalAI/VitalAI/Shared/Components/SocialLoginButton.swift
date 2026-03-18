import SwiftUI

enum SocialLoginProvider {
    case apple
    case google
}

struct SocialLoginButton: View {
    let provider: SocialLoginProvider
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: VitalSpacing.sm) {
                providerIcon
                Text(providerLabel)
                    .font(.system(size: 16, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .frame(height: VitalButtonHeight.large)
            .foregroundStyle(foregroundColor)
            .background(backgroundColor)
            .overlay(border)
            .clipShape(RoundedRectangle(cornerRadius: VitalRadius.xl))
        }
    }

    @ViewBuilder
    private var providerIcon: some View {
        switch provider {
        case .apple:
            Image(systemName: "apple.logo")
                .font(.system(size: 18, weight: .medium))
        case .google:
            Text("G")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.red, .yellow, .green, .blue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        }
    }

    private var providerLabel: String {
        switch provider {
        case .apple: return "Continuar com Apple"
        case .google: return "Continuar com Google"
        }
    }

    private var foregroundColor: Color {
        switch provider {
        case .apple: return Color(.systemBackground)
        case .google: return .vitalSlate800
        }
    }

    private var backgroundColor: Color {
        switch provider {
        case .apple: return Color(.label)
        case .google: return Color(.systemBackground)
        }
    }

    @ViewBuilder
    private var border: some View {
        switch provider {
        case .apple:
            EmptyView()
        case .google:
            RoundedRectangle(cornerRadius: VitalRadius.xl)
                .strokeBorder(Color.vitalSlate200, lineWidth: 1)
        }
    }
}
