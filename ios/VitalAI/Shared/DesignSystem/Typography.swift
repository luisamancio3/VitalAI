import SwiftUI

// Extracted from design/screens/vitalai_component_library/code.html
// Font: Inter (400, 500, 600, 700)

extension Font {
    // MARK: - Display (headings)
    static let vitalTitle = Font.system(size: 24, weight: .bold)
    static let vitalHeadline = Font.system(size: 20, weight: .bold)
    static let vitalSubheadline = Font.system(size: 18, weight: .semibold)

    // MARK: - Body
    static let vitalBody = Font.system(size: 16, weight: .regular)
    static let vitalBodyMedium = Font.system(size: 16, weight: .medium)
    static let vitalBodyBold = Font.system(size: 16, weight: .bold)

    // MARK: - Small
    static let vitalCaption = Font.system(size: 14, weight: .regular)
    static let vitalCaptionMedium = Font.system(size: 14, weight: .medium)
    static let vitalCaptionBold = Font.system(size: 14, weight: .semibold)

    // MARK: - Extra Small
    static let vitalMicro = Font.system(size: 12, weight: .regular)
    static let vitalMicroMedium = Font.system(size: 12, weight: .medium)
    static let vitalMicroBold = Font.system(size: 12, weight: .semibold)

    // MARK: - Navigation (tab bar labels)
    static let vitalTabLabel = Font.system(size: 10, weight: .medium)
}
