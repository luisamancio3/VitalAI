import SwiftUI

struct VitalTextField: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var icon: String? = nil
    var isSecure: Bool = false
    var errorMessage: String? = nil
    var isDisabled: Bool = false

    @State private var isPasswordVisible = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.vitalCaptionMedium)

            HStack(spacing: 8) {
                if let icon {
                    Image(systemName: icon)
                        .foregroundStyle(.vitalSlate400)
                }

                if isSecure && !isPasswordVisible {
                    SecureField(placeholder, text: $text)
                        .disabled(isDisabled)
                } else {
                    TextField(placeholder, text: $text)
                        .disabled(isDisabled)
                }

                if isSecure {
                    Button {
                        isPasswordVisible.toggle()
                    } label: {
                        Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                            .foregroundStyle(.vitalSlate400)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, VitalSpacing.lg)
            .padding(.vertical, 12)
            .background(isDisabled ? Color.vitalSlate100 : Color.clear)
            .overlay(
                RoundedRectangle(cornerRadius: VitalRadius.sm)
                    .strokeBorder(borderColor, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: VitalRadius.sm))

            if let errorMessage {
                Text(errorMessage)
                    .font(.vitalMicro)
                    .foregroundStyle(.vitalError)
            }
        }
    }

    private var borderColor: Color {
        if errorMessage != nil { return .vitalError }
        if isDisabled { return .vitalSlate200 }
        return .vitalSlate200
    }
}
