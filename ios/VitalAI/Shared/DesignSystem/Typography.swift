import SwiftUI

// Extracted from design/screens/vitalai_component_library/code.html
// Font: Inter (400, 500, 600, 700)
// Google Fonts: Inter:wght@400;500;600;700

extension Font {
    // MARK: - Display (headings)
    static let vitalTitle = Font.system(size: 24, weight: .bold)          // text-2xl font-bold
    static let vitalHeadline = Font.system(size: 20, weight: .bold)       // text-xl font-bold
    static let vitalSubheadline = Font.system(size: 18, weight: .semibold) // text-lg font-semibold

    // MARK: - Body
    static let vitalBody = Font.system(size: 16, weight: .regular)        // text-base
    static let vitalBodyMedium = Font.system(size: 16, weight: .medium)   // text-base font-medium
    static let vitalBodyBold = Font.system(size: 16, weight: .bold)       // text-base font-bold

    // MARK: - Small
    static let vitalCaption = Font.system(size: 14, weight: .regular)     // text-sm
    static let vitalCaptionMedium = Font.system(size: 14, weight: .medium) // text-sm font-medium
    static let vitalCaptionBold = Font.system(size: 14, weight: .semibold) // text-sm font-semibold

    // MARK: - Extra Small
    static let vitalMicro = Font.system(size: 12, weight: .regular)       // text-xs
    static let vitalMicroMedium = Font.system(size: 12, weight: .medium)  // text-xs font-medium
    static let vitalMicroBold = Font.system(size: 12, weight: .semibold)  // text-xs font-semibold

    // MARK: - Navigation (tab bar labels)
    static let vitalTabLabel = Font.system(size: 10, weight: .medium)     // text-[10px] font-medium
}
