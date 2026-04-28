import Combine
import Foundation
import SwiftUI

@MainActor
final class SessionStore: ObservableObject {
    enum Phase: Equatable {
        case welcome
        case phoneAuth
        case profileSetup
        case chats
    }

    @Published var phase: Phase = .welcome
    @Published var currentUser: AppUser = .empty
    @Published var contactsPermissionGranted = false

    private let authService = AuthService()
    private let contactsService = ContactsService()

    func beginPhoneAuth() {
        phase = .phoneAuth
    }

    func sendCode(to phone: String) async throws {
        let normalized = PhoneNumberFormatter.normalize(phone)
        currentUser.phoneE164 = normalized
        try await authService.sendCode(to: normalized)
    }

    func verifyCode(_ code: String) async throws {
        try await authService.verifyCode(phone: currentUser.phoneE164, code: code)
        phase = .profileSetup
    }

    func importPhoneProfileIfPossible() async {
        do {
            let granted = try await contactsService.requestAccess()
            contactsPermissionGranted = granted
            guard granted, let profile = try contactsService.fetchMeProfile() else { return }
            currentUser.displayName = profile.displayName
            currentUser.initials = profile.initials
            currentUser.avatarData = profile.avatarData
            currentUser.isProfileComplete = !profile.displayName.isEmpty
        } catch {
            contactsPermissionGranted = false
        }
    }

    func completeProfile(name: String) {
        currentUser.displayName = name
        currentUser.initials = String(name.split(separator: " ").prefix(2).compactMap(\.first)).uppercased()
        currentUser.isProfileComplete = !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        phase = .chats
    }
}
