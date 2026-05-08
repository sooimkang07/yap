import SwiftUI

struct UserProfileView: View {
    @Environment(\.dismiss) var dismiss
    @State private var displayName: String = "Sarah"
    @State private var phoneNumber: String = "+1 (555) 123-4567"

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
                    Text("Profile")
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
                        // Avatar
                        VStack(spacing: YapTheme.Spacing.medium) {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            YapTheme.ColorToken.colorSooim,
                                            YapTheme.ColorToken.colorChloe,
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 100, height: 100)
                                .overlay(
                                    Circle()
                                        .stroke(YapTheme.ColorToken.surface, lineWidth: 4)
                                )

                            Button(action: {}) {
                                Text("Change Avatar")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(YapTheme.ColorToken.accent)
                            }
                        }

                        // Profile Info
                        VStack(alignment: .leading, spacing: YapTheme.Spacing.medium) {
                            Text("Profile Information")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                                .textCase(.uppercase)
                                .padding(.horizontal, YapTheme.Spacing.large)

                            VStack(spacing: YapTheme.Spacing.medium) {
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

                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Phone Number")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(YapTheme.ColorToken.textSecondary)

                                    Text(phoneNumber)
                                        .font(.system(size: 16))
                                        .foregroundColor(YapTheme.ColorToken.textSecondary)
                                        .padding(YapTheme.Spacing.medium)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .background(Color.white.opacity(0.4))
                                        .cornerRadius(YapTheme.Radius.md)
                                }
                            }
                            .padding(YapTheme.Spacing.large)
                        }

                        // Groups Section
                        VStack(alignment: .leading, spacing: YapTheme.Spacing.medium) {
                            Text("Your Groups")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                                .textCase(.uppercase)
                                .padding(.horizontal, YapTheme.Spacing.large)

                            VStack(spacing: 0) {
                                ForEach(["Besties", "Work Squad", "Family"], id: \.self) { group in
                                    HStack {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(group)
                                                .font(.system(size: 16, weight: .semibold))
                                                .foregroundColor(YapTheme.ColorToken.textPrimary)

                                            Text("3 members")
                                                .font(.system(size: 13))
                                                .foregroundColor(YapTheme.ColorToken.textTertiary)
                                        }

                                        Spacer()

                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundColor(YapTheme.ColorToken.textTertiary)
                                    }
                                    .padding(YapTheme.Spacing.large)

                                    if group != "Family" {
                                        Divider()
                                            .opacity(0.1)
                                            .padding(.horizontal, YapTheme.Spacing.large)
                                    }
                                }
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
    }
}

#Preview {
    UserProfileView()
}
