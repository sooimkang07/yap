import Contacts
import Foundation

struct ImportedPhoneProfile {
    var displayName: String
    var initials: String
    var avatarData: Data?
}

struct ContactsService {
    private let store = CNContactStore()

    func requestAccess() async throws -> Bool {
        try await withCheckedThrowingContinuation { continuation in
            store.requestAccess(for: .contacts) { granted, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: granted)
                }
            }
        }
    }

    func fetchMeProfile() throws -> ImportedPhoneProfile? {
        // iOS does not expose the user's Me card to third-party apps.
        nil
    }

    func fetchContacts() throws -> [GroupRecipient] {
        let keys: [CNKeyDescriptor] = [
            CNContactGivenNameKey as CNKeyDescriptor,
            CNContactFamilyNameKey as CNKeyDescriptor,
            CNContactPhoneNumbersKey as CNKeyDescriptor
        ]

        let request = CNContactFetchRequest(keysToFetch: keys)
        var recipients: [GroupRecipient] = []

        try store.enumerateContacts(with: request) { contact, _ in
            let name = [contact.givenName, contact.familyName]
                .filter { !$0.isEmpty }
                .joined(separator: " ")
                .trimmingCharacters(in: .whitespacesAndNewlines)

            guard let rawNumber = contact.phoneNumbers.first?.value.stringValue else { return }
            let phone = PhoneNumberFormatter.normalize(rawNumber)
            guard !phone.isEmpty else { return }

            recipients.append(
                GroupRecipient(
                    displayName: name.isEmpty ? phone : name,
                    phoneE164: phone
                )
            )
        }

        return recipients.sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
    }
}
