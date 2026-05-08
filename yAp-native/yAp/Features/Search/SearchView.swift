import SwiftUI

struct SearchView: View {
    @Environment(\.dismiss) var dismiss
    @State private var searchText: String = ""
    @State private var recentSearches: [String] = ["Weekend plans", "Project update"]

    var filteredResults: [SearchResult] {
        if searchText.isEmpty {
            return []
        }

        let mockResults = [
            SearchResult(type: .memo, title: "Weekend plans", preview: "Let's discuss the weekend trip...", speaker: "Sarah"),
            SearchResult(type: .memo, title: "Project update", preview: "Here's the latest on the project...", speaker: "Alex"),
            SearchResult(type: .memo, title: "Team meeting", preview: "Discussing Q2 goals and timeline...", speaker: "Jamie"),
        ]

        return mockResults.filter { result in
            result.title.localizedCaseInsensitiveContains(searchText) ||
                result.preview.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        ZStack {
            YapScreenBackground()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(YapTheme.ColorToken.textSecondary)
                    }

                    TextField("Search memos", text: $searchText)
                        .font(.system(size: 16))
                        .padding(YapTheme.Spacing.medium)
                        .background(Color.white.opacity(0.6))
                        .cornerRadius(YapTheme.Radius.md)

                    if !searchText.isEmpty {
                        Button(action: { searchText = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundColor(YapTheme.ColorToken.textTertiary)
                        }
                    }
                }
                .padding(.horizontal, YapTheme.Spacing.large)
                .padding(.vertical, YapTheme.Spacing.medium)

                Divider()
                    .opacity(0.1)

                // Results or Recent Searches
                ScrollView {
                    VStack(alignment: .leading, spacing: YapTheme.Spacing.large) {
                        if searchText.isEmpty {
                            // Recent Searches
                            VStack(alignment: .leading, spacing: YapTheme.Spacing.medium) {
                                Text("Recent Searches")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(YapTheme.ColorToken.textSecondary)
                                    .textCase(.uppercase)
                                    .padding(.horizontal, YapTheme.Spacing.large)

                                VStack(spacing: YapTheme.Spacing.small) {
                                    ForEach(recentSearches, id: \.self) { search in
                                        HStack {
                                            Image(systemName: "clock")
                                                .font(.system(size: 14))
                                                .foregroundColor(YapTheme.ColorToken.textTertiary)

                                            Text(search)
                                                .font(.system(size: 16))
                                                .foregroundColor(YapTheme.ColorToken.textPrimary)

                                            Spacer()

                                            Button(action: {
                                                recentSearches.removeAll { $0 == search }
                                            }) {
                                                Image(systemName: "xmark")
                                                    .font(.system(size: 12))
                                                    .foregroundColor(YapTheme.ColorToken.textTertiary)
                                            }
                                        }
                                        .padding(YapTheme.Spacing.medium)
                                        .background(YapTheme.ColorToken.surfaceStrong)
                                        .cornerRadius(YapTheme.Radius.md)
                                    }
                                }
                                .padding(.horizontal, YapTheme.Spacing.large)
                            }
                        } else {
                            // Search Results
                            VStack(alignment: .leading, spacing: YapTheme.Spacing.medium) {
                                Text("Results")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(YapTheme.ColorToken.textSecondary)
                                    .textCase(.uppercase)
                                    .padding(.horizontal, YapTheme.Spacing.large)

                                if filteredResults.isEmpty {
                                    VStack(spacing: YapTheme.Spacing.medium) {
                                        Image(systemName: "magnifyingglass")
                                            .font(.system(size: 32))
                                            .foregroundColor(YapTheme.ColorToken.textTertiary)

                                        Text("No results found")
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundColor(YapTheme.ColorToken.textSecondary)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(YapTheme.Spacing.xLarge)
                                } else {
                                    VStack(spacing: YapTheme.Spacing.small) {
                                        ForEach(filteredResults, id: \.title) { result in
                                            SearchResultRow(result: result)
                                        }
                                    }
                                    .padding(.horizontal, YapTheme.Spacing.large)
                                }
                            }
                        }

                        Spacer()
                    }
                    .padding(.vertical, YapTheme.Spacing.large)
                }
            }
        }
    }
}

struct SearchResult {
    enum ResultType {
        case memo
        case reply
    }

    let type: ResultType
    let title: String
    let preview: String
    let speaker: String
}

struct SearchResultRow: View {
    let result: SearchResult

    var body: some View {
        VStack(alignment: .leading, spacing: YapTheme.Spacing.small) {
            Text(result.title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(YapTheme.ColorToken.textPrimary)

            HStack(spacing: 8) {
                Text(result.speaker)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(YapTheme.ColorToken.textSecondary)

                Text("•")
                    .foregroundColor(YapTheme.ColorToken.textTertiary)

                Text(result.preview)
                    .font(.system(size: 13))
                    .foregroundColor(YapTheme.ColorToken.textTertiary)
                    .lineLimit(1)
            }
        }
        .padding(YapTheme.Spacing.medium)
        .background(YapTheme.ColorToken.surfaceStrong)
        .cornerRadius(YapTheme.Radius.md)
    }
}

#Preview {
    SearchView()
}
