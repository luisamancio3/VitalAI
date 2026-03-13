# VitalAI - Documentacao Tecnica de Arquitetura

**Engineering Reference v1.0**

**Classificacao:** Confidencial — Interno
**Versao:** 1.0 — Marco 2026

Este documento descreve a arquitetura tecnica completa do VitalAI, incluindo stack de tecnologia, decisoes de design, fluxos de dados, integracoes de wearables, pipeline de ML on-device, infraestrutura de notificacoes e modelo de dados. Serve como referencia primaria para engenheiros na construcao do produto.

---

## 1. Visao Geral da Arquitetura

O VitalAI e composto por cinco camadas tecnicas interdependentes. Cada camada tem responsabilidades bem definidas e interfaces de comunicacao claras. O principio central de design e: processar o maximo possivel on-device, transmitir apenas eventos classificados ao backend, e usar a nuvem para personalizacao e geracao de relatorios.

### Principios de Arquitetura

1. **Privacy by design** — dados biometricos brutos nao saem do dispositivo
2. **On-device first** — classificacao e trigger engine rodam no watch/phone antes de qualquer chamada de rede
3. **Event-driven** — o backend reage a eventos classificados, nao processa dados brutos em streaming continuo
4. **LLM apenas para geracao de texto** — toda logica de negocio em codigo; LLM so formata a saida final
5. **Stateless backend services** — microsservicos sem estado; estado do usuario apenas no banco de dados

### 1.1 Diagrama de camadas

| Camada | Componentes | Tecnologia |
|---|---|---|
| L1 — Sensor Layer | Apple Watch, Wear OS, Garmin — coleta FC, HRV, SpO2, acelerometro, temperatura | HealthKit, Health Connect, Garmin Connect IQ |
| L2 — On-Device Intelligence | Trigger Engine (regras -> ML), Meal Detector (gesture), Preference caching | Core ML (iOS) / LiteRT — ex-TensorFlow Lite (Android) |
| L3 — Mobile App | Hub de configuracao, historico, notificacoes, camera para identificacao de refeicao | Swift (iOS nativo) + Kotlin (Android nativo) |
| L4 — Backend Services | API Gateway, Trigger Processor, Nutrition Service, Report Generator, Preference Model | Node.js + TypeScript (MVP) / microsservicos futuros |
| L5 — AI & Data | LLM para geracao de texto (mensagens, relatorios), bancos de dados, pipelines de ML | Claude API, PostgreSQL, TimescaleDB, Redis |

### 1.2 Fluxo de dados — evento biometrico a notificacao

| Passo | Onde | O que acontece | Latencia alvo |
|---|---|---|---|
| 1 | Watch | Sensor coleta FC/HRV/acelerometro continuamente | < 1s (hardware) |
| 2 | Watch (on-device) | Trigger Engine classifica o evento (ex: FC normalizou apos pico) | < 200ms |
| 3 | Watch -> Phone | Evento classificado enviado via WatchConnectivity / BLE | < 500ms |
| 4 | Phone (on-device) | App confirma evento, verifica cooldown, enriquece com contexto (horario, GPS, perfil) | < 100ms |
| 5 | Phone -> Backend | Evento enriquecido enviado via HTTPS para Trigger Processor | < 300ms (LTE) |
| 6 | Backend | Trigger Processor consulta perfil do usuario, chama LLM para gerar mensagem personalizada | < 1.5s |
| 7 | Backend -> FCM/APNs | Mensagem enviada via Firebase Cloud Messaging (FCM) -> APNs para iOS | < 500ms |
| 8 | Phone | Notificacao exibida ao usuario, no momento certo | **Total: < 3s** |

---

## 2. Stack Tecnico Detalhado

Cada decisao de stack foi validada contra o que os principais players do mercado (MyFitnessPal, WHOOP, Oura, Fitbit) utilizam em producao, ajustada para o contexto de uma startup com equipe enxuta e necessidade de iteracao rapida.

### 2.1 Mobile — iOS (plataforma primaria do MVP)

| Componente | Tecnologia escolhida | Alternativas descartadas | Justificativa |
|---|---|---|---|
| Linguagem | Swift 6 | Objective-C, React Native | Acesso nativo ao HealthKit; performance maxima para processamento de sensores; suporte a Swift Concurrency (async/await) |
| Wearable data | HealthKit + WatchKit | Terceiros (Terra API, Vital) | API oficial da Apple; necessario para acesso a dados de saude no iOS; Apple HealthKit e local-only — requer app nativo |
| On-device ML | Core ML + Create ML | TensorFlow Lite | Framework nativo Apple; usa Neural Engine do chip; suporte a modelos PyTorch/TensorFlow convertidos via coremltools; zero latencia de rede |
| Notificacoes | APNs via FCM SDK | APNs direto | FCM como broker unificado iOS+Android; evita dois pipelines separados; SDK do Firebase simplifica token management |
| Comunicacao Watch | WatchConnectivity + WKExtendedRuntimeSession | — | API padrao Apple para transferencia Watch->Phone; WKExtendedRuntime para background processing no watch |
| Armazenamento local | Core Data + UserDefaults | SQLite puro, Realm | Integracao nativa com o ecossistema Apple; Core Data para preferencias e cache; UserDefaults para configuracoes simples |

