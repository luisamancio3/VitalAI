import SwiftUI

// Spacing scale derived from Tailwind defaults used across all 49 design screens
// Consistent with: p-4 (16), gap-3 (12), gap-2 (8), gap-1 (4), etc.

enum VitalSpacing {
    static let xs: CGFloat = 4    // gap-1, p-1
    static let sm: CGFloat = 8    // gap-2, p-2
    static let md: CGFloat = 12   // gap-3, p-3
    static let lg: CGFloat = 16   // gap-4, p-4 (most common padding)
    static let xl: CGFloat = 24   // gap-6, p-6
    static let xxl: CGFloat = 32  // gap-8, p-8
}

enum VitalRadius {
    static let sm: CGFloat = 8    // rounded (0.5rem)
    static let md: CGFloat = 12   // rounded-lg (between defaults)
    static let lg: CGFloat = 16   // rounded-xl (1rem)
    static let xl: CGFloat = 24   // rounded-xl (1.5rem)
    static let full: CGFloat = 9999 // rounded-full
}

// Button heights from component library
enum VitalButtonHeight {
    static let large: CGFloat = 48   // h-[48px]
    static let medium: CGFloat = 40  // h-[40px]
    static let small: CGFloat = 32   // h-[32px]
}
