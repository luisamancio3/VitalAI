import SwiftUI

struct VitalCard<Content: View>: View {
    let content: () -> Content

    init(@ViewBuilder content: @escaping () -> Content) {
        self.content = content
    }

    var body: some View {
        VStack(alignment: .leading, spacing: VitalSpacing.md) {
            content()
        }
        .padding(VitalSpacing.lg)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: VitalRadius.xl))
        .shadow(color: .black.opacity(0.04), radius: 2, x: 0, y: 1)
        .overlay(
            RoundedRectangle(cornerRadius: VitalRadius.xl)
                .strokeBorder(Color.vitalSlate100.opacity(0.5), lineWidth: 1)
        )
    }
}
