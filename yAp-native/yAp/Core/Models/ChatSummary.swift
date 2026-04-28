import Foundation

struct ChatSummary: Identifiable, Hashable {
    let id: UUID
    var title: String
    var preview: String
    var unreadCount: Int
    var updatedAt: Date
    var members: [GroupRecipient]
}

