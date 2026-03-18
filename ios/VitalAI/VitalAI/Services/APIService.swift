import Foundation

final class APIService {
    static let shared = APIService()

    private let baseURL = URL(string: "http://localhost:3000/api/v1")!

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

    private init() {}

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
            print("[APIService] registerUser failed with status: \((response as? HTTPURLResponse)?.statusCode ?? -1)")
            return
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
            print("[APIService] sendFCMToken failed")
            return
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
            print("[APIService] sendHealthEvent failed")
            return
        }
        print("[APIService] Health event sent: \(triggerType)")
    }
}
