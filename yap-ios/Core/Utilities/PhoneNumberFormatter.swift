import Foundation

enum PhoneNumberFormatter {
    static func normalize(_ value: String) -> String {
        let digits = value.replacingOccurrences(of: "\\D+", with: "", options: .regularExpression)
        guard !digits.isEmpty else { return "" }
        if digits.count == 10 { return "+1\(digits)" }
        if digits.count == 11, digits.hasPrefix("1") { return "+\(digits)" }
        return value.hasPrefix("+") ? value : "+\(digits)"
    }
}

