import SwiftUI

@main
struct YapApp: App {
    @StateObject private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            AppRoot()
                .environmentObject(session)
        }
    }
}

