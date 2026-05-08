import Foundation

struct ChatService {
    private let supabase = SupabaseClient.shared

    func loadChats(userId: String) async -> [ChatSummary] {
        do {
            let chats = try await supabase.fetchChats(userId: userId)
            var summaries: [ChatSummary] = []

            for chat in chats {
                // Fetch memos for this chat to get preview
                let memos = try await supabase.fetchMemos(chatId: chat.id)
                let preview = memos.first?.title ?? "No memos yet"

                summaries.append(
                    ChatSummary(
                        id: chat.id,
                        title: chat.title,
                        memberCount: 0, // TODO: fetch from participants table
                        preview: preview
                    )
                )
            }

            return summaries
        } catch {
            // Fallback to mock data if Supabase fails
            return mockChats()
        }
    }

    func loadMemos(chatId: String) async -> [MemoCard] {
        do {
            let memos = try await supabase.fetchMemos(chatId: chatId)
            var cards: [MemoCard] = []

            for memo in memos {
                let replies = try await supabase.fetchReplies(memoId: memo.id)

                cards.append(
                    MemoCard(
                        id: memo.id,
                        title: memo.title,
                        speaker: "Speaker", // TODO: fetch from users table
                        duration: memo.duration,
                        replyCount: replies.count,
                        createdAt: memo.created_at
                    )
                )
            }

            return cards
        } catch {
            // Fallback to mock data
            return mockMemos()
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