### 2.2 Mobile — Android

| Componente | Tecnologia escolhida | Nota |
|---|---|---|
| Linguagem | Kotlin | Coroutines para async; linguagem oficial do Android moderno |
| Wearable data | Health Connect SDK (Jetpack) | Substituto oficial do Google Fit (deprecated em 2026); suporte a Wear OS nativo; mesmo modelo de permissoes que HealthKit |
| On-device ML | LiteRT (ex-TFLite) + ML Kit | LiteRT para modelos customizados (gesture detection); ML Kit para food recognition (imagem) com modelos pre-treinados |
| Notificacoes | FCM (nativo Android) | Firebase Cloud Messaging e a solucao nativa Android; mantem persistent connection via Google Play Services |
| Comunicacao Watch | Wear OS Data Layer API | API padrao Google para comunicacao phone-watch |

**Nota sobre Google Fit:** O Google esta depreciando as APIs do Google Fit a partir de 2026. Qualquer app de saude que hoje le do Google Fit precisa de um plano de migracao para o Health Connect. O VitalAI ja nasce com Health Connect como padrao, evitando divida tecnica.

### 2.3 Backend

| Servico | Tecnologia | Justificativa de mercado |
|---|---|---|
| Runtime | Node.js 22 + TypeScript | Stack dominante em health apps (MyFitnessPal, Noom usam Node); TypeScript elimina bugs de tipo em runtime; async/await natural para I/O pesado |
| API Gateway | Express.js + Fastify (rotas criticas) | Fastify 5x mais rapido que Express para endpoints de alta frequencia (ingestion de eventos biometricos) |
| Autenticacao | Auth0 / Clerk + JWT | OAuth 2.0 + PKCE para mobile; SSO para B2B futuro; JWTs de curta duracao (15min) + refresh tokens |
| Containerizacao | Docker + Kubernetes (GKE) | Padrao de mercado para health apps com compliance; escalonamento automatico em picos matinais (wake events) |
| CI/CD | GitHub Actions + ArgoCD | Pipeline automatizado: lint -> test -> build Docker -> deploy Kubernetes; rollback automatico em falhas |
| Monitoramento | Datadog APM + Sentry | Monitoramento de latencia do LLM, erros de integracao com HealthKit; alertas em p99 > 3s para notificacoes |

### 2.4 Bancos de dados

A estrategia de banco de dados utiliza tres tecnologias distintas, cada uma otimizada para um padrao de acesso diferente — pratica consolidada em apps de saude de alta escala:

| Banco | Tipo | Dados armazenados | Justificativa |
|---|---|---|---|
| PostgreSQL 16 | Relacional (OLTP) | Perfis de usuario, preferencias nutricionais, planos de assinatura, historico de refeicoes confirmadas, configuracoes de trigger | ACID compliance essencial para dados de saude; JOINs eficientes para consultas do preference model; MyFitnessPal migrou para Postgres por confiabilidade |
| TimescaleDB | Time-series (extensao PG) | Series temporais de eventos biometricos classificados (FC, HRV, SpO2, stress score, atividade) — comprimidos por usuario | Extensao do Postgres; queries temporais 10-100x mais rapidas que Postgres puro; compressao automatica de dados antigos; padrao para dados de wearables em producao |
| MongoDB | Document (NoSQL) | Catalogo de receitas e alimentos (schema flexivel: macros, ingredientes, variacoes), logs de feedback nutricional, configuracoes dinamicas de triggers | Schema-less ideal para catalogo de alimentos onde campos variam por tipo; MyFitnessPal usa MongoDB para seus 14M+ itens alimentares |
| Redis 7 | Cache in-memory | Cache de perfil do usuario (TTL 5min), cooldown de triggers (evitar spam de notificacoes), sessoes de autenticacao, rate limiting por usuario | Sub-milissegundo para consultas que ocorrem em toda notificacao enviada; essencial para manter latencia < 3s do pipeline |

### 2.5 Infraestrutura de Cloud

| Componente | Servico (GCP primario) | Alternativa AWS equivalente |
|---|---|---|
| Compute | Google Kubernetes Engine (GKE) | Amazon EKS |
| Banco relacional | Cloud SQL for PostgreSQL | Amazon RDS |
| Time-series | TimescaleDB em Cloud SQL | Amazon Timestream |
| Document DB | MongoDB Atlas (multi-cloud) | DocumentDB |
| Cache | Memorystore for Redis | ElastiCache |
| Object storage | Cloud Storage (fotos de refeicoes, relatorios PDF) | Amazon S3 |
| CDN | Cloud CDN | CloudFront |
| Notificacoes | Firebase Cloud Messaging (FCM) | — |
| Secrets | Secret Manager | AWS Secrets Manager |
| Logs | Cloud Logging + Datadog Agent | CloudWatch + Datadog |

