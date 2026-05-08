import SwiftUI

struct GroupSettingsView: View {
    @Environment(\.dismiss) var dismiss
    @State private var groupName: String = "Besties"
    @State private var groupDescription: String = "Our close friend group"
    @State private var showDeleteConfirm = false

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
                    Text("Group Settings")
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
                        // Group Info Section
                        VStack(alignment: .leading, spacing: YapTheme.Spacing.medium) {
                            Text("Group Info")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                                .textCase(.uppercase)
                                .padding(.horizontal, YapTheme.Spacing.large)

                            VStack(spacing: YapTheme.Spacing.medium) {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Group Name")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(YapTheme.ColorToken.textSecondary)

                                    TextField("Name", text: $groupName)
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
                                    Text("Description")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(YapTheme.ColorToken.textSecondary)

                                    TextEditor(text: $groupDescription)
                                        .font(.system(size: 16))
                                        .foregroundColor(YapTheme.ColorToken.textPrimary)
                                        .frame(height: 100)
                                        .padding(YapTheme.Spacing.small)
                                        .background(Color.white.opacity(0.6))
                                        .cornerRadius(YapTheme.Radius.md)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: YapTheme.Radius.md)
                                                .stroke(YapTheme.ColorToken.border, lineWidth: 1)
                                        )
                                }
                            }
                            .padding(YapTheme.Spacing.large)
                        }

                        // Members Section
                        VStack(alignment: .leading, spacing: YapTheme.Spacing.medium) {
                            Text("Members")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                                .textCase(.uppercase)
                                .padding(.horizontal, YapTheme.Spacing.large)

                            VStack(spacing: 0) {
                                ForEach(["Sarah", "Alex", "Jamie"], id: \.self) { member in
                                    HStack {
                                        Circle()
                                            .fill(Color.gray.opacity(0.3))
                                            .frame(width: 40, height: 40)

                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(member)
                                                .font(.system(size: 16, weight: .semibold))
                                                .foregroundColor(YapTheme.ColorToken.textPrimary)

                                            Text("@\(member.lowercased())")
                                                .font(.system(size: 13))
                                                .foregroundColor(YapTheme.ColorToken.textTertiary)
                                        }

                                        Spacer()

                                        Button(action: {}) {
                                            Image(systemName: "ellipsis")
                                                .font(.system(size: 14, weight: .semibold))
                                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                                        }
                                    }
                                    .padding(YapTheme.Spacing.large)

                                    if member != "Jamie" {
                                        Divider()
                                            .opacity(0.1)
                                            .padding(.horizontal, YapTheme.Spacing.large)
                                    }
                                }

                                HStack {
                                    Image(systemName: "plus.circle.fill")
                                        .font(.system(size: 16))
                                        .foregroundColor(YapTheme.ColorToken.accent)

                                    Text("Add Member")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(YapTheme.ColorToken.accent)

                                    Spacer()
                                }
                                .padding(YapTheme.Spacing.large)
                            }
                            .background(YapTheme.ColorToken.surfaceStrong)
                            .cornerRadius(YapTheme.Radius.lg)
                        }

                        // Danger Zone
                        VStack(alignment: .leading, spacing: YapTheme.Spacing.medium) {
                            Text("Danger Zone")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(Color.red)
                                .textCase(.uppercase)
                                .padding(.horizontal, YapTheme.Spacing.large)

                            Button(action: { showDeleteConfirm = true }) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Delete Group")
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundColor(Color.red)
                                        Text("This cannot be undone")
                                            .font(.system(size: 13))
                                            .foregroundColor(Color.red.opacity(0.7))
                                    }
                                    Spacer()
                                    Image(systemName: "trash")
                                        .font(.system(size: 16))
                                        .foregroundColor(Color.red)
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
        .alert("Delete Group", isPresented: $showDeleteConfirm) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                // TODO: Implement group deletion
            }
        } message: {
            Text("Are you sure you want to delete this group? This cannot be undone.")
        }
    }
}

#Preview {
    GroupSettingsView()
}
