import SwiftUI

struct ShadowDefinition {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat
}

enum YapTheme {
    enum ColorToken {
        // Background & Surfaces
        static let background = Color(red: 0.98, green: 0.97, blue: 0.95)
        static let surface = Color.white.opacity(0.8)
        static let surfaceStrong = Color.white.opacity(0.94)

        // Text Colors (Web: #111111, #6b6b6b, #aaaaaa)
        static let textPrimary = Color(red: 0.067, green: 0.067, blue: 0.067)     // #111111
        static let textSecondary = Color(red: 0.42, green: 0.42, blue: 0.42)      // #6b6b6b
        static let textTertiary = Color(red: 0.667, green: 0.667, blue: 0.667)    // #aaaaaa
        static let accent = Color(red: 0.15, green: 0.18, blue: 0.26)
        static let border = Color.black.opacity(0.06)

        // User Glow Colors
        static let colorSooim = Color(red: 0.722, green: 0.847, blue: 1.0)       // #B8D8FF
        static let colorChloe = Color(red: 0.871, green: 0.753, blue: 0.973)     // #DEC0F8
        static let colorMaria = Color(red: 1.0, green: 0.871, blue: 0.722)       // #FFDEB8
        static let colorLime = Color(red: 0.875, green: 1.0, blue: 0.722)        // #DFFFB8

        // Wave Colors
        static let waveActive = Color(red: 0.976, green: 0.471, blue: 0.471)     // #F97878
        static let waveStopped = Color(red: 0.541, green: 0.541, blue: 0.557)    // #8A8A8E

        // Glass Effect
        static let glass = Color.white.opacity(0.68)
        static let glassBorder = Color.white.opacity(0.88)

        // Success
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
        static let xs: CGFloat = 10      // Web: --r-sm
        static let sm: CGFloat = 14
        static let md: CGFloat = 18      // Web: --r-md
        static let lg: CGFloat = 24      // Web: --r-lg
        static let xl: CGFloat = 32      // Web: --r-xl
        static let medium: CGFloat = 20
        static let large: CGFloat = 28
        static let pill: CGFloat = 999
    }

    enum ShadowStyle {
        static let card = ShadowDefinition(color: Color.black.opacity(0.06), radius: 20, x: 0, y: 2)
        static let glass = ShadowDefinition(color: Color(red: 0.86, green: 0.867, blue: 0.902).opacity(0.24), radius: 28, x: 0, y: 10)
        static let sheet = ShadowDefinition(color: Color.black.opacity(0.12), radius: 48, x: 0, y: -8)
    }
}

struct YapScreenBackground: View {
    var body: some View {
        ZStack {
            // Base linear gradient
            LinearGradient(
                colors: [
                    Color(red: 0.992, green: 0.984, blue: 1.0),      // #fdfbff
                    Color(red: 1.0, green: 0.976, blue: 0.961),      // #fff9f5
                    Color(red: 0.965, green: 0.973, blue: 1.0),      // #f6f8ff
                    Color(red: 0.992, green: 0.984, blue: 1.0),      // #fdfbff
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            // Peach radial at top
            RadialGradient(
                gradient: Gradient(colors: [
                    Color(red: 1.0, green: 0.914, blue: 0.804).opacity(0.56),  // #FFE9CD @ 0.56
                    Color.clear
                ]),
                center: .top,
                startRadius: 0,
                endRadius: 400
            )

            // Blue radial at bottom left
            RadialGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.749, green: 0.867, blue: 1.0).opacity(0.44),  // #BFDDFF @ 0.44
                    Color.clear
                ]),
                center: UnitPoint(x: 0.1, y: 1.0),
                startRadius: 0,
                endRadius: 400
            )
        }
        .ignoresSafeArea()
    }
}

struct YapCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(YapTheme.Spacing.large)
            .background(YapTheme.ColorToken.surfaceStrong)
            .overlay(
                RoundedRectangle(cornerRadius: YapTheme.Radius.lg, style: .continuous)
                    .stroke(YapTheme.ColorToken.glassBorder, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: YapTheme.Radius.lg, style: .continuous))
            .shadow(color: Color.black.opacity(0.06), radius: 20, x: 0, y: 2)
    }
}

struct YapGlassButtonModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: YapTheme.Radius.pill, style: .continuous)
                    .fill(YapTheme.ColorToken.glass)
            )
            .overlay(
                RoundedRectangle(cornerRadius: YapTheme.Radius.pill, style: .continuous)
                    .stroke(YapTheme.ColorToken.glassBorder, lineWidth: 1)
            )
            .shadow(color: Color(red: 0.86, green: 0.867, blue: 0.902).opacity(0.24), radius: 28, x: 0, y: 10)
    }
}

extension View {
    func yapCard() -> some View {
        modifier(YapCardModifier())
    }

    func yapGlassButton() -> some View {
        modifier(YapGlassButtonModifier())
    }
}