**Por que GCP como primario?**

Firebase (FCM) faz parte do ecossistema GCP, simplificando autenticacao e billing. O Google Health Connect e produto Google, facilitando suporte futuro. Alem disso, Cloud SQL for PostgreSQL tem pricing mais previsivel para startups early-stage do que Aurora na AWS.

---

## 3. On-Device Machine Learning

Tanto Apple quanto Google investiram pesadamente em frameworks de ML nativo nos ultimos anos. O VitalAI usa esses frameworks como camada primaria de inteligencia — reduzindo latencia, eliminando custos de API para inferencia e preservando privacidade do usuario.

### 3.1 Core ML (iOS)

Core ML e o framework de ML da Apple, disponivel desde iOS 11. Em 2024, recebeu suporte a modelos Transformer e uma nova Async Prediction API. Os modelos rodam no Neural Engine do chip (A-series/M-series), que tem throughput especifico para operacoes matriciais sem drenar CPU ou bateria.

| Caracteristica | Core ML — iOS |
|---|---|
| Formato de modelo | `.mlpackage` / `.mlmodel` — convertido de PyTorch ou TensorFlow via coremltools (Python) |
| Hardware target | Neural Engine (prioridade) -> GPU -> CPU (fallback automatico) |
| Update de modelo sem App Store | Sim — via MLModelCollection + Background Assets (download em background) |
| Privacidade | Dados nunca saem do dispositivo para inferencia; sem chamada de rede |
| Quantizacao | FP16 e INT8 suportados; modelo de 250MB vira 125MB em FP16 sem perda perceptivel de acuracia |
| Casos de uso no VitalAI | Gesture detection (meal eating), classificacao de eventos biometricos, inferencia de contexto pos-treino |

### 3.2 LiteRT — ex-TensorFlow Lite (Android)

Em 2024, o Google renomeou o TensorFlow Lite para LiteRT (Lite Runtime), expandindo suporte alem de TensorFlow para PyTorch, JAX e Keras. Roda em mais de 2,7 bilhoes de dispositivos. E a escolha dominante para on-device ML em Android.

| Caracteristica | LiteRT — Android |
|---|---|
| Formato de modelo | `.tflite` — convertido de TensorFlow, PyTorch, ou JAX via AI Edge converter |
| Hardware target | NNAPI (Neural Networks API do Android) -> GPU -> CPU (fallback) |
| On-device training | Suportado desde TF 2.7 — permite personalizar modelo sem dados sairem do dispositivo |
| Consumo de bateria | Projetado para minimo consumo; health/fitness trackers sao o caso de uso primario |
| ML Kit | Camada de alto nivel do Google com modelos pre-treinados; usado no VitalAI para food photo recognition |
| Casos de uso no VitalAI | Gesture detection (meal eating), activity recognition, food classification via camera |

### 3.3 Trigger Engine — evolucao em fases

O Trigger Engine detecta contextos biometricos e dispara acoes. Comeca com regras simples e evolui para ML personalizado por usuario:

| Fase | Mecanismo | Periodo | Precisao esperada |
|---|---|---|---|
| MVP — Regras deterministicas | Thresholds hard-coded: ex. FC < 90 por 5min apos ter sido > 130 = "fim de treino". Simples, rapido de implementar e depurar. | Meses 1–3 | ~70% relevancia |
| Alpha — Regras com contexto | Regras enriquecidas com horario, historico recente, dia da semana. Ex: "fim de treino" so dispara se durou > 15min E horario e entre 6h–22h. | Meses 4–6 | ~80% relevancia |
| Beta — Modelo supervisionado | Core ML / LiteRT treinado com dados do proprio usuario + feedback de relevancia das notificacoes. Modelo leve (~200KB) treinado no backend, deployado on-device. | Meses 7–9 | ~88% relevancia |
| v1.x — Federated / on-device training | LiteRT on-device training: modelo se atualiza com cada feedback sem dados sairem do dispositivo. Cada usuario tem modelo personalizado. | Ano 2 | ~92%+ relevancia |

### 3.4 Meal Gesture Detection — pipeline on-device

O modelo de deteccao de gesto alimentar (mao-boca) roda inteiramente no dispositivo. Pesquisas publicadas (MDPI/PMC) atingem precisao de 85% e recall de 81% com hardware de prateleira — sem sensores extras.

