import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var sessionStore: SessionStore
    @State private var displayName: String = ""
    @State private var showSignOutConfirm = false

    var body: some View {
        ZStack {
            YapScreenBackground()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(YapTheme.ColorToken.textSecondary)
                    }
                    Spacer()
                    Text("Settings")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(YapTheme.ColorToken.textPrimary)
                    Spacer()
                    Color.clear.frame(width: 42)
                }
                .padding(.horizontal, YapTheme.Spacing.large)
                .padding(.vertical, YapTheme.Spacing.medium)

                Divider()
                    .opacity(0.1)

                ScrollView {
                    VStack(spacing: YapTheme.Spacing.large) {
                        // Profile Section
                        VStack(alignment: .leading, spacing: YapTheme.Spacing.medium) {
                            Text("Profile")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                                .textCase(.uppercase)
                                .padding(.horizontal, YapTheme.Spacing.large)

                            VStack(spacing: YapTheme.Spacing.medium) {
                                // Display Name
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Display Name")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(YapTheme.ColorToken.textSecondary)

                                    TextField("Your name", text: $displayName)
                                        .font(.system(size: 16))
                                        .foregroundColor(YapTheme.ColorToken.textPrimary)
                                        .padding(YapTheme.Spacing.medium)
                                        .background(Color.white.opacity(0.6))
                                        .cornerRadius(YapTheme.Radius.md)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: YapTheme.Radius.md)
                                                .stroke(YapTheme.ColorToken.border, lineWidth: 1)
                                        )
                                }
                                .padding(YapTheme.Spacing.large)
                            }
                            .background(YapTheme.ColorToken.surfaceStrong)
                            .cornerRadius(YapTheme.Radius.lg)
                        }

                        // Preferences Section
                        VStack(alignment: .leading, spacing: YapTheme.Spacing.medium) {
                            Text("Preferences")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                                .textCase(.uppercase)
                                .padding(.horizontal, YapTheme.Spacing.large)

                            VStack(spacing: 0) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Notifications")
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundColor(YapTheme.ColorToken.textPrimary)
                                        Text("Sound & haptics")
                                            .font(.system(size: 13))
                                            .foregroundColor(YapTheme.ColorToken.textTertiary)
                                    }
                                    Spacer()
                                    Toggle("", isOn: .constant(true))
                                        .tint(YapTheme.ColorToken.success)
                                }
                                .padding(YapTheme.Spacing.large)

                                Divider()
                                    .opacity(0.1)
                                    .padding(.horizontal, YapTheme.Spacing.large)

                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Message Previews")
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundColor(YapTheme.ColorToken.textPrimary)
                                        Text("Show in notifications")
                                            .font(.system(size: 13))
                                            .foregroundColor(YapTheme.ColorToken.textTertiary)
                                    }
                                    Spacer()
                                    Toggle("", isOn: .constant(true))
                                        .tint(YapTheme.ColorToken.success)
                                }
                                .padding(YapTheme.Spacing.large)
                            }
                            .background(YapTheme.ColorToken.surfaceStrong)
                            .cornerRadius(YapTheme.Radius.lg)
                        }

                        // Account Section
                        VStack(alignment: .leading, spacing: YapTheme.Spacing.medium) {
                            Text("Account")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                                .textCase(.uppercase)
                                .padding(.horizontal, YapTheme.Spacing.large)

                            Button(action: { showSignOutConfirm = true }) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Sign Out")
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundColor(Color.red)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(YapTheme.ColorToken.textTertiary)
                                }
                                .padding(YapTheme.Spacing.large)
                            }
                            .background(YapTheme.ColorToken.surfaceStrong)
                            .cornerRadius(YapTheme.Radius.lg)
                        }

                        Spacer()
                    }
                    .padding(.vertical, YapTheme.Spacing.large)
                    .padding(.horizontal, YapTheme.Spacing.medium)
                }
            }
        }
        .alert("Sign Out", isPresented: $showSignOutConfirm) {
            Button("Cancel", role: .cancel) { }
            Button("Sign Out", role: .destructive) {
                // TODO: Implement sign out
            }
        } message: {
            Text("Are you sure you want to sign out?")
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(SessionStore())
}
