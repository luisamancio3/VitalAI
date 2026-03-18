import SwiftUI

// TODO: Connect to WatchConnectivity session to receive health data from the paired iPhone
// All values below are placeholders until the WatchConnectivity bridge is implemented

struct WatchDashboardView: View {
    @State private var healthScore: Int = 0
    @State private var heartRate: Int = 0
    @State private var sleepHours: Double = 0

    private var hasData: Bool {
        healthScore > 0 || heartRate > 0 || sleepHours > 0
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                if hasData {
                    // Health Score
                    Text("\(healthScore)")
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
                            Text("\(heartRate)")
                                .font(.caption)
                                .bold()
                            Text("BPM")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }

                        VStack {
                            Image(systemName: "bed.double.fill")
                                .foregroundStyle(.indigo)
                            Text(String(format: "%.1fh", sleepHours))
                                .font(.caption)
                                .bold()
                            Text("Sono")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                } else {
                    Text("Conecte o iPhone para ver seus dados")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            .padding()
        }
    }
}