| Etapa | Componente | Detalhe tecnico |
|---|---|---|
| Coleta | Acelerometro 3-eixos + Giroscopio | Janelas de 15s de dados de movimento. Watch coleta a 50Hz. Sem transmissao de dados brutos ao backend. |
| Classificacao | Core ML (iOS) / LiteRT (Android) — modelo leve de gesture recognition | Threshold de confianca configuravel. MVP: 0.85 (conservador para reduzir falsos positivos). Modelo ~800KB apos quantizacao INT8. |
| Falsos positivos | Heuristicas de contexto como segunda camada de filtragem | Se o usuario ja comeu ha < 45min -> ignora. Se horario entre 23h–5h -> ignora. Se atividade fisica ativa -> ignora. |
| Evento para o app | Watch -> Phone via WatchConnectivity / Wear Data Layer | Apenas o evento classificado (JSON ~200 bytes) e transmitido. Nunca os dados brutos de acelerometro. |
| Personalizacao | Feedback do usuario realimenta o modelo | Cada confirmacao/rejeicao do usuario atualiza o modelo local. Em Android: LiteRT on-device training direto. Em iOS: modelo atualizado via background download. |

**Diferencial tecnico do Meal Detector**

A personalizacao por usuario e o diferencial mais defensavel: cada pessoa tem padroes unicos de gesto alimentar (velocidade, amplitude, posicao do pulso). Um modelo calibrado para o usuario especifico atinge acuracia significativamente superior ao modelo generico. Isso cria um efeito de flywheel: quanto mais o usuario usa, mais preciso fica, mais dificil de replicar.

---

## 4. Integracoes de Wearables

A integracao com wearables e um dos maiores desafios tecnicos em health apps. Cada fabricante tem SDKs, OAuth flows e schemas de dados distintos. A pesquisa de mercado mostra que a integracao direta de multiplos wearables demora 3–6 meses; usar uma camada de normalizacao reduz para 2–3 semanas.

### 4.1 Plataformas suportadas por fase

| Plataforma | SDK / API | Dados disponiveis | Fase de suporte |
|---|---|---|---|
| Apple HealthKit + Watch | HealthKit (iOS nativo) + WatchKit + WKExtendedRuntimeSession | FC, HRV, SpO2, temperatura corporal, sono (fases), calorias ativas, ECG, passos, mindfulness, acelerometro via WatchKit | MVP (meses 1–3) |
| Google Health Connect + Wear OS | Health Connect Jetpack SDK (Android) + Wear OS Data Layer API | FC, HRV, sono, temperatura de pele, exercicios, passos, SPO2, dados medicos em FHIR format | Alpha (meses 4–6) |
| Garmin Connect IQ | Garmin Health API (REST OAuth 2.0) + Connect IQ SDK | FC, HRV, stress score (algoritmo proprio), body battery, SpO2, VO2 max, sono, calorias | Beta (meses 7–9) |
| Oura Ring | Oura Cloud API (REST OAuth 2.0) | Readiness score, sono detalhado, HRV, temperatura, FC repouso — alta acuracia, referencia em pesquisas cientificas | v1.x (Ano 2) |
| WHOOP | WHOOP Developer Platform (REST) | Strain score, recovery, sono, HRV — focado em atletas; API ainda em maturacao com alguns dados restritos | v1.x (Ano 2) |

### 4.2 Padroes de integracao por plataforma

Apple HealthKit e Google Health Connect usam modelo pull via SDK nativo — nao ha API REST; o app deve ser nativo para acessar dados. Garmin e Oura usam REST com OAuth 2.0, onde o usuario autentica via browser e o token e armazenado no backend.

| Plataforma | Modelo de acesso | Consideracao critica |
|---|---|---|
| Apple HealthKit | SDK nativo iOS — HKObserverQuery para dados em tempo real + HKAnchoredObjectQuery para sync incremental | LOCAL ONLY: sem API backend. App nativo iOS obrigatorio. Dados ficam no iPhone. Observer roda em background com permissao explicita do usuario. |
| Google Health Connect | SDK Android (Jetpack Health Connect Library v1.1.0) — callbacks + polling | Substitui Google Fit (deprecated 2026). Permissoes granulares por tipo de dado. Suporte a FHIR para dados medicos. Requer Android 9+. |
| Garmin | REST API + OAuth 2.0 — webhook push quando ha novos dados de saude | Setup OAuth mais complexo segundo desenvolvedores. Ideal para apps voltados a atletas. Dados disponiveis com delay de minutos (nao real-time). |
| Oura / WHOOP | REST API + OAuth 2.0 — polling diario para dados do dia anterior | Oura: acuracia de HRV e sono muito acima da media, usada em pesquisas cientificas. WHOOP: API nova, alguns dados restritos a parceiros. |

### 4.3 Normalizacao de dados biometricos

Cada plataforma retorna os mesmos dados em schemas e unidades diferentes. O Normalization Service no backend converte tudo para o schema canonico do VitalAI:

**Schema canonico — BiometricEvent**

