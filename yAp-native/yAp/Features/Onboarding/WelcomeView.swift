import SwiftUI

struct WelcomeView: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        VStack(alignment: .leading, spacing: YapTheme.Spacing.large) {
            Spacer()

            Text("yAp")
                .font(.system(size: 22, weight: .semibold, design: .rounded))
                .foregroundStyle(YapTheme.ColorToken.textSecondary)

            Text("Voice-first group chat.")
                .font(.system(size: 52, weight: .bold, design: .rounded))
                .foregroundStyle(YapTheme.ColorToken.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            Text("Talk naturally, keep the structure, and move the real iPhone app to center stage.")
                .font(.system(size: 20, weight: .medium, design: .rounded))
                .foregroundStyle(YapTheme.ColorToken.textSecondary)

            Spacer()

            Button("Get Started") {
                session.beginPhoneAuth()
            }
            .buttonStyle(.borderedProminent)
            .tint(YapTheme.ColorToken.accent)
            .controlSize(.large)
        }
        .padding(YapTheme.Spacing.xLarge)
    }
}

