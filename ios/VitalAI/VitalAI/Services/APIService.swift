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
        self.baseURL = URL(string: urlString) ?? URL(string: "https://api.vitalai.com/api/v1")!
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

    // MARK: - Nutrition

    func saveNutritionProfile(goal: String, restrictions: [String], cookingSkill: String, accessToken: String) async throws {
        let body: [String: Any] = [
            "goal": goal,
            "restrictions": restrictions,
            "cooking_skill": cookingSkill,
        ]

        var request = URLRequest(url: baseURL.appendingPathComponent("nutrition/profile"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw APIError.httpError(statusCode: code)
        }
        print("[APIService] Nutrition profile saved")
    }

    func getNutritionProfile(accessToken: String) async throws -> NutritionProfile? {
        var request = URLRequest(url: baseURL.appendingPathComponent("nutrition/profile"))
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.httpError(statusCode: -1)
        }
        if httpResponse.statusCode == 404 { return nil }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }
        return try decoder.decode(NutritionProfile.self, from: data)
    }

    func getMealSuggestion(context: String, accessToken: String) async throws -> MealSuggestion {
        var components = URLComponents(url: baseURL.appendingPathComponent("nutrition/suggestion"), resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "context", value: context)]

        guard let url = components?.url else { throw APIError.httpError(statusCode: -1) }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw APIError.httpError(statusCode: code)
        }
        return try decoder.decode(MealSuggestion.self, from: data)
    }

    func sendMealFeedback(recipeId: String, rating: Int, comment: String?, context: String?, accessToken: String) async throws {
        var body: [String: Any] = [
            "recipe_id": recipeId,
            "rating": rating,
        ]
        if let comment { body["comment"] = comment }
        if let context { body["context"] = context }

        var request = URLRequest(url: baseURL.appendingPathComponent("nutrition/feedback"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw APIError.httpError(statusCode: code)
        }
    }

    func getMealHistory(accessToken: String) async throws -> [MealFeedbackItem] {
        var request = URLRequest(url: baseURL.appendingPathComponent("nutrition/history"))
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw APIError.httpError(statusCode: code)
        }
        return try decoder.decode([MealFeedbackItem].self, from: data)
    }

    // MARK: - Reports

    func getWeeklyReports(accessToken: String) async throws -> [WeeklyReportSummary] {
        var request = URLRequest(url: baseURL.appendingPathComponent("reports/weekly"))
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw APIError.httpError(statusCode: code)
        }
        return try decoder.decode([WeeklyReportSummary].self, from: data)
    }

    func getWeeklyReport(id: String, accessToken: String) async throws -> WeeklyReport {
        var request = URLRequest(url: baseURL.appendingPathComponent("reports/weekly/\(id)"))
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw APIError.httpError(statusCode: code)
        }
        return try decoder.decode(WeeklyReport.self, from: data)
    }
}

// MARK: - Models

struct NutritionProfile: Codable {
    let id: String
    let goal: String
    let restrictions: [String]?
    let cookingSkill: String
}

struct MealSuggestion: Codable {
    let recipe: RecipeData
    let message: String
    let context: String
}

struct RecipeData: Codable {
    let id: String
    let name: String
    let description: String?
    let macros: MacroData
    let prepTime: Int
    let difficulty: String
    let ingredients: [IngredientData]?
    let servings: Int
}

struct MacroData: Codable {
    let calories: Int
    let protein: Int
    let carbs: Int
    let fat: Int
}

struct IngredientData: Codable {
    let name: String
    let amount: String
}

struct MealFeedbackItem: Codable, Identifiable {
    let id: String
    let recipeId: String
    let rating: Int
    let comment: String?
    let context: String?
    let createdAt: String?
}

struct WeeklyReportSummary: Codable, Identifiable {
    let id: String
    let weekStart: String
    let weekEnd: String
    let createdAt: String?
}

struct WeeklyReport: Codable, Identifiable {
    let id: String
    let weekStart: String
    let weekEnd: String
    let metrics: ReportMetrics?
    let reportText: String
}

struct ReportMetrics: Codable {
    let avgHeartRate: Double?
    let avgHrv: Double?
    let totalSteps: Int?
    let avgSleepHours: Double?
    let workoutCount: Int?
    let notificationCount: Int?
}
