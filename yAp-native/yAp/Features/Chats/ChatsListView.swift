import SwiftUI

struct ChatsListView: View {
    @EnvironmentObject var sessionStore: SessionStore
    @State private var chats: [ChatSummary] = []
    @State private var showingNewGroup = false
    @State private var showingSettings = false
    private let chatService = ChatService()

    var body: some View {
        NavigationStack {
            List(chats) { chat in
                NavigationLink(value: chat) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(chat.title)
                            .font(.headline)
                        Text(chat.preview)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }
            }
            .navigationTitle("Chats")
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        showingSettings = true
                    } label: {
                        Image(systemName: "gear")
                    }

                    Button {
                        showingNewGroup = true
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                }
            }
            .navigationDestination(for: ChatSummary.self) { chat in
                ChatView(chat: chat)
            }
            .sheet(isPresented: $showingNewGroup) {
                NewGroupView()
            }
            .sheet(isPresented: $showingSettings) {
                SettingsView()
            }
            .task {
                if let userId = sessionStore.currentUserId {
                    chats = await chatService.loadChats(userId: userId)
                }
            }
        }
    }
}