```json
{
  "userId": "uuid",
  "timestamp": "ISO-8601",
  "source": "apple_watch | wear_os | garmin | oura | whoop",
  "heartRate": { "bpm": 72, "confidence": 0.95 },
  "hrv": { "rmssd_ms": 45, "confidence": 0.90 },
  "sleep": {
    "durationMin": 408,
    "efficiency": 0.85,
    "deepMin": 92,
    "remMin": 110,
    "score": 72
  },
  "activity": {
    "steps": 8420,
    "calsBurned": 380,
    "movingMinutes": 42,
    "workoutType": "running"
  },
  "stress": { "score_0_to_100": 62, "source_algorithm": "hrv_derived" },
  "context": { "timeOfDay": "morning", "dayType": "workday", "recentMeals": 1 }
}
```

O campo `source` identifica a origem. O Trigger Engine opera exclusivamente sobre o schema canonico — agnostico ao wearable do usuario. Isso permite suportar novos wearables sem alterar a logica de trigger.

---

## 5. Pipeline de Notificacoes

Notificacoes sao o produto principal do VitalAI. O pipeline de entrega precisa ser confiavel, rapido (< 3s end-to-end) e inteligente o suficiente para evitar notification fatigue — o principal motivo de desinstalacao em health apps.

### 5.1 Arquitetura FCM + APNs

O padrao de mercado consolidado para apps mobile e Firebase Cloud Messaging (FCM) como broker unificado, que gerencia APNs para iOS e Android Transport Layer (ATL) para Android. Isso elimina dois pipelines separados e simplifica o token management.

| Componente | Responsabilidade | Tecnologia |
|---|---|---|
| Trigger Processor (backend) | Recebe evento biometrico, consulta perfil, decide se dispara notificacao, gera payload | Node.js service |
| LLM Message Generator | Gera texto personalizado da notificacao (temperatura, contexto, sugestao) dado o evento e perfil | Claude API — claude-sonnet-4-6 |
| FCM Backend | Recebe request do servidor, gerencia filas, faz fanout para multiplos dispositivos do usuario | Firebase Cloud Messaging |
| APNs (Apple) | Entrega final para dispositivos iOS via persistent HTTP/2 connection | Apple Push Notification service |
| ATL (Android) | Entrega final para dispositivos Android via Google Play Services | Android Transport Layer |
| Token Manager (backend) | Armazena e atualiza FCM tokens; limpa tokens expirados (> 270 dias de inatividade) | Redis + PostgreSQL |

### 5.2 Tipos de notificacao e tratamento por plataforma

| Tipo | iOS (APNs) | Android (FCM) | Caso de uso no VitalAI |
|---|---|---|---|
| Notification message | Exibida automaticamente pelo OS mesmo com app fechado | Idem — OS exibe diretamente | Mensagem matinal de sono, alerta de estresse, lembrete de movimento |
| Data message (silent) | App acordado em background para processar — iOS gatea baseado em bateria/memoria/app state | Background execution; Android permite force-stop que bloqueia background | Sync de preferencias, update de modelo ML, pre-fetch de sugestoes nutricionais |
| Notification + data payload | Combinado: OS exibe, app recebe dados no handler | Idem | Sugestao de refeicao pos-treino com dados de macros para abrir diretamente no app |

**Cuidado com silent push no iOS**

Apple gatea notificacoes silenciosas (silent push) baseado em memoria disponivel, nivel de bateria e hora do dia. O iOS nao acorda processos em background para silent push se o usuario forcou o fechamento do app. Para o VitalAI, o design e: notificacoes visiveis para acoes urgentes; data messages apenas para sincronizacao nao-critica que pode ser atrasada.

### 5.3 Anti-fadiga e controle de frequencia

Notification fatigue e o principal motivo de desinstalacao de health apps segundo dados de mercado. A arquitetura do VitalAI implementa tres camadas de protecao:

| Camada | Mecanismo | Implementacao |
|---|---|---|
| Cooldown por tipo | Cada categoria de trigger tem um cooldown minimo configuravel | Redis key: `user:{id}:trigger:{type}:last_sent` — TTL = cooldown duration. Ex: "stress alert" cooldown = 4h |
| Budget diario | Limite total de notificacoes por dia por usuario | Configuravel por plano (Free: 4/dia, Premium: 8/dia). Contagem em Redis com TTL de 24h. Prioridade para eventos mais impactantes. |
| Janelas de silencio | Horarios configuraveis onde nenhuma notificacao e enviada | Usuario define janelas no onboarding (ex: 22h–7h). Verificado antes de todo dispatch. Padrao: respeita configuracoes de Foco do iOS. |
| Feedback de relevancia | Usuario pode avaliar se notificacao foi util diretamente no card da notificacao | Action buttons no payload APNs/FCM. Feedback alimenta o Trigger Engine para reduzir triggers irrelevantes para aquele usuario. |

