import SwiftUI

struct SignUpView: View {
    let onComplete: () -> Void
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        VStack(spacing: VitalSpacing.xl) {
            Spacer()

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

            VStack(spacing: VitalSpacing.md) {
                VitalButton(title: "Continuar com Apple", variant: .secondary) {
                    onComplete()
                }
                VitalButton(title: "Continuar com Google", variant: .secondary) {
                    onComplete()
                }
            }
            .padding(.horizontal, VitalSpacing.lg)

            HStack {
                Rectangle().frame(height: 1).foregroundStyle(.vitalSlate200)
                Text("ou").font(.vitalMicro).foregroundStyle(.vitalSlate400)
                Rectangle().frame(height: 1).foregroundStyle(.vitalSlate200)
            }
            .padding(.horizontal, VitalSpacing.lg)

            VStack(spacing: VitalSpacing.md) {
                VitalTextField(label: "Email", text: $email, placeholder: "seu@email.com", icon: "envelope")
                VitalTextField(label: "Senha", text: $password, placeholder: "Mínimo 8 caracteres")
            }
            .padding(.horizontal, VitalSpacing.lg)

            VitalButton(title: "Criar conta", variant: .primary) {
                onComplete()
            }
            .padding(.horizontal, VitalSpacing.lg)

            Spacer()
        }
        .background(Color.vitalBackground)
    }
}
