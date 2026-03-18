import SwiftUI
import Combine

struct LoginView: View {
    var onShowSignUp: (() -> Void)? = nil

    @EnvironmentObject private var authService: AuthService
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ScrollView {
            VStack(spacing: VitalSpacing.xl) {
                Spacer().frame(height: VitalSpacing.xxl)

                // Header
                VStack(spacing: VitalSpacing.sm) {
                    Image(systemName: "waveform.path.ecg.rectangle")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 56, height: 56)
                        .foregroundStyle(.vitalPrimary)

                    Text("Bem-vindo de volta")
                        .font(.vitalTitle)

                    Text("Entre na sua conta VitalAI")
                        .font(.vitalCaption)
                        .foregroundStyle(.secondary)
                }

                // Social login buttons
                VStack(spacing: VitalSpacing.md) {
                    SocialLoginButton(provider: .apple) {
                        Task { await authService.loginWithUniversalLogin() }
                    }
                    SocialLoginButton(provider: .google) {
                        Task { await authService.loginWithUniversalLogin() }
                    }
                }
                .padding(.horizontal, VitalSpacing.lg)

                // Divider
                HStack {
                    Rectangle().frame(height: 1).foregroundStyle(.vitalSlate200)
                    Text("ou").font(.vitalMicro).foregroundStyle(.vitalSlate400)
                    Rectangle().frame(height: 1).foregroundStyle(.vitalSlate200)
                }
                .padding(.horizontal, VitalSpacing.lg)

                // Email/password fields
                VStack(spacing: VitalSpacing.md) {
                    VitalTextField(
                        label: "Email",
                        text: $email,
                        placeholder: "seu@email.com",
                        icon: "envelope"
                    )
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                    VitalTextField(
                        label: "Senha",
                        text: $password,
                        placeholder: "Sua senha",
                        icon: "lock",
                        isSecure: true
                    )
                    .textContentType(.password)
                }
                .padding(.horizontal, VitalSpacing.lg)

                // Error message
                if let error = authService.errorMessage {
                    Text(error)
                        .font(.vitalMicro)
                        .foregroundStyle(.vitalError)
                        .padding(.horizontal, VitalSpacing.lg)
                }

                // Login button
                VitalButton(
                    title: authService.isLoading ? "Entrando..." : "Entrar",
                    variant: .primary,
                    isDisabled: authService.isLoading || email.isEmpty || password.isEmpty
                ) {
                    Task { await authService.login(email: email, password: password) }
                }
                .padding(.horizontal, VitalSpacing.lg)

                // Sign up link
                Button {
                    onShowSignUp?()
                } label: {
                    HStack(spacing: 4) {
                        Text("Não tem conta?")
                            .foregroundStyle(.vitalSlate400)
                        Text("Criar conta")
                            .foregroundStyle(.vitalAccentBlue)
                    }
                    .font(.vitalCaptionMedium)
                }

                Spacer().frame(height: VitalSpacing.xxl)
            }
        }
        .background(Color.vitalBackground)
    }
}
