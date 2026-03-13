import SwiftUI

struct ProgressRing: View {
    let progress: Double
    let label: String
    var size: CGFloat = 80
    var lineWidth: CGFloat = 6
    var color: Color = .vitalPrimary

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.vitalSlate200, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.5), value: progress)
            Text(label)
                .font(.vitalMicroBold)
        }
        .frame(width: size, height: size)
    }
}
