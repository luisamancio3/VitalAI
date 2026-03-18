import SwiftUI
import Combine
import Auth0

enum AuthState: Equatable {
    case unknown
    case unauthenticated
    case authenticated(UserProfile)

    static func == (lhs: AuthState, rhs: AuthState) -> Bool {
        switch (lhs, rhs) {
        case (.unknown, .unknown), (.unauthenticated, .unauthenticated):
            return true
        case (.authenticated(let a), .authenticated(let b)):
            return a.id == b.id
        default:
            return false
        }
    }
}

struct UserProfile: Sendable {
    let id: String
    let email: String?
    let name: String?
    let picture: String?
}

@MainActor
final class AuthService: ObservableObject {
    @Published var state: AuthState = .unknown
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let credentialsManager = CredentialsManager(authentication: Auth0.authentication())

    func checkSession() async {
        guard credentialsManager.canRenew() else {
            state = .unauthenticated
            return
        }

        do {
            let credentials = try await credentialsManager.credentials()
            let profile = extractProfile(from: credentials)
            state = .authenticated(profile)
        } catch {
            state = .unauthenticated
        }
    }

    func loginWithUniversalLogin() async {
        isLoading = true
        errorMessage = nil

        do {
            let credentials = try await Auth0
                .webAuth()
                .scope("openid profile email offline_access")
                .start()

            print("[AuthService] Universal Login succeeded")
            _ = credentialsManager.store(credentials: credentials)
            let profile = extractProfile(from: credentials)
            state = .authenticated(profile)
            // Sync user to backend (fire-and-forget)
            let token = credentials.accessToken
            Task { try? await APIService.shared.registerUser(accessToken: token, email: profile.email, name: profile.name) }
        } catch WebAuthError.userCancelled {
            print("[AuthService] Universal Login cancelled by user")
        } catch let error as WebAuthError {
            print("[AuthService] Universal Login WebAuthError: \(error)")
            print("[AuthService] WebAuthError cause: \(String(describing: error.cause))")
            errorMessage = "Falha ao fazer login: \(error.localizedDescription)"
        } catch {
            print("[AuthService] Universal Login error: \(error)")
            errorMessage = "Falha ao fazer login. Tente novamente."
        }

        isLoading = false
    }

    func signup(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            _ = try await Auth0
                .authentication()
                .signup(
                    email: email,
                    password: password,
                    connection: "Username-Password-Authentication"
                )
                .start()

            print("[AuthService] Signup succeeded, logging in...")
            await login(email: email, password: password)
        } catch {
            print("[AuthService] Signup failed: \(error)")
            errorMessage = parseAuthError(error)
            isLoading = false
        }
    }

    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let credentials = try await Auth0
                .authentication()
                .login(
                    usernameOrEmail: email,
                    password: password,
                    realmOrConnection: "Username-Password-Authentication",
                    scope: "openid profile email offline_access"
                )
                .start()

            print("[AuthService] Login succeeded")
            _ = credentialsManager.store(credentials: credentials)
            let profile = extractProfile(from: credentials)
            state = .authenticated(profile)
            // Sync user to backend (fire-and-forget)
            let token = credentials.accessToken
            Task { try? await APIService.shared.registerUser(accessToken: token, email: profile.email, name: profile.name) }
        } catch {
            print("[AuthService] Login failed: \(error)")
            errorMessage = parseAuthError(error)
        }

        isLoading = false
    }

    func logout() async {
        do {
            try await Auth0.webAuth().clearSession()
        } catch {
            // Clear local session even if web logout fails
        }

        _ = credentialsManager.clear()
        state = .unauthenticated
    }

    func getAccessToken() async -> String? {
        do {
            let credentials = try await credentialsManager.credentials()
            return credentials.accessToken
        } catch {
            return nil
        }
    }

    // MARK: - Private

    private func extractProfile(from credentials: Credentials) -> UserProfile {
        let idToken = credentials.idToken
        let parts = idToken.split(separator: ".")
        guard parts.count >= 2,
              let data = base64URLDecode(String(parts[1])),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            return UserProfile(id: "unknown", email: nil, name: nil, picture: nil)
        }

        return UserProfile(
            id: json["sub"] as? String ?? "unknown",
            email: json["email"] as? String,
            name: json["name"] as? String,
            picture: json["picture"] as? String
        )
    }

    private func base64URLDecode(_ value: String) -> Data? {
        var base64 = value
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = base64.count % 4
        if remainder > 0 {
            base64.append(contentsOf: repeatElement("=", count: 4 - remainder))
        }
        return Data(base64Encoded: base64)
    }

    private func parseAuthError(_ error: Error) -> String {
        print("[AuthService] Error: \(error)")

        if let authError = error as? AuthenticationError {
            // Auth0 specific error codes
            if authError.isPasswordNotStrongEnough {
                return "Senha deve ter no mínimo 8 caracteres com letras e números."
            }
            if authError.isPasswordAlreadyUsed {
                return "Esta senha já foi usada. Escolha outra."
            }
            if authError.isInvalidCredentials {
                return "Email ou senha inválidos."
            }
            if authError.isMultifactorRequired {
                return "Autenticação multifator necessária."
            }
            // Grant type not allowed = Resource Owner Password Grant disabled
            if let code = authError.info["error"] as? String, code == "unauthorized_client" {
                return "Método de login indisponível. Use 'Continuar com Apple' ou 'Continuar com Google'."
            }
            // Generic Auth0 error — show the actual description
            if let description = authError.info["description"] as? String, !description.isEmpty {
                return description
            }
        }

        let description = error.localizedDescription.lowercased()
        if description.contains("password") {
            return "Senha deve ter no mínimo 8 caracteres."
        }
        return "Algo deu errado. Tente novamente."
    }
}
