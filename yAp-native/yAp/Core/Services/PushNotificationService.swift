import Combine
import Foundation
import UIKit

#if canImport(OneSignalFramework)
import OneSignalFramework
#endif

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        PushNotificationService.shared.configure(launchOptions: launchOptions)
        return true
    }
}

@MainActor
final class PushNotificationService: ObservableObject {
    static let shared = PushNotificationService()

    @Published private(set) var isConfigured = false
    @Published private(set) var permissionAccepted = false

    private init() {}

    func configure(launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) {
        guard !AppConfig.oneSignalAppID.isEmpty else {
            isConfigured = false
            return
        }

        #if canImport(OneSignalFramework)
        OneSignal.initialize(AppConfig.oneSignalAppID, withLaunchOptions: launchOptions)
        isConfigured = true
        #else
        isConfigured = false
        #endif
    }

    func requestPermissionIfConfigured() {
        guard !AppConfig.oneSignalAppID.isEmpty else { return }

        #if canImport(OneSignalFramework)
        OneSignal.Notifications.requestPermission({ [weak self] accepted in
            Task { @MainActor in
                self?.permissionAccepted = accepted
            }
        }, fallbackToSettings: true)
        #endif
    }

    func identify(userID: UUID) {
        guard !AppConfig.oneSignalAppID.isEmpty else { return }

        #if canImport(OneSignalFramework)
        OneSignal.login(userID.uuidString)
        #endif
    }

    func clearIdentity() {
        #if canImport(OneSignalFramework)
        OneSignal.logout()
        #endif
    }
}
