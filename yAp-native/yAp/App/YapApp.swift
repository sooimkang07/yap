import SwiftUI

@main
struct YapApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            AppRoot()
                .environmentObject(session)
        }
    }
}
