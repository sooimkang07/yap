import SwiftUI

struct ProfileSetupView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var fallbackName = ""

    var body: some View {
        VStack(alignment: .leading, spacing: YapTheme.Spacing.large) {
            Text("Set up your profile.")
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundStyle(YapTheme.ColorToken.textPrimary)

            if !session.currentUser.displayName.isEmpty {
                Text("We pulled what we could from your iPhone profile. You can keep it or edit it.")
                    .font(.system(size: 18, weight: .medium, design: .rounded))
                    .foregroundStyle(YapTheme.ColorToken.textSecondary)
            } else {
                Text("We couldn’t find your phone profile yet, so add the name you want your friends to see.")
                    .font(.system(size: 18, weight: .medium, design: .rounded))
                    .foregroundStyle(YapTheme.ColorToken.textSecondary)
            }

            VStack(alignment: .leading, spacing: YapTheme.Spacing.medium) {
                TextField(
                    "Your name",
                    text: Binding(
                        get: { session.currentUser.displayName.isEmpty ? fallbackName : session.currentUser.displayName },
                        set: { newValue in
                            if session.currentUser.displayName.isEmpty {
                                fallbackName = newValue
                            } else {
                                session.currentUser.displayName = newValue
                            }
                        }
                    )
                )
                .padding()
                .background(YapTheme.ColorToken.surfaceStrong)
                .clipShape(RoundedRectangle(cornerRadius: YapTheme.Radius.medium, style: .continuous))

                Button("Continue") {
                    let resolved = session.currentUser.displayName.isEmpty ? fallbackName : session.currentUser.displayName
                    session.completeProfile(name: resolved)
                }
                .buttonStyle(.borderedProminent)
                .tint(YapTheme.ColorToken.accent)
                .controlSize(.large)
            }
            .yapCard()

            Spacer()
        }
        .padding(YapTheme.Spacing.xLarge)
    }
}

