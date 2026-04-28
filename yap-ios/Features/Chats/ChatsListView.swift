import SwiftUI

struct ChatsListView: View {
    @State private var chats: [ChatSummary] = []
    @State private var showingNewGroup = false
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
                ToolbarItem(placement: .topBarTrailing) {
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
            .task {
                chats = await chatService.loadChats()
            }
        }
    }
}

