import Foundation

struct VoiceMemo: Identifiable, Hashable {
    let id: UUID
    let chatID: UUID
    let authorName: String
    let createdAt: Date
    let durationSeconds: TimeInterval
    let transcriptPreview: String
}

