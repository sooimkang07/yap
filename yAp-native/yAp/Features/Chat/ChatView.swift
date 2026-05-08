import SwiftUI

struct ChatView: View {
    let chat: ChatSummary
    @StateObject private var recordingService = RecordingService()
    @State private var errorMessage: String?
    @State private var showRecordingError = false

    var body: some View {
        VStack(spacing: YapTheme.Spacing.large) {
            List {
                Section("Conversation") {
                    Text("Native memo playback and threaded voice cards will land here.")
                        .foregroundStyle(.secondary)
                }
            }

            Button {
                Task {
                    await startRecording()
                }
            } label: {
                Label(
                    recordingService.isRecording ? "Recording..." : "Record Memo",
                    systemImage: "mic.fill"
                )
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(recordingService.isRecording ? .red : YapTheme.ColorToken.accent)
            .controlSize(.large)
            .padding(.horizontal, YapTheme.Spacing.large)
            .padding(.bottom, YapTheme.Spacing.large)
            .disabled(recordingService.isRecording)
        }
        .navigationTitle(chat.title)
        .navigationBarTitleDisplayMode(.inline)
        .alert("Microphone Access Required", isPresented: $showRecordingError, actions: {
            Button("OK") { }
        }, message: {
            Text(errorMessage ?? "Unable to access microphone")
        })
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

            try recordingService.startRecording(to: fileURL)
        } catch let error as RecordingError {
            errorMessage = error.errorDescription ?? "Recording failed"
            showRecordingError = true
        } catch {
            errorMessage = error.localizedDescription
            showRecordingError = true
        }
    }
}

