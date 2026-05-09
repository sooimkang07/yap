import Foundation

struct ChatService {
    private let supabase = SupabaseClient.shared

    func loadChats(userId: String) async -> [ChatSummary] {
        do {
            let chats = try await supabase.fetchChats(userId: userId)
            // Don't fetch memos here - just use a generic preview
            let summaries = chats.map { chat in
                ChatSummary(
                    id: chat.id,
                    title: chat.title,
                    memberCount: 0,
                    preview: "Voice memos will appear here"
                )
            }
            return summaries
        } catch {
            return mockChats()
        }
    }

    func loadMemos(chatId: String) async -> [MemoCard] {
        do {
            let memos = try await supabase.fetchMemos(chatId: chatId)
            // Don't fetch replies here - load them on demand when topic is expanded
            let cards = memos.map { memo in
                MemoCard(
                    id: memo.id,
                    title: memo.title,
                    speaker: "Speaker",
                    duration: memo.duration,
                    replyCount: 0, // Will be fetched on demand
                    createdAt: memo.created_at
                )
            }
            return cards
        } catch {
            return mockMemos()
        }
    }

    func loadReplies(memoId: String) async -> Int {
        do {
            let replies = try await supabase.fetchReplies(memoId: memoId)
            return replies.count
        } catch {
            return 0
        }
    }

    private func mockChats() -> [ChatSummary] {
        [
            ChatSummary(
                id: "1",
                title: "besties",
                memberCount: 3,
                preview: "Voice memos will appear here."
            )
        ]
    }

    private func mockMemos() -> [MemoCard] {
        [
            MemoCard(
                id: "1",
                title: "Weekend plans",
                speaker: "Sarah",
                duration: 45.5,
                replyCount: 3,
                createdAt: .now
            ),
            MemoCard(
                id: "2",
                title: "Project update",
                speaker: "Alex",
                duration: 120.0,
                replyCount: 0,
                createdAt: .now
            ),
        ]
    }
}

struct MemoCard {
    let id: String
    let title: String
    let speaker: String
    let duration: TimeInterval
    let replyCount: Int
    let createdAt: Date
}

