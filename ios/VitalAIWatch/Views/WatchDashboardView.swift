import SwiftUI

// Reference: design/screens/generated_screen_5,8,9/screen.png (Apple Watch faces)

struct WatchDashboardView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // Health Score
                Text("78")
                    .font(.system(size: 44, weight: .bold))
                    .foregroundStyle(Color(hex: "2bd4a7"))

                Text("Health Score")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Divider()

                // Quick stats
                HStack {
                    VStack {
                        Image(systemName: "heart.fill")
                            .foregroundStyle(.red)
                        Text("72")
                            .font(.caption)
                            .bold()
                        Text("BPM")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }

                    VStack {
                        Image(systemName: "bed.double.fill")
                            .foregroundStyle(.indigo)
                        Text("7.5h")
                            .font(.caption)
                            .bold()
                        Text("Sono")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding()
        }
    }
}
