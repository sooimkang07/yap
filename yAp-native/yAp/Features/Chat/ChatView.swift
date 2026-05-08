import SwiftUI

struct ChatView: View {
    let chat: ChatSummary

    @StateObject private var recordingService = RecordingService()
    @State private var errorMessage: String?
    @State private var showRecordingError = false
    @State private var isRecording = false
    @State private var showNowPlaying = false
    @State private var currentlyPlayingId: String?
    @State private var selectedTopicId: String?
    @State private var isLoading = true

    @State private var topicCards: [MockTopic] = []
    private let chatService = ChatService()
    private let speakerColors = [
        YapTheme.ColorToken.colorSooim,
        YapTheme.ColorToken.colorChloe,
        YapTheme.ColorToken.colorMaria,
        YapTheme.ColorToken.colorLime,
    ]

    var hasTopics: Bool {
        !topicCards.isEmpty
    }

    var body: some View {
        ZStack {
            YapScreenBackground()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Text(chat.title)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(YapTheme.ColorToken.textPrimary)

                    Spacer()

                    Button(action: {}) {
                        Image(systemName: "info.circle")
                            .font(.system(size: 16))
                            .foregroundColor(YapTheme.ColorToken.textSecondary)
                    }
                }
                .padding(.horizontal, YapTheme.Spacing.large)
                .padding(.vertical, YapTheme.Spacing.medium)

                Divider()
                    .opacity(0.1)

                // Chat Content
                ZStack {
                    if !hasTopics {
                        // Empty State
                        VStack(spacing: YapTheme.Spacing.large) {
                            Spacer()

                            VStack(spacing: YapTheme.Spacing.medium) {
                                Text("No memos yet")
                                    .font(.system(size: 20, weight: .semibold))
                                    .foregroundColor(YapTheme.ColorToken.textPrimary)

                                Text("Record a voice memo to start")
                                    .font(.system(size: 15))
                                    .foregroundColor(YapTheme.ColorToken.textSecondary)
                            }

                            // Floating member avatars
                            HStack(spacing: -12) {
                                ForEach(0..<min(3, chat.memberCount), id: \.self) { index in
                                    let colors = [
                                        YapTheme.ColorToken.colorSooim,
                                        YapTheme.ColorToken.colorChloe,
                                        YapTheme.ColorToken.colorMaria,
                                        YapTheme.ColorToken.colorLime
                                    ]
                                    Circle()
                                        .fill(colors[index % colors.count])
                                        .frame(width: 48, height: 48)
                                        .overlay(
                                            Circle()
                                                .stroke(YapTheme.ColorToken.surface, lineWidth: 2)
                                        )
                                }
                            }

                            Spacer()
                        }
                        .frame(maxWidth: .infinity)
                    } else {
                        // Topic Cards List
                        ScrollView {
                            VStack(spacing: 6) {
                                ForEach(topicCards, id: \.id) { topic in
                                    TopicCardView(
                                        topicId: topic.id,
                                        title: topic.title,
                                        duration: topic.duration,
                                        speakerName: topic.speaker,
                                        speakerColor: topic.speakerColor,
                                        replyCount: topic.replyCount,
                                        replyAvatarColors: Array(repeating: topic.speakerColor, count: topic.replyCount),
                                        onPlay: {
                                            withAnimation {
                                                currentlyPlayingId = topic.id
                                                showNowPlaying = true
                                            }
                                        },
                                        onTap: {
                                            selectedTopicId = topic.id
                                        }
                                    )
                                }
                            }
                            .padding(YapTheme.Spacing.medium)
                        }
                    }
                }

                Spacer()

                // Recording Controls
                VStack(spacing: YapTheme.Spacing.medium) {
                    if showNowPlaying && currentlyPlayingId != nil {
                        NowPlayingView(
                            currentTopicTitle: topicCards.first(where: { $0.id == currentlyPlayingId })?.title ?? "Playing",
                            currentSpeaker: topicCards.first(where: { $0.id == currentlyPlayingId })?.speaker ?? "Unknown",
                            speakerColor: topicCards.first(where: { $0.id == currentlyPlayingId })?.speakerColor ?? .gray,
                            duration: topicCards.first(where: { $0.id == currentlyPlayingId })?.duration ?? 0,
                            progress: 0.35,
                            isPlaying: true,
                            onPlayPause: {},
                            onSkipNext: {
                                if let currentIndex = topicCards.firstIndex(where: { $0.id == currentlyPlayingId }),
                                   currentIndex + 1 < topicCards.count {
                                    currentlyPlayingId = topicCards[currentIndex + 1].id
                                }
                            },
                            onSkipPrevious: {
                                if let currentIndex = topicCards.firstIndex(where: { $0.id == currentlyPlayingId }),
                                   currentIndex > 0 {
                                    currentlyPlayingId = topicCards[currentIndex - 1].id
                                }
                            }
                        )
                    }

                    Button {
                        Task {
                            await startRecording()
                        }
                    } label: {
                        HStack(spacing: YapTheme.Spacing.medium) {
                            Image(systemName: "mic.fill")
                                .font(.system(size: 16, weight: .semibold))

                            Text(isRecording ? "Recording..." : "Record Memo")
                                .font(.system(size: 16, weight: .semibold))

                            Spacer()
                        }
                        .frame(maxWidth: .infinity)
                        .padding(YapTheme.Spacing.large)
                        .foregroundColor(.white)
                        .background(isRecording ? Color.red : YapTheme.ColorToken.colorMaria)
                        .cornerRadius(YapTheme.Radius.pill)
                    }
                    .disabled(isRecording)
                    .padding(YapTheme.Spacing.medium)
                }
            }
        }
        .alert("Microphone Access Required", isPresented: $showRecordingError, actions: {
            Button("OK") { }
        }, message: {
            Text(errorMessage ?? "Unable to access microphone")
        })
        .onAppear {
            Task {
                await loadMemos()
            }
        }
    }

    private func loadMemos() async {
        let memos = await chatService.loadMemos(chatId: chat.id)
        DispatchQueue.main.async {
            self.topicCards = memos.enumerated().map { index, memo in
                MockTopic(
                    id: memo.id,
                    title: memo.title,
                    speaker: memo.speaker,
                    duration: memo.duration,
                    speakerColor: speakerColors[index % speakerColors.count],
                    replyCount: memo.replyCount
                )
            }
            isLoading = false
        }
    }

    private func startRecording() async {
        do {
            let hasPermission = await recordingService.requestPermission()
            guard hasPermission else {
                errorMessage = "Microphone permission denied. Please allow microphone access in Settings and try again."
                showRecordingError = true
                return
            }

            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let fileName = "voice_\(UUID().uuidString).m4a"
            let fileURL = documentsPath.appendingPathComponent(fileName)

            isRecording = true
            try recordingService.startRecording(to: fileURL)
        } catch let error as RecordingError {
            errorMessage = error.errorDescription ?? "Recording failed"
            showRecordingError = true
            isRecording = false
        } catch {
            errorMessage = error.localizedDescription
            showRecordingError = true
            isRecording = false
        }
    }
}

// Mock data structure - replace with real data from Supabase
struct MockTopic {
    let id: String
    let title: String
    let speaker: String
    let duration: TimeInterval
    let speakerColor: Color
    let replyCount: Int
}

#Preview {
    NavigationStack {
        ChatView(chat: ChatSummary(id: "1", title: "Besties", memberCount: 3, preview: ""))
    }
}

