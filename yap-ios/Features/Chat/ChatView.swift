import SwiftUI

struct ChatView: View {
    let chat: ChatSummary

    var body: some View {
        VStack(spacing: YapTheme.Spacing.large) {
            List {
                Section("Conversation") {
                    Text("Native memo playback and threaded voice cards will land here.")
                        .foregroundStyle(.secondary)
                }
            }

            Button {
            } label: {
                Label("Record Memo", systemImage: "mic.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(YapTheme.ColorToken.accent)
            .controlSize(.large)
            .padding(.horizontal, YapTheme.Spacing.large)
            .padding(.bottom, YapTheme.Spacing.large)
        }
        .navigationTitle(chat.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

