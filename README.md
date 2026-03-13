# VitalAI

Seu companheiro proativo de saúde.

VitalAI é um assistente proativo de saúde que combina dados de smartwatch, inteligência artificial e feedback contínuo do usuário para entregar orientações personalizadas no momento certo.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **iOS App** | Swift + SwiftUI (MVVM) |
| **Apple Watch** | WatchKit + SwiftUI |
| **iOS Widgets** | WidgetKit |
| **Backend** | Node.js 22 + TypeScript + Fastify |
| **Databases** | PostgreSQL + TimescaleDB + MongoDB + Redis |
| **AI** | Claude API (text generation only) |
| **Notifications** | Firebase Cloud Messaging (FCM) |
| **Auth** | Auth0/Clerk + OAuth 2.0 + PKCE |
| **Cloud** | Google Cloud Platform (GKE) |

## Project Structure

```
VitalAI/
├── docs/           # Product spec, architecture, design prompts
├── design/         # 49 UI screens (PNG + HTML) from Google Stitch
├── ios/            # iOS app (iPhone + Watch + Widget targets)
├── backend/        # Node.js + TypeScript API
├── infra/          # Docker Compose, Kubernetes, Terraform
└── .github/        # CI/CD workflows
```

## Quick Start

### Backend
```bash
cd infra && docker-compose up -d    # Start Postgres, MongoDB, Redis
cd backend && npm install && npm run dev
```

### iOS
Open `ios/VitalAI.xcodeproj` in Xcode and run on simulator.
