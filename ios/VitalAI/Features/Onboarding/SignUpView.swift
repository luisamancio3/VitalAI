import SwiftUI

// Reference: design/screens/vitalai_sign_up_screen/screen.png

struct SignUpView: View {
    let onComplete: () -> Void
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        VStack(spacing: VitalSpacing.xl) {
            Spacer()

            // Header
            VStack(spacing: VitalSpacing.sm) {
                Image(systemName: "heart.circle.fill")
                    .resizable()
                    .frame(width: 56, height: 56)
                    .foregroundStyle(.vitalPrimary)

                Text("Criar conta")
                    .font(.vitalTitle)

                Text("Comece sua jornada de saúde")
                    .font(.vitalCaption)
                    .foregroundStyle(.secondary)
            }

            // Social sign-in buttons
            VStack(spacing: VitalSpacing.md) {
                VitalButton(title: "Continuar com Apple", variant: .secondary) {
                    // TODO: Apple Sign In via Auth0/Clerk
                    onComplete()
                }

                VitalButton(title: "Continuar com Google", variant: .secondary) {
                    // TODO: Google Sign In via Auth0/Clerk
                    onComplete()
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

            // Email/password
            VStack(spacing: VitalSpacing.md) {
                VitalTextField(label: "Email", text: $email, placeholder: "seu@email.com", icon: "envelope")
                VitalTextField(label: "Senha", text: $password, placeholder: "Mínimo 8 caracteres")
            }
            .padding(.horizontal, VitalSpacing.lg)

            VitalButton(title: "Criar conta", variant: .primary) {
                // TODO: Email sign up via Auth0/Clerk
                onComplete()
            }
            .padding(.horizontal, VitalSpacing.lg)

            Spacer()
        }
        .background(Color.vitalBackground)
    }
}
