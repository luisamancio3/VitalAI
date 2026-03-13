import SwiftUI

// Extracted from design/screens/vitalai_component_library/code.html
// Tailwind config: primary: "#2bd4a7", background-light: "#f6f8f7", background-dark: "#12201c"

extension Color {
    // MARK: - Brand Colors
    static let vitalPrimary = Color(hex: "2bd4a7")       // Teal — primary CTA, active states
    static let vitalBackground = Color(hex: "f6f8f7")    // Light background
    static let vitalBackgroundDark = Color(hex: "12201c") // Dark mode background

    // MARK: - Semantic Colors
    static let vitalError = Color(hex: "ef4444")          // red-500
    static let vitalWarning = Color(hex: "f59e0b")        // amber-500
    static let vitalSuccess = Color(hex: "22c55e")        // green-500

    // MARK: - Macro Colors (from Macro Pills component)
    static let macroProtein = Color(hex: "dc2626")        // red-600
    static let macroCarbs = Color(hex: "d97706")          // amber-600
    static let macroFat = Color(hex: "2563eb")            // blue-600
    static let macroCalories = Color(hex: "059669")       // emerald-600

    // MARK: - Neutral (Slate scale)
    static let vitalSlate100 = Color(hex: "f1f5f9")
    static let vitalSlate200 = Color(hex: "e2e8f0")
    static let vitalSlate300 = Color(hex: "cbd5e1")
    static let vitalSlate400 = Color(hex: "94a3b8")
    static let vitalSlate500 = Color(hex: "64748b")
    static let vitalSlate600 = Color(hex: "475569")
    static let vitalSlate800 = Color(hex: "1e293b")
    static let vitalSlate900 = Color(hex: "0f172a")

    // MARK: - Star Rating
    static let vitalStar = Color(hex: "fbbf24")           // amber-400
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
