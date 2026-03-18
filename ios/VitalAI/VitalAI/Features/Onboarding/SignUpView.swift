import SwiftUI
import Combine

struct SignUpView: View {
    let onComplete: () -> Void
    var onShowLogin: (() -> Void)? = nil

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

                    Text("Crie sua conta")
                        .font(.vitalTitle)

                    Text("Comece sua jornada de saúde")
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
                .disabled(authService.isLoading)
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
                        placeholder: "Mínimo 8 caracteres",
                        icon: "lock",
                        isSecure: true
                    )
                    .textContentType(.newPassword)
                }
                .padding(.horizontal, VitalSpacing.lg)

                // Error message
                if let error = authService.errorMessage {
                    Text(error)
                        .font(.vitalMicro)
                        .foregroundStyle(.vitalError)
                        .padding(.horizontal, VitalSpacing.lg)
                }

                // Create account button
                VitalButton(
                    title: authService.isLoading ? "Criando conta..." : "Criar conta",
                    variant: .primary,
                    isDisabled: authService.isLoading || email.isEmpty || password.isEmpty
                ) {
                    Task { await authService.signup(email: email, password: password) }
                }
                .padding(.horizontal, VitalSpacing.lg)

                // Terms
                Text("Ao criar conta, você concorda com os **Termos de Uso** e **Política de Privacidade**")
                    .font(.vitalMicro)
                    .foregroundStyle(.vitalSlate400)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, VitalSpacing.xl)

                // Login link
                Button {
                    onShowLogin?()
                } label: {
                    HStack(spacing: 4) {
                        Text("Já tenho conta?")
                            .foregroundStyle(.vitalSlate400)
                        Text("Entrar")
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