---

## 6. Integracao com LLM

O LLM e usado exclusivamente para geracao de texto — nunca para logica de negocio. Toda decisao (qual trigger disparar, qual sugestao nutricional fazer, qual secao do relatorio preencher) e tomada por codigo deterministico. O LLM apenas formata o resultado em linguagem natural, personalizada e contextualizada.

**Principio fundamental: LLM como formatador, nao como raciocinio**

Motivo: LLMs tem latencia variavel, custo por token, e comportamento nao-deterministico. Para um sistema de saude que precisa ser confiavel e auditavel, toda decisao critica deve ser tomada por codigo. O LLM so entra quando a "resposta certa" ja foi calculada e so precisa ser apresentada de forma amigavel.

### 6.1 Casos de uso do LLM

| Caso de uso | Input para o LLM | Output esperado | Latencia alvo |
|---|---|---|---|
| Mensagem de notificacao | Tipo de evento, metricas biometricas chave, nome do usuario, contexto do dia, sugestao ja calculada, tom preferido | Texto conversacional de 1–3 frases; max 280 chars para notificacao | < 1.5s (p95) |
| Sugestao nutricional | Contexto biometrico, objetivo do usuario, ultimas refeicoes, restricoes, receita selecionada pelo sistema, macros ja calculados | Descricao apetitosa da refeicao + beneficio contextual (ex: "ideal pos-treino para recuperacao muscular") | < 2s (p95) |
| Relatorio semanal | Dados agregados da semana (sono, nutricao, atividade, HRV), comparacao com semana anterior, 3 insights pre-calculados pelo sistema | Texto de cada secao do relatorio em tom coach/conversacional; 3–5 paragrafos por secao | < 10s (assincrono, gerado em background no domingo) |
| Feedback de refeicao | Refeicao avaliada, estrelas, comentario do usuario, padrao de preferencias acumulado | Confirmacao curta + eventual ajuste na sugestao seguinte | < 1s |

### 6.2 Estrategias de custo e caching

Claude API cobra por token. Em escala, custo de LLM pode inviabilizar unit economics se nao for gerenciado. Estrategias implementadas:

| Estrategia | Detalhe | Economia estimada |
|---|---|---|
| Cache de mensagens similares | Redis armazena mensagens geradas por hash de (evento_type, HRV_range, hora_do_dia, objetivo). TTL = 2h. Usuarios com perfis similares recebem mesma mensagem. | ~40% reducao de chamadas LLM |
| Prompt com context window minimo | System prompt enxuto (< 200 tokens). Dados biometricos passados como JSON comprimido. Sem historico de conversa — cada notificacao e stateless. | Custo por chamada < 500 tokens |
| Relatorio assincrono em batch | Relatorios semanais gerados no domingo de madrugada (baixo trafego). Um unico request com todo o contexto da semana, nao N requests. | Custo fixo por usuario/semana |
| Fallback templates | Se LLM esta degradado (latencia > 3s ou erro), sistema usa template pre-fabricado com valores interpolados. Qualidade menor mas entrega garantida. | Garante SLA mesmo com falha de LLM |

### 6.3 Prompt engineering — padrao de mensagem de notificacao

**System prompt (< 200 tokens):**

```
Voce e o VitalAI, um coach de saude pessoal. Gere mensagens de notificacao
em portugues, tom conversacional e encorajador, maximo 280 caracteres.
Nunca use emojis em excesso. Nunca faca afirmacoes medicas.
Inclua a sugestao de acao fornecida.
```

**User message (gerado por codigo):**

```
Evento: pos_treino | FC normalizada: 78bpm | Duracao treino: 42min |
Usuario: Luis | Sugestao do sistema: wrap_frango_arroz |
Macros: 45g proteina 62g carb 12g gordura | Hora: 18h30 |
Objetivo: ganho de massa
```

---

## 7. Modelo de Dados

### 7.1 Entidades principais — PostgreSQL

| Entidade | Campos chave | Relacoes |
|---|---|---|
| `users` | id (UUID), email, name, plan, created_at, last_active_at, lgpd_consent_at | 1:1 com user_profiles, 1:N com meals, biometric_events, reports |
| `user_profiles` | user_id, goal (enum), dietary_restrictions (array), cooking_level, notification_budget, quiet_hours_start/end, baseline_hrv, baseline_resting_hr | 1:1 com users |
| `meals` | id, user_id, timestamp, recipe_id, detection_source (gesture/photo/manual/inferred), confirmed (bool), macros_json, feedback_stars, feedback_text | N:1 com users, N:1 com recipes |
| `recipes` | id, name_pt, name_en, macros_json, ingredients_json, prep_time_min, tags (array), cuisine_type, image_url, source | Catalogo — 200 receitas no MVP |
| `trigger_events` | id, user_id, trigger_type (enum), fired_at, notification_sent (bool), user_feedback (relevant/irrelevant/dismissed) | 1:N com users; base para analise de precision do Trigger Engine |
| `reports` | id, user_id, period (week/month), start_date, end_date, content_json (secoes geradas pelo LLM), generated_at, pdf_url | 1:N com users |
| `user_preference_model` | user_id, recipe_embeddings (vector), disliked_ingredients (array), preferred_times (json), model_version, updated_at | 1:1 com users; atualizado pelo Preference Model service |

