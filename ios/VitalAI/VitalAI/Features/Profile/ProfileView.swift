import SwiftUI
import Combine
import HealthKit

struct ProfileView: View {
    @EnvironmentObject private var authService: AuthService
    @EnvironmentObject private var healthKitService: HealthKitService
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true

    // TODO: Sync notificationsEnabled to backend via PATCH /api/v1/users/preferences
    // Currently this only affects local UI; the backend still sends notifications

    var body: some View {
        NavigationStack {
            List {
                Section("Conta") {
                    NavigationLink("Perfil de Saúde") {
                        Text("Health Profile — em breve")
                    }
                    NavigationLink("Dispositivos Conectados") {
                        devicesView
                    }
                }
                Section("Configurações") {
                    NavigationLink("Notificações") {
                        notificationsView
                    }
                    NavigationLink("Privacidade & Dados") {
                        Text("Privacidade — em breve")
                    }
                    NavigationLink("Plano & Assinatura") {
                        Text("Assinatura — em breve")
                    }
                }
                Section {
                    Button(role: .destructive) {
                        Task { await authService.logout() }
                    } label: {
                        HStack {
                            Spacer()
                            Text("Sair")
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Perfil")
        }
    }

    // MARK: - Dispositivos Conectados

    private var devicesView: some View {
        List {
            Section("Apple Health") {
                HStack {
                    Image(systemName: "heart.fill")
                        .foregroundStyle(.vitalError)
                    Text("HealthKit")
                    Spacer()
                    Text(healthKitStatusLabel)
                        .font(.vitalCaption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Dispositivos Conectados")
    }

    private var healthKitStatusLabel: String {
        guard healthKitService.isAvailable else { return "Não disponível" }
        switch healthKitService.authorizationStatus {
        case .unnecessary:
            return "Conectado"
        case .shouldRequest:
            return "Não conectado"
        default:
            return "Não conectado"
        }
    }

    // MARK: - Notificações

    private var notificationsView: some View {
        List {
            Section {
                Toggle("Ativar Notificações", isOn: $notificationsEnabled)
                    .tint(.vitalPrimary)
            } footer: {
                Text("Receba lembretes de saúde personalizados baseados nos seus dados biométricos.")
            }
        }
        .navigationTitle("Notificações")
    }
}
