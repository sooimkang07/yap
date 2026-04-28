import SwiftUI

enum YapTheme {
    enum ColorToken {
        static let background = Color(red: 0.98, green: 0.97, blue: 0.95)
        static let surface = Color.white.opacity(0.8)
        static let surfaceStrong = Color.white.opacity(0.94)
        static let textPrimary = Color(red: 0.09, green: 0.1, blue: 0.16)
        static let textSecondary = Color(red: 0.38, green: 0.42, blue: 0.53)
        static let accent = Color(red: 0.15, green: 0.18, blue: 0.26)
        static let border = Color.black.opacity(0.06)
        static let success = Color(red: 0.36, green: 0.66, blue: 0.49)
    }

    enum Spacing {
        static let xSmall: CGFloat = 8
        static let small: CGFloat = 12
        static let medium: CGFloat = 16
        static let large: CGFloat = 20
        static let xLarge: CGFloat = 28
    }

    enum Radius {
        static let small: CGFloat = 14
        static let medium: CGFloat = 20
        static let large: CGFloat = 28
        static let pill: CGFloat = 999
    }
}

struct YapScreenBackground: View {
    var body: some View {
        LinearGradient(
            colors: [
                Color(red: 0.91, green: 0.94, blue: 1.0),
                Color(red: 0.99, green: 0.98, blue: 0.96),
                Color.white
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
}

struct YapCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(YapTheme.Spacing.large)
            .background(YapTheme.ColorToken.surfaceStrong)
            .overlay(
                RoundedRectangle(cornerRadius: YapTheme.Radius.large, style: .continuous)
                    .stroke(YapTheme.ColorToken.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: YapTheme.Radius.large, style: .continuous))
            .shadow(color: .black.opacity(0.05), radius: 20, y: 10)
    }
}

extension View {
    func yapCard() -> some View {
        modifier(YapCardModifier())
    }
}