### 7.2 Time-series — TimescaleDB

TimescaleDB e uma extensao do PostgreSQL especializada em series temporais. Queries temporais sao 10–100x mais rapidas que Postgres puro. Dados biometricos brutos ficam on-device; apenas eventos classificados sao armazenados:

**Hypertable: biometric_events**

```sql
CREATE TABLE biometric_events (
  user_id       UUID          NOT NULL,
  time          TIMESTAMPTZ   NOT NULL,
  source        TEXT          NOT NULL,
  heart_rate_bpm SMALLINT,
  hrv_rmssd     SMALLINT,
  spo2_pct      SMALLINT,
  stress_score  SMALLINT,
  activity_type TEXT,
  steps         INT,
  sleep_score   SMALLINT,
  context       JSONB
);

-- Chunk interval: 1 dia
-- Compressao automatica apos 7 dias
-- Retencao: 2 anos
```

Queries tipicas: "media de HRV dos ultimos 7 dias para gerar relatorio semanal", "baseline de FC repouso dos ultimos 30 dias para calibrar trigger de estresse". TimescaleDB tem funcoes nativas para essas agregacoes temporais (`time_bucket`, `first`, `last`).

### 7.3 LGPD / GDPR — compliance desde o schema

| Obrigacao | Implementacao tecnica |
|---|---|
| Consentimento explicito | Campo `lgpd_consent_at` em users — null = nao consentiu. Toda query verifica `consent_at IS NOT NULL` para dados sensiveis. |
| Direito ao esquecimento | Endpoint `DELETE /users/:id` dispara job assincrono: anonimiza biometric_events (substitui user_id por hash), deleta meals/reports/profile. Prazo: 72h conforme LGPD. |
| Portabilidade de dados | Endpoint `GET /users/:id/export` gera ZIP com todos os dados em JSON/CSV. Disponivel no app para usuarios Premium e Pro. |
| Minimizacao de dados | Dados biometricos brutos nunca chegam ao backend — apenas eventos classificados. Logs de notificacao retidos por 90 dias depois deletados. |
| Dados sensiveis | Campos de saude criptografados em repouso (AES-256 no banco). Transmissao apenas via TLS 1.3. Sem venda de dados individuais para terceiros — jamais. |

---

## 8. Seguranca

### 8.1 Autenticacao e autorizacao

| Componente | Mecanismo | Detalhe |
|---|---|---|
| Auth mobile | OAuth 2.0 + PKCE (Proof Key for Code Exchange) | PKCE obrigatorio para apps mobile — previne authorization code interception. Implementado via Auth0 ou Clerk. |
| Tokens de acesso | JWT de curta duracao (15 min) + Refresh Token (30 dias) | Access token nunca armazenado em disco — apenas em memoria. Refresh token em Keychain (iOS) / Keystore (Android). |
| API authorization | JWT no header `Authorization: Bearer`. Cada servico valida assinatura RS256. | Claims do JWT incluem user_id, plan, e scopes. Middleware de auth em todo gateway. |
| B2B futuro | API Keys para parceiros corporativos + rate limiting por key | Chaves rotacionaveis; escopo limitado (ex: apenas leitura de metricas agregadas). |

### 8.2 Superficie de ataque e mitigacoes

| Vetor | Risco | Mitigacao |
|---|---|---|
| API injection | SQL injection via parametros de query | ORM com queries parametrizadas (Prisma / TypeORM). Nunca interpolacao de string em SQL. |
| Data exfiltration | Vazamento de dados biometricos em massa | Row-level security no PostgreSQL: usuario so acessa seus proprios dados. Auditoria de queries sensiveis. |
| FCM token hijacking | Token de notificacao roubado -> spam ou phishing | Tokens armazenados hasheados no backend. Rotacao automatica de tokens expirados. Payload de notificacao nao contem dados sensiveis. |
| LLM prompt injection | Usuario injeta instrucoes via campo de feedback de refeicao | Sanitizacao de todos inputs antes de compor prompt. System prompt claramente delimita dados do usuario. Output do LLM sanitizado antes de exibir. |
| Replay attack | Reutilizacao de request autenticado antigo | JWT com exp claim curto (15min). Timestamps em todos eventos biometricos verificados no backend (+/- 5 min de drift permitido). |

---

## 9. Observabilidade e SLAs

### 9.1 SLAs do pipeline de notificacoes

