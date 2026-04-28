import SwiftUI

struct PhoneAuthView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var phone = ""
    @State private var code = ""
    @State private var codeSent = false
    @State private var isLoading = false
    @State private var errorMessage = ""

    var body: some View {
        VStack(alignment: .leading, spacing: YapTheme.Spacing.large) {
            Text("Sign in with your phone.")
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundStyle(YapTheme.ColorToken.textPrimary)

            Text("We’ll text you a verification code so you can join chats securely.")
                .font(.system(size: 19, weight: .medium, design: .rounded))
                .foregroundStyle(YapTheme.ColorToken.textSecondary)

            VStack(spacing: YapTheme.Spacing.medium) {
                TextField("+1 555 555 0123", text: $phone)
                    .keyboardType(.phonePad)
                    .textInputAutocapitalization(.never)
                    .padding()
                    .background(YapTheme.ColorToken.surfaceStrong)
                    .clipShape(RoundedRectangle(cornerRadius: YapTheme.Radius.medium, style: .continuous))

                if codeSent {
                    TextField("6-digit code", text: $code)
                        .keyboardType(.numberPad)
                        .padding()
                        .background(YapTheme.ColorToken.surfaceStrong)
                        .clipShape(RoundedRectangle(cornerRadius: YapTheme.Radius.medium, style: .continuous))
                }

                Button(codeSent ? "Verify Code" : "Send Code") {
                    Task {
                        await submit()
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(YapTheme.ColorToken.accent)
                .controlSize(.large)
                .disabled(isLoading || phone.isEmpty || (codeSent && code.count < 6))

                if !errorMessage.isEmpty {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
            .yapCard()

            Spacer()
        }
        .padding(YapTheme.Spacing.xLarge)
    }

    private func submit() async {
        isLoading = true
        errorMessage = ""

        do {
            if codeSent {
                try await session.verifyCode(code)
                await session.importPhoneProfileIfPossible()
            } else {
                try await session.sendCode(to: phone)
                codeSent = true
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

