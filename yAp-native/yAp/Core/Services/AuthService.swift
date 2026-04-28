import Foundation

struct AuthService {
    func sendCode(to phone: String) async throws {
        let requestURL = AppConfig.apiBaseURL.appending(path: AppConfig.endpoints.sendPhoneCode)
        var request = URLRequest(url: requestURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["phone": phone])

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }

    func verifyCode(phone: String, code: String) async throws {
        let requestURL = AppConfig.apiBaseURL.appending(path: AppConfig.endpoints.verifyPhoneCode)
        var request = URLRequest(url: requestURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode([
            "phone": phone,
            "code": code
        ])

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.userAuthenticationRequired)
        }
    }
}

