import Foundation

struct ChatService {
    func loadChats() async -> [ChatSummary] {
        [
            ChatSummary(
                id: UUID(),
                title: "besties",
                preview: "Voice memos will appear here.",
                unreadCount: 0,
                updatedAt: .now,
                members: []
            )
        ]
    }
}

