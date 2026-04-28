import SwiftUI

struct NewGroupView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var groupName = ""
    @State private var recipients: [GroupRecipient] = []
    @State private var manualName = ""
    @State private var manualPhone = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: YapTheme.Spacing.large) {
                    Text("New Group")
                        .font(.system(size: 40, weight: .bold, design: .rounded))

                    VStack(alignment: .leading, spacing: YapTheme.Spacing.medium) {
                        TextField("Optional group name", text: $groupName)
                            .padding()
                            .background(YapTheme.ColorToken.surfaceStrong)
                            .clipShape(RoundedRectangle(cornerRadius: YapTheme.Radius.medium, style: .continuous))

                        HStack {
                            TextField("Friend name", text: $manualName)
                            TextField("Phone number", text: $manualPhone)
                                .keyboardType(.phonePad)
                        }
                        .padding()
                        .background(YapTheme.ColorToken.surfaceStrong)
                        .clipShape(RoundedRectangle(cornerRadius: YapTheme.Radius.medium, style: .continuous))

                        Button("Add Member") {
                            let phone = PhoneNumberFormatter.normalize(manualPhone)
                            guard !phone.isEmpty else { return }
                            let name = manualName.trimmingCharacters(in: .whitespacesAndNewlines)
                            recipients.append(GroupRecipient(displayName: name.isEmpty ? phone : name, phoneE164: phone))
                            manualName = ""
                            manualPhone = ""
                        }
                        .buttonStyle(.bordered)
                    }
                    .yapCard()

                    if !recipients.isEmpty {
                        VStack(alignment: .leading, spacing: YapTheme.Spacing.small) {
                            ForEach(recipients) { recipient in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(recipient.displayName)
                                        .font(.headline)
                                    Text(recipient.phoneE164)
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding()
                                .background(YapTheme.ColorToken.surfaceStrong)
                                .clipShape(RoundedRectangle(cornerRadius: YapTheme.Radius.medium, style: .continuous))
                            }
                        }
                    }
                }
                .padding(YapTheme.Spacing.xLarge)
            }
            .background(YapScreenBackground())
            .navigationTitle("New Group")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Continue") { dismiss() }
                        .disabled(recipients.isEmpty)
                }
            }
        }
    }
}

