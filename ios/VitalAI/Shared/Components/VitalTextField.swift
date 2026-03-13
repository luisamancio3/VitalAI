import SwiftUI

// Extracted from design/screens/vitalai_component_library/code.html
// States: Default, Focused, Error, Disabled, With Icon

struct VitalTextField: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var icon: String? = nil  // SF Symbol name
    var errorMessage: String? = nil
    var isDisabled: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.vitalCaptionMedium)

            HStack(spacing: 8) {
                if let icon {
                    Image(systemName: icon)
                        .foregroundStyle(.vitalSlate400)
                }

                TextField(placeholder, text: $text)
                    .disabled(isDisabled)
            }
            .padding(.horizontal, VitalSpacing.lg)
            .padding(.vertical, 12)
            .background(isDisabled ? Color.vitalSlate100 : Color.clear)
            .overlay(
                RoundedRectangle(cornerRadius: VitalRadius.sm)
                    .strokeBorder(borderColor, lineWidth: errorMessage != nil ? 1 : 1)
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
        if let _ = errorMessage { return .vitalError }
        if isDisabled { return .vitalSlate200 }
        return .vitalSlate200
    }
}
