import Foundation

enum APIError: LocalizedError {
    case httpError(statusCode: Int)

    var errorDescription: String? {
        switch self {
        case .httpError(let code):
            return "HTTP error \(code)"
        }
    }
}

final class APIService {
    static let shared = APIService()

    private let baseURL: URL

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()

    private init() {
        let urlString = Bundle.main.infoDictionary?["API_BASE_URL"] as? String
            ?? "https://api.vitalai.com/api/v1"
        guard let url = URL(string: urlString) else {
            fatalError("Invalid API_BASE_URL: \(urlString)")
        }
        self.baseURL = url
    }

    // MARK: - Auth

    func registerUser(accessToken: String, email: String?, name: String?) async throws {
        var body: [String: String] = [:]
        if let email { body["email"] = email }
        if let name { body["name"] = name }

        var request = URLRequest(url: baseURL.appendingPathComponent("auth/register"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            print("[APIService] registerUser failed with status: \(code)")
            throw APIError.httpError(statusCode: code)
        }
        print("[APIService] User registered successfully")
    }

    // MARK: - FCM Token

    func sendFCMToken(_ token: String, accessToken: String) async throws {
        let body = ["fcmToken": token]

        var request = URLRequest(url: baseURL.appendingPathComponent("auth/fcm-token"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            print("[APIService] sendFCMToken failed with status: \(code)")
            throw APIError.httpError(statusCode: code)
        }
        print("[APIService] FCM token registered")
    }

    // MARK: - Health Events

    func sendHealthEvent(triggerType: String, payload: [String: Any], accessToken: String) async throws {
        let body: [String: Any] = [
            "triggerType": triggerType,
            "payload": payload,
            "timestamp": ISO8601DateFormatter().string(from: Date()),
        ]

        var request = URLRequest(url: baseURL.appendingPathComponent("events"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            print("[APIService] sendHealthEvent failed with status: \(code)")
            throw APIError.httpError(statusCode: code)
        }
        print("[APIService] Health event sent: \(triggerType)")
    }
}