| Metrica | Target | Alerta |
|---|---|---|
| Latencia end-to-end (evento -> notificacao) | p50 < 2s / p95 < 3s / p99 < 5s | > 3s no p95 por 5min -> PagerDuty |
| Latencia LLM (geracao de mensagem) | p50 < 1s / p95 < 2s | > 2.5s por 3min -> fallback para template automatico |
| Taxa de entrega de notificacoes | > 98% (FCM confirmation) | < 95% por 10min -> investigar tokens expirados |
| Disponibilidade da API | > 99.9% (< 8.7h downtime/ano) | Downtime > 5min -> alerta on-call |
| Precisao do Trigger Engine | > 75% relevancia (feedback positivo do usuario) | Queda abaixo de 60% por 1 semana -> revisao das regras |

### 9.2 Metricas de produto monitoradas

| Metrica | Como medir | Threshold MVP |
|---|---|---|
| DAU / MAU ratio | Eventos de sessao no app + abertura de notificacao | > 40% DAU (hipotese central do MVP) |
| Notification open rate | FCM delivery_receipt vs. app_open event | > 35% (benchmark mercado: 15–20%) |
| Meal detection accuracy | % de deteccoes confirmadas pelo usuario sem correcao | > 70% no MVP; > 85% apos 2 semanas de uso |
| Nutrition module retention | % usuarios que loggam refeicao por 7 dias consecutivos | > 50% (vs. < 20% com input manual puro) |
| Report open rate | % usuarios que abrem o relatorio semanal | > 60% (ancora de valor do plano Premium) |
| Churn por notification fatigue | % usuarios que desativam notificacoes nos primeiros 30 dias | < 15% |

### 9.3 Ferramentas de observabilidade

| Camada | Ferramenta | O que monitora |
|---|---|---|
| APM (Application Performance) | Datadog APM | Traces de cada request, latencia de LLM, latencia de DB, erros por endpoint |
| Error tracking | Sentry | Crashes iOS/Android, excecoes backend, alertas em tempo real com stack trace |
| Logs centralizados | Cloud Logging + Datadog Log Management | Logs estruturados (JSON) de todos os servicos; queries para investigacao de incidentes |
| Metricas de produto | Amplitude (analytics) | Funil de onboarding, retencao por coorte, feature adoption, notification engagement |
| Uptime externo | Checkly + PagerDuty | Ping a cada 1min nos endpoints criticos; alerta em < 2min se fora do ar |
| Alertas | PagerDuty (on-call rotation) | Recebe alertas do Datadog e Checkly; escala para engenheiro de plantao |

---

## 10. Registro de Decisoes de Arquitetura (ADR)

Architecture Decision Records documentam as principais escolhas tecnicas, o contexto em que foram feitas e as alternativas consideradas. Essencial para onboarding de novos engenheiros e para revisitar decisoes conforme o produto cresce.

| ADR | Decisao | Alternativas consideradas | Justificativa |
|---|---|---|---|
| ADR-001 | Swift nativo para iOS no MVP (nao React Native) | React Native, Flutter | HealthKit exige app nativo iOS. React Native sem acesso direto a WatchKit. Flutter com suporte a wearables ainda imaturo. Custo de bridge JavaScript para operacoes de sensor seria proibitivo em battery life. |
| ADR-002 | Monolito modular no MVP, nao microsservicos | Microsservicos desde o inicio | Time de 4 pessoas nao consegue operar multiplos servicos com deploy independente. Monolito com bounded contexts claros escala para microsservicos quando ha equipes separadas por dominio. Decisao revisavel no Ano 2. |
| ADR-003 | TimescaleDB para series temporais (extensao do Postgres) | InfluxDB, AWS Timestream, MongoDB time-series | TimescaleDB roda no mesmo Postgres — sem novo banco para operar. Familiares para qualquer dev backend. JOINs com tabelas relacionais funcionam nativamente. InfluxDB exigiria novo paradigma de query (Flux). |
| ADR-004 | FCM como broker unificado (iOS + Android) | APNs direto no iOS + FCM no Android | FCM como broker elimina dois pipelines. Token management unificado em uma tabela. SDK do Firebase simplifica implementacao mobile. Desvantagem minima: adiciona ~100ms de latencia vs. APNs direto. |
| ADR-005 | LLM apenas para geracao de texto; logica em codigo | LLM como agente de decisao (ex: decidir qual trigger disparar) | LLM como agente aumenta latencia, custo, e nao-determinismo. Para um sistema de saude, auditabilidade e critica. Usuario precisa conseguir explicar por que recebeu uma notificacao — o que e impossivel com LLM como decisor. |
| ADR-006 | GCP como cloud primario | AWS, Azure | Firebase (FCM + Analytics) nativo no GCP. Health Connect e produto Google. BigQuery para analytics futuro. Pricing mais previsivel para startups early-stage com creditos de aceleradoras. |
