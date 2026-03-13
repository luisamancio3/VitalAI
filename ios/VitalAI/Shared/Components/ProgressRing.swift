import SwiftUI

// Extracted from design/screens/vitalai_component_library/code.html
// SVG circular progress: stroke-dasharray="100" stroke-dashoffset for percentage

struct ProgressRing: View {
    let progress: Double     // 0.0 to 1.0
    let label: String
    var size: CGFloat = 80   // size-20 = 80px
    var lineWidth: CGFloat = 6
    var color: Color = .vitalPrimary

    var body: some View {
        ZStack {
            // Background circle
            Circle()
                .stroke(Color.vitalSlate200, lineWidth: lineWidth)

            // Progress arc
            Circle()
                .trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.5), value: progress)

            // Center label
            Text(label)
                .font(.vitalMicroBold)
        }
        .frame(width: size, height: size)
    }
}
