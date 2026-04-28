import Foundation

struct AppUser: Identifiable, Codable, Hashable {
    let id: UUID
    var phoneE164: String
    var displayName: String
    var initials: String
    var avatarData: Data?
    var isProfileComplete: Bool

    static let empty = AppUser(
        id: UUID(),
        phoneE164: "",
        displayName: "",
        initials: "Y",
        avatarData: nil,
        isProfileComplete: false
    )
}

