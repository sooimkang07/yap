import Foundation

class SupabaseClient {
    static let shared = SupabaseClient()

    private let baseURL = "https://maigiwxpyganbhpwbejd.supabase.co/rest/v1"
    private let apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1haWdpd3hweWdhbmJocHdiZWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMDU5NzUsImV4cCI6MjA5MTg4MTk3NX0.7I1jRIXrd7IsLxAkqIeT8VZgwNDA2BjBdQBsCVmXe1Y"

    private let session = URLSession.shared

    func fetchChats(userId: String) async throws -> [ChatData] {
        let query = "select * from chats where user_id = '\(userId)'"
        return try await fetch(endpoint: "chats", query: query)
    }

    func fetchMemos(chatId: String) async throws -> [MemoData] {
        let query = "select * from voice_memos where chat_id = '\(chatId)' order by created_at desc"
        return try await fetch(endpoint: "voice_memos", query: query)
    }

    func fetchReplies(memoId: String) async throws -> [ReplyData] {
        let query = "select * from memo_replies where memo_id = '\(memoId)' order by created_at"
        return try await fetch(endpoint: "memo_replies", query: query)
    }

    private func fetch<T: Decodable>(endpoint: String, query: String) async throws -> [T] {
        var urlComponents = URLComponents(string: "\(baseURL)/\(endpoint)")!
        urlComponents.queryItems = [
            URLQueryItem(name: "select", value: "*"),
        ]

        guard let url = urlComponents.url else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.addValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode([T].self, from: data)
    }
}

// MARK: - Data Models

struct ChatData: Codable {
    let id: String
    let title: String
    let description: String?
    let user_id: String
    let created_at: Date
    let updated_at: Date

    enum CodingKeys: String, CodingKey {
        case id, title, description, user_id, created_at, updated_at
    }
}

struct MemoData: Codable {
    let id: String
    let chat_id: String
    let user_id: String
    let title: String
    let duration: Double
    let created_at: Date
    let transcript: String?
    let audio_url: String?

    enum CodingKeys: String, CodingKey {
        case id, chat_id, user_id, title, duration, created_at, transcript, audio_url
    }
}

struct ReplyData: Codable {
    let id: String
    let memo_id: String
    let user_id: String
    let title: String
    let duration: Double
    let created_at: Date
    let audio_url: String?

    enum CodingKeys: String, CodingKey {
        case id, memo_id, user_id, title, duration, created_at, audio_url
    }
}
