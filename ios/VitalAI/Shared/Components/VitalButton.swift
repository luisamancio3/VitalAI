import SwiftUI

enum VitalButtonVariant {
    case primary
    case secondary
    case ghost
}

enum VitalButtonSize {
    case large, medium, small

    var height: CGFloat {
        switch self {
        case .large: return 48
        case .medium: return 40
        case .small: return 32
        }
    }

    var font: Font {
        switch self {
        case .large: return .system(size: 16, weight: .bold)
        case .medium, .small: return .system(size: 14, weight: .semibold)
        }
    }

    var horizontalPadding: CGFloat {
        switch self {
        case .large: return 24
        case .medium: return 20
        case .small: return 16
        }
    }

    var cornerRadius: CGFloat {
        switch self {
        case .large: return VitalRadius.xl
        case .medium, .small: return VitalRadius.lg
        }
    }
}

struct VitalButton: View {
    let title: String
    let variant: VitalButtonVariant
    var size: VitalButtonSize = .large
    var isDisabled: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(size.font)
                .frame(maxWidth: .infinity)
                .frame(height: size.height)
                .padding(.horizontal, size.horizontalPadding)
                .foregroundStyle(foregroundColor)
                .background(backgroundColor)
                .overlay(border)
                .clipShape(RoundedRectangle(cornerRadius: size.cornerRadius))
        }
        .disabled(isDisabled)
    }

    private var foregroundColor: Color {
        if isDisabled { return .vitalSlate400 }
        switch variant {
        case .primary: return .white
        case .secondary, .ghost: return .vitalPrimary
        }
    }

    private var backgroundColor: Color {
        if isDisabled { return .vitalSlate200 }
        switch variant {
        case .primary: return .vitalPrimary
        case .secondary, .ghost: return .clear
        }
    }

    @ViewBuilder
    private var border: some View {
        if variant == .secondary && !isDisabled {
            RoundedRectangle(cornerRadius: size.cornerRadius)
                .strokeBorder(Color.vitalPrimary, lineWidth: 2)
        }
    }
}
