import Foundation

struct GroupRecipient: Identifiable, Hashable {
    let id: UUID
    var displayName: String
    var phoneE164: String
    var isRegistered: Bool

    init(id: UUID = UUID(), displayName: String, phoneE164: String, isRegistered: Bool = false) {
        self.id = id
        self.displayName = displayName
        self.phoneE164 = phoneE164
        self.isRegistered = isRegistered
    }
}

