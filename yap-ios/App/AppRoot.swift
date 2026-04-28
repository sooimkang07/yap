import SwiftUI

struct AppRoot: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        ZStack {
            YapScreenBackground()

            switch session.phase {
            case .welcome:
                WelcomeView()
            case .phoneAuth:
                PhoneAuthView()
            case .profileSetup:
                ProfileSetupView()
            case .chats:
                ChatsListView()
            }
        }
    }
}

