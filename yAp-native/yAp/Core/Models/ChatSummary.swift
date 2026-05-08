import Foundation

struct ChatSummary: Identifiable, Hashable {
    let id: String
    var title: String
    var memberCount: Int
    var preview: String
    var unreadCount: Int = 0
    var updatedAt: Date = .now
    var members: [GroupRecipient] = []

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: ChatSummary, rhs: ChatSummary) -> Bool {
        lhs.id == rhs.id
    }
}

