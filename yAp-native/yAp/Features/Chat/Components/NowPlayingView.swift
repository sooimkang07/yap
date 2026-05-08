import SwiftUI
import AVFoundation

struct NowPlayingView: View {
    let currentTopicTitle: String
    let currentSpeaker: String
    let speakerColor: Color
    let duration: TimeInterval
    let progress: Double
    let isPlaying: Bool

    let onPlayPause: () -> Void
    let onSkipNext: () -> Void
    let onSkipPrevious: () -> Void

    @State private var isCollapsed = false

    var formattedCurrentTime: String {
        let minutes = Int(duration * progress) / 60
        let seconds = Int(duration * progress) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    var formattedDuration: String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    var body: some View {
        VStack(spacing: 0) {
            if !isCollapsed {
                // Full Now Playing View
                VStack(spacing: YapTheme.Spacing.large) {
                    // Header with collapse button
                    HStack {
                        Button(action: {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                isCollapsed = true
                            }
                        }) {
                            Image(systemName: "chevron.down")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                        }

                        Spacer()

                        Text("Now Playing")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(YapTheme.ColorToken.textSecondary)

                        Spacer()

                        Color.clear.frame(width: 42)
                    }
                    .padding(.horizontal, YapTheme.Spacing.large)
                    .padding(.top, YapTheme.Spacing.large)

                    // Speaker info
                    VStack(spacing: YapTheme.Spacing.small) {
                        Circle()
                            .fill(speakerColor)
                            .frame(width: 60, height: 60)

                        Text(currentSpeaker)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(YapTheme.ColorToken.textSecondary)
                    }

                    // Title (with swipe animation effect)
                    Text(currentTopicTitle)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(YapTheme.ColorToken.textPrimary)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)

                    // Progress bar
                    VStack(spacing: 8) {
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(YapTheme.ColorToken.surface)

                                RoundedRectangle(cornerRadius: 4)
                                    .fill(speakerColor)
                                    .frame(width: geometry.size.width * progress)
                            }
                        }
                        .frame(height: 8)

                        HStack {
                            Text(formattedCurrentTime)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textTertiary)

                            Spacer()

                            Text(formattedDuration)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textTertiary)
                        }
                    }

                    // Playback controls
                    HStack(spacing: YapTheme.Spacing.xLarge) {
                        Button(action: onSkipPrevious) {
                            Image(systemName: "backward.fill")
                                .font(.system(size: 18))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                        }

                        Button(action: onPlayPause) {
                            Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.white)
                                .frame(width: 60, height: 60)
                                .background(Circle().fill(speakerColor))
                        }

                        Button(action: onSkipNext) {
                            Image(systemName: "forward.fill")
                                .font(.system(size: 18))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)
                        }
                    }
                }
                .padding(.vertical, YapTheme.Spacing.large)
            } else {
                // Collapsed pill view
                Button(action: {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        isCollapsed = false
                    }
                }) {
                    HStack(spacing: YapTheme.Spacing.medium) {
                        Button(action: onPlayPause) {
                            Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(width: 36, height: 36)
                                .background(Circle().fill(speakerColor))
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Now Playing")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textSecondary)

                            Text(currentTopicTitle)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(YapTheme.ColorToken.textPrimary)
                                .lineLimit(1)
                        }

                        Spacer()

                        Image(systemName: "chevron.up")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(YapTheme.ColorToken.textTertiary)
                    }
                    .padding(YapTheme.Spacing.medium)
                    .background(YapTheme.ColorToken.surfaceStrong)
                    .cornerRadius(YapTheme.Radius.pill)
                }
                .padding(YapTheme.Spacing.medium)
            }
        }
        .background(YapTheme.ColorToken.surface.opacity(0.8))
        .cornerRadius(isCollapsed ? YapTheme.Radius.pill : YapTheme.Radius.lg)
    }
}

#Preview {
    VStack {
        Spacer()

        NowPlayingView(
            currentTopicTitle: "Weekend plans discussion",
            currentSpeaker: "Sarah",
            speakerColor: YapTheme.ColorToken.colorSooim,
            duration: 120.0,
            progress: 0.35,
            isPlaying: true,
            onPlayPause: {},
            onSkipNext: {},
            onSkipPrevious: {}
        )
        .padding()
    }
    .background(YapScreenBackground())
}
