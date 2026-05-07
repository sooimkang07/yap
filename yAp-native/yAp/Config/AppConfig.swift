import Foundation

enum AppConfig {
    static let appName = "yAp"

    // Update this once the iOS app is running against your local or hosted backend.
    static let apiBaseURL = URL(string: "http://localhost:3000")!
    static let oneSignalAppID = "0b61ec11-ed64-4f05-b024-127c875b42ac"

    static let endpoints = Endpoints()

    struct Endpoints {
        let sendPhoneCode = "/api/send-phone-code"
        let verifyPhoneCode = "/api/verify-phone-code"
        let processAudio = "/api/process-audio"
        let sendInvites = "/api/send-invites"
        let notifications = "/api/send-message-notifications"
    }
}
