import SwiftUI

struct TopicCardView: View {
    let topicId: String
    let title: String
    let duration: TimeInterval
    let speakerName: String
    let speakerColor: Color
    let replyCount: Int
    let replyAvatarColors: [Color]
    let onPlay: () -> Void
    let onTap: () -> Void

    @State private var isExpanded = false

    var formattedDuration: String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Topic Card Header
            Button(action: onTap) {
                HStack(spacing: YapTheme.Spacing.medium) {
                    // Play Button
                    Button(action: onPlay) {
                        Image(systemName: "play.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 44, height: 44)
                            .background(Circle().fill(speakerColor))
                    }

                    // Topic Info
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(YapTheme.ColorToken.textPrimary)
                            .lineLimit(2)

                        HStack(spacing: 8) {
                            Text(speakerName)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)

                            Text("•")
                                .foregroundColor(YapTheme.ColorToken.textTertiary)

                            Text(formattedDuration)
                                .font(.system(size: 13))
                                .foregroundColor(YapTheme.ColorToken.textTertiary)
                        }
                    }

                    Spacer()

                    // Reply Summary
                    if replyCount > 0 {
                        VStack(alignment: .trailing, spacing: 4) {
                            HStack(spacing: -8) {
                                ForEach(Array(replyAvatarColors.prefix(3)), id: \.self) { color in
                                    Circle()
                                        .fill(color)
                                        .frame(width: 24, height: 24)
                                        .overlay(
                                            Circle()
                                                .stroke(Color.white, lineWidth: 1)
                                        )
                                }

                                if replyAvatarColors.count > 3 {
                                    Circle()
                                        .fill(YapTheme.ColorToken.surface)
                                        .frame(width: 24, height: 24)
                                        .overlay(
                                            Circle()
                                                .stroke(Color.white, lineWidth: 1)
                                        )
                                        .overlay(
                                            Text("+\(replyAvatarColors.count - 3)")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                                        )
                                }
                            }

                            Text("\(replyCount) \(replyCount == 1 ? "reply" : "replies")")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                        }
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(YapTheme.ColorToken.textTertiary)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                }
                .padding(YapTheme.Spacing.large)
            }
            .background(YapTheme.ColorToken.surfaceStrong)
            .cornerRadius(YapTheme.Radius.lg)

            // Expanded Replies Section
            if isExpanded && replyCount > 0 {
                VStack(spacing: YapTheme.Spacing.medium) {
                    Divider()
                        .opacity(0.1)
                        .padding(.horizontal, YapTheme.Spacing.large)

                    VStack(spacing: YapTheme.Spacing.small) {
                        // Mock replies - in full implementation, these would be real data
                        ForEach(0..<min(replyCount, 3), id: \.self) { _ in
                            HStack(spacing: YapTheme.Spacing.medium) {
                                Circle()
                                    .fill(Color.gray.opacity(0.3))
                                    .frame(width: 32, height: 32)

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Reply")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(YapTheme.ColorToken.textPrimary)

                                    Text("Replied to topic")
                                        .font(.system(size: 12))
                                        .foregroundColor(YapTheme.ColorToken.textTertiary)
                                }

                                Spacer()

                                Button(action: onPlay) {
                                    Image(systemName: "play.fill")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(YapTheme.ColorToken.textSecondary)
                                }
                            }
                            .padding(YapTheme.Spacing.medium)
                        }
                    }
                    .padding(YapTheme.Spacing.large)
                }
                .background(YapTheme.ColorToken.surface.opacity(0.5))
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .onTapGesture {
            withAnimation {
                isExpanded.toggle()
            }
        }
    }
}

#Preview {
    VStack(spacing: YapTheme.Spacing.medium) {
        TopicCardView(
            topicId: "1",
            title: "Weekend plans",
            duration: 45.5,
            speakerName: "Sarah",
            speakerColor: YapTheme.ColorToken.colorSooim,
            replyCount: 3,
            replyAvatarColors: [
                YapTheme.ColorToken.colorChloe,
                YapTheme.ColorToken.colorMaria,
                YapTheme.ColorToken.colorLime
            ],
            onPlay: {},
            onTap: {}
        )

        TopicCardView(
            topicId: "2",
            title: "Project update",
            duration: 120.0,
            speakerName: "Alex",
            speakerColor: YapTheme.ColorToken.colorChloe,
            replyCount: 0,
            replyAvatarColors: [],
            onPlay: {},
            onTap: {}
        )
    }
    .padding(YapTheme.Spacing.large)
    .background(YapScreenBackground())
}
