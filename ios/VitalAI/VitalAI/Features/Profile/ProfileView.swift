import SwiftUI

struct ProfileView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Conta") {
                    NavigationLink("Perfil de Saúde") {
                        Text("Health Profile — TODO")
                    }
                    NavigationLink("Dispositivos Conectados") {
                        Text("Connected Devices — TODO")
                    }
                }
                Section("Configurações") {
                    NavigationLink("Notificações") {
                        Text("Notification Settings — TODO")
                    }
                    NavigationLink("Privacidade & Dados") {
                        Text("Privacy — TODO")
                    }
                    NavigationLink("Plano & Assinatura") {
                        Text("Subscription — TODO")
                    }
                }
            }
            .navigationTitle("Perfil")
        }
    }
}
