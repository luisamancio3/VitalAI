# VitalAI - Documento de Visao Geral do Produto

**Versao 1.0 - Marco de 2026**

---

## Sobre este documento

Este documento descreve a visao completa do VitalAI — um assistente proativo de saude que combina dados de smartwatch, inteligencia artificial e feedback continuo do usuario para entregar orientacoes personalizadas no momento certo. O documento cobre a proposta de valor, analise de mercado, arquitetura de produto, stack tecnica e roadmap de desenvolvimento.

---

## 1. O Problema e a Visao

### 1.1 O problema real

Pessoas com smartwatches acumulam uma quantidade enorme de dados sobre sua saude — sono, frequencia cardiaca, HRV, calorias, passos, estresse. O problema e que esses dados ficam presos em dashboards que o usuario precisa abrir ativamente, interpretar sozinho e traduzir em acao.

O resultado e um ciclo de baixo engajamento:

> Dado gerado -> Usuario abre o app -> "E dai?" -> Esquece e repete amanha

Nao falta dado. Falta um intermediario inteligente que transforme dado em conversa, e conversa em habito.

### 1.2 A visao do VitalAI

> "E se o seu smartwatch pudesse te conhecer tao bem que soubesse quando te falar, o que dizer, e como ajudar — sem voce precisar perguntar?"

O VitalAI e um assistente proativo de saude que:

- Monitora seus indicadores biometricos em tempo real via smartwatch
- Detecta automaticamente contextos relevantes (acordar, terminar treino, stress elevado, inatividade prolongada)
- Inicia conversas e envia sugestoes no momento certo — sem o usuario precisar abrir o app
- Aprende com os feedbacks do usuario para se tornar progressivamente mais personalizado
- Gera relatorios semanais e mensais com linguagem de coach, nao de planilha

---

## 2. O Produto

### 2.1 Funcionalidades principais

#### Deteccao proativa de contexto

O nucleo do produto e um motor de eventos biometricos que roda em background e dispara acoes da IA baseadas em gatilhos do wearable:

| Contexto detectado | Gatilho biometrico | Acao da IA |
|---|---|---|
| Acordou | FC estabilizou + movimento detectado | Mensagem com resumo do sono |
| Treino encerrado | FC voltou ao normal apos pico | Sugestao de refeicao pos-treino |
| Stress elevado | HRV caiu abaixo da baseline | Alerta + sugestao de pausa ou respiracao |
| Inatividade longa | 90min+ sem movimento durante o dia | Lembrete leve para se movimentar |
| Sonecou mal | HRV baixo + sono < 6h | Ajuste nas sugestoes do dia (treino leve, refeicao energetica) |
| Hidratacao em risco | Temperatura alta + treino pesado | Lembrete de hidratacao |

#### Modulo de nutricao com loop de feedback

No onboarding, o usuario configura seu perfil nutricional: objetivo (emagrecimento, ganho de massa, performance, saude geral), restricoes alimentares, preferencias e nivel de preparo culinario disponivel. A partir dai, o sistema:

1. Sugere refeicoes contextualizadas com base no que aconteceu no dia (treino pesado, dias de descanso, manhas com sono ruim)
2. Detecta automaticamente quando o usuario esta se alimentando — sem input manual — e abre o contexto de registro
3. Coleta feedback simples apos cada refeicao — confirmacao rapida ou avaliacao de 1 a 5 com comentario opcional
4. Aprende padroes de preferencia ao longo do tempo (texturas, horarios, combinacoes)
5. Ajusta continuamente o catalogo de sugestoes para o perfil individual
6. Inclui dados nutricionais estimados para cada sugestao (proteina, carboidrato, gordura, calorias)

#### Deteccao automatica de refeicao — o fim do input manual

O registro manual de refeicoes e o principal motivo de abandono em apps de nutricao. O VitalAI resolve isso atraves de uma estrategia em camadas que elimina progressivamente a friccao conforme o uso avanca:

| Camada | Mecanismo | Friccao para o usuario |
|---|---|---|
| 1 — Deteccao por gesto (watch) | Acelerometro + giroscopio do smartwatch detectam o padrao de movimento mao-boca da alimentacao. Pesquisas atingiram precisao de 85% e recall de 81% em condicoes reais com hardware de prateleira — sem dispositivo extra. | Zero — passivo, roda em background |
| 2 — Foto rapida (opcional) | Ao detectar refeicao, app abre camera com 1 toque. IA de visao computacional identifica alimentos e estima macros automaticamente a partir da foto do prato. | Muito baixa — 5 segundos |
| 3 — Confirmacao de rotina aprendida | Apos 2–3 semanas, o app reconhece refeicoes habituais por horario + localizacao. Pergunta: "Almoco de sempre?" — 1 toque para confirmar. | Minima — 1 toque |
| 4 — Inferencia por contexto biometrico | Com historico suficiente, a IA infere a refeicao mais provavel com base nos padroes do usuario e sugere para confirmacao. Sem abrir o app. | Quase zero — apenas corrigir se errado |

A estrategia nao e eliminar 100% da friccao desde o inicio — e reduzir ao ponto onde nao interrompe o fluxo da vida. Uma confirmacao de 1 toque apos deteccao automatica resolve 80% do problema. O restante evolui naturalmente com o uso.

**Por que nao 100% automatico?**

Um sistema completamente passivo eliminaria o engajamento ativo com o produto. A confirmacao rapida mantem o usuario consciente do que come, reforca o habito alimentar e garante a qualidade dos dados que alimentam o relatorio semanal. E um equilibrio intencional entre conveniencia e engajamento.

#### Relatorio semanal de saude

Todo domingo, o usuario recebe um relatorio completo gerado pela IA com linguagem conversacional — como se um coach tivesse revisado a semana junto com ele. O relatorio cobre sono, nutricao, atividade fisica e bem-estar geral, e termina com 3 focos concretos para a semana seguinte.

No final de cada mes, um resumo mensal consolida tendencias de longo prazo e evolucao em relacao aos objetivos declarados.

### 2.2 Experiencia do usuario

A interface do VitalAI e deliberadamente minimalista no telefone — o produto vive principalmente nas notificacoes e no wearable. O usuario nao precisa "abrir o app para ver seus dados"; os insights chegam ate ele no momento certo.

**Fluxo tipico de um dia:**

**07h12** — VitalAI detecta que voce acordou

> "Bom dia, Luis! Voce dormiu 6h48min com qualidade 72. Seu HRV esta um pouco abaixo do normal — o dia de hoje pede energia moderada. Cafe da manha sugerido: ovo mexido com pao integral e uma fruta. Quer essa ou prefere outra opcao?"

**18h30** — Smartwatch detecta fim de treino (corrida, 42min)

> "Otimo treino! Voce queimou ~380kcal. Para recuperacao, o ideal e proteina + carboidrato em ate 45min. Que tal um wrap de frango com arroz? Leva 15min."

**21h45** — HRV cai 18% abaixo da baseline do usuario

> "Percebi que voce esta com o estresse um pouco elevado agora. Que tal 5 minutos de respiracao antes de dormir? Seu sono vai agradecer."

### 2.3 Plataformas e integracoes

| Componente | Detalhes |
|---|---|
| App mobile | iOS e Android — hub de configuracao, historico, feedbacks e relatorios |
| Smartwatch | Apple Watch (HealthKit), Wear OS (Health Connect), Garmin Connect IQ |
| Dados biometricos | FC, HRV, SpO2, temperatura corporal, sono (fases), calorias, passos, estresse |
| Notificacoes | Push no celular e notificacoes nativas no wearable |
| Exportacao | Relatorio em PDF/DOCX para compartilhar com profissional de saude |

---

## 3. Mercado e Competicao

### 3.1 Tamanho de mercado

O mercado de digital health coaching foi avaliado em US$ 10,91 bilhoes em 2024 e deve atingir US$ 35,38 bilhoes ate 2034, com CAGR de 12,5% ao ano. Foram enviados mais de 534 milhoes de wearables globalmente em 2024.

| Segmento | Tamanho (2025) | Crescimento |
|---|---|---|
| Digital health coaching | US$ 12,25 bi | +12,5% ao ano |
| Wearables globais (unidades) | 534 mi enviadas/ano | +9% ao ano |
| Apps de fitness (downloads) | 370 mi downloads/ano | Top 10 em 2024 |
| Brasil — saude digital | R$ 8,4 bi | +18% ao ano |

### 3.2 Analise competitiva

| Produto | O que faz bem | O que falta |
|---|---|---|
| Sleep Cycle / SleepWatch | Tracking de sono profundo, relatorio matinal | So sono; nao conecta nutricao e treino; nao e proativo ao longo do dia |
| Oura Advisor | LLM conversacional com dados do anel | Reativo (usuario pergunta); hardware proprietario caro (anel ~US$300) |
| Fitbit + Google Gemini | Escala e integracao com ecossistema Google | Ainda em preview; nao e proativo; sem modulo nutricional com feedback |
| Apple Health+ (2026) | Ecossistema Apple Watch + iPhone | So para usuarios Apple; sem loop de feedback de refeicoes; ainda nao lancado |
| WHOOP Coach | Recovery e performance atletica | Focado em atletas; hardware proprietario; sem nutricao contextual |
| Thrive AI Health | Check-ins diarios por chat, motivacao | Reativo; sem deteccao de contexto via biometria em tempo real |
| **VitalAI** | **Proatividade via biometria + nutricao com feedback loop + relatorio** | — (o que estamos construindo) |

O diferencial competitivo central do VitalAI nao e um unico feature isolado — e a combinacao de tres elementos que nenhum player atual entrega juntos:

1. **Proatividade real via biometria** (a IA te aborda, nao o contrario)
2. **Loop de feedback nutricional** (sugestao -> feedback -> aprendizado -> sugestao melhor)
3. **Relatorio como entregavel de valor** (documento que o usuario pode levar para um profissional)

### 3.3 Publico-alvo

O VitalAI nao e para atletas de elite nem para doentes cronicos — e para o segmento do meio: pessoas saudaveis e ativas que ja usam wearable, se preocupam com saude, mas nao tem tempo nem dinheiro para um coach humano dedicado.

| Perfil | Caracteristicas | Tamanho estimado (BR) |
|---|---|---|
| Jovem profissional ativo | 25–40 anos, academia 3–5x/semana, Apple Watch ou Galaxy Watch, foco em performance e estetica | ~8 milhoes |
| Gestor/executivo estressado | 35–50 anos, rotina intensa, preocupado com longevidade e qualidade do sono, disposto a pagar por saude | ~3 milhoes |
| Mulher com objetivo definido | 25–45 anos, foco em composicao corporal ou bem-estar hormonal, alta aderencia a apps de saude | ~12 milhoes |

---

## 4. Modelo de Negocio

### 4.1 Estrutura de planos

| Plano | O que inclui | Preco |
|---|---|---|
| Free | Mensagem matinal de sono + 2 sugestoes de refeicao por dia + resumo semanal basico | Gratis |
| Premium | Proatividade completa ao longo do dia + loop de feedback nutricional + relatorio semanal completo + historico ilimitado | R$ 39/mes ou R$ 349/ano |
| Pro | Tudo do Premium + relatorio mensal aprofundado + exportacao PDF para profissionais + suporte prioritario | R$ 79/mes ou R$ 699/ano |

### 4.2 Projecao de receita (cenario conservador)

| Marco | Usuarios pagantes | MRR estimado |
|---|---|---|
| 6 meses pos-lancamento | 1.000 pagantes (80% Premium) | R$ 31.200 / mes |
| 12 meses | 5.000 pagantes | R$ 156.000 / mes |
| 24 meses | 20.000 pagantes | R$ 624.000 / mes |

Premissas: ticket medio de R$39/mes, churn mensal de 4%, crescimento via produto (boca a boca) + marketing de conteudo (saude, nutricao, performance).

### 4.3 Outros vetores de receita

- **Parcerias B2B:** empresas podem oferecer o VitalAI como beneficio de saude para funcionarios (modelo por assento, R$29/funcionario/mes)
- **Dados agregados anonimizados:** insights populacionais sobre sono, nutricao e bem-estar — alto valor para seguradoras e foodtechs (futuro)
- **Integracao com laboratorios:** usuario importa exames e a IA cruza com dados biometricos (roadmap longo prazo)

---

## 5. Arquitetura Tecnica

### 5.1 Visao geral da stack

```
Camada de dados (wearable)
  Apple HealthKit  |  Google Health Connect  |  Garmin Connect IQ API

Camada de processamento (backend)
  Trigger Engine (deteccao de contexto em tempo real)  |  Event Bus (Kafka ou SQS)

Camada de inteligencia (IA)
  LLM (Claude API)  |  Preference Model (feedback loop nutricional)  |  Report Generator

Camada de entrega (cliente)
  App iOS (Swift + HealthKit)  |  App Android (Kotlin + Health Connect)  |  Push Notifications
```

### 5.2 O trigger engine — o coracao do produto

O maior desafio tecnico do VitalAI nao e a IA em si — e o motor de deteccao de contexto que precisa operar de forma confiavel, com baixo consumo de bateria, e com precisao suficiente para nao ser invasivo.

**Estrategia de implementacao:**

- **Fase 1 (MVP):** regras deterministicas baseadas em limiares simples (FC < baseline + 15min sem movimento = acordou)
- **Fase 2:** modelos leves on-device (Core ML / TensorFlow Lite) para deteccao mais precisa de contextos
- **Fase 3:** aprendizado personalizado por usuario — cada pessoa tem padroes biometricos unicos

A deteccao acontece no dispositivo (watch/phone) e apenas o evento classificado e enviado ao backend — nao os dados brutos continuamente. Isso resolve privacidade e bateria simultaneamente.

### 5.3 O loop de aprendizado nutricional

```
Onboarding      -> Perfil nutricional base (objetivos, restricoes, preferencias)
Contexto        -> Trigger engine identifica momento (pos-treino, manha, lanche)
Sugestao        -> LLM gera refeicao personalizada ao contexto + perfil
Feedback        -> Usuario avalia (estrelas + comentario livre opcional)
Aprendizado     -> Preference model atualiza pesos do perfil do usuario
Proxima sugestao -> Mais alinhada com o gosto real do usuario
```

O preference model comeca simples (filtragem colaborativa + regras) e evolui para um modelo de embedding personalizado conforme o volume de dados cresce.

### 5.4 Pipeline de deteccao automatica de refeicao

A deteccao automatica de refeicao e o componente tecnico mais desafiador do modulo nutricional. O pipeline opera inteiramente no dispositivo para preservar privacidade e bateria:

**Etapa 1 — Coleta continua (on-device, watch)**

Acelerometro (3 eixos) + giroscopio do watch coletam dados de movimento em janelas de 15 segundos. Um modelo leve (TensorFlow Lite / Core ML) roda localmente e classifica cada janela como alimentacao ou nao-alimentacao.

**Etapa 2 — Confirmacao de evento (watch -> phone)**

Quando o modelo detecta um segmento de alimentacao com confianca > 0.80, envia apenas o evento classificado ao app do celular (nao os dados brutos). O app abre uma notificacao contextual.

**Etapa 3 — Identificacao da refeicao (phone)**

O app sugere a refeicao mais provavel com base em: horario, localizacao, historico do usuario e perfil nutricional. Opcionalmente, o usuario tira foto do prato — a IA de visao computacional identifica os alimentos e estima macros.

**Etapa 4 — Confirmacao + aprendizado (phone -> backend)**

Usuario confirma, corrige ou avalia a refeicao em 1–2 toques. O feedback e enviado ao backend e alimenta o preference model, tornando a proxima deteccao mais precisa para aquele usuario especifico.

A personalizacao do modelo de deteccao por usuario e um diferencial tecnico importante: estilos alimentares variam muito entre pessoas, e um modelo calibrado para o usuario especifico atinge precisao significativamente superior ao modelo generico.

### 5.5 Privacidade e seguranca

Dados de saude sao altamente sensiveis. O VitalAI adota as seguintes praticas desde o dia 1:

- Processamento on-device sempre que possivel — dados biometricos brutos nao saem do aparelho
- Apenas eventos classificados e anonimizados sao enviados ao backend
- Conformidade com LGPD (Brasil), GDPR (Europa) e HIPAA (EUA) desde a arquitetura
- Opcao de exclusao completa de dados a qualquer momento
- Sem venda de dados individuais para terceiros — jamais

---

## 6. Roadmap de Desenvolvimento

### 6.1 Fases de desenvolvimento

| Fase | Periodo | Entregaveis |
|---|---|---|
| MVP — Fundacao | Meses 1–3 | Integracao HealthKit/Health Connect, trigger engine com regras, mensagem matinal de sono, sugestao pos-treino, app iOS basico |
| Alpha — Nutricao | Meses 4–6 | Modulo nutricional completo, onboarding de dieta, deteccao de refeicao por gesto (acelerometro), loop de feedback, catalogo de receitas BR, relatorio semanal v1 |
| Beta — Aprendizado | Meses 7–9 | Preference model, foto de refeicao com visao computacional, confirmacao de rotinas aprendidas (GPS + horario), deteccao de estresse e hidratacao, Android + Wear OS, relatorio mensal |
| v1.0 — Lancamento | Meses 10–12 | Polimento completo, App Store / Play Store, planos Free/Premium/Pro, onboarding otimizado, marketing |
| v1.x — Escala | Ano 2 | B2B corporativo, inferencia biometrica de refeicao (camada 4), modelos on-device melhorados, Garmin, exportacao para profissionais, internacionalizacao |

### 6.2 Premissas do MVP

O MVP tem um escopo deliberadamente restrito para validar as hipoteses centrais do produto com o menor investimento possivel:

- **Hipotese 1:** usuarios preferem receber insights proativamente a buscar ativamente no app
- **Hipotese 2:** o feedback de refeicoes e simples o suficiente para ser feito consistentemente (estrelas em 10 segundos)
- **Hipotese 3:** o relatorio semanal tem valor percebido suficiente para justificar assinatura Premium
- **Hipotese 4:** a deteccao automatica de refeicao pelo watch reduz o abandono do modulo nutricional vs. apps com input manual

**Criterio de sucesso do MVP:** 40%+ de usuarios ativos diariamente apos 30 dias (vs. media de apps de saude que fica em 10–15%).

### 6.3 Time necessario para MVP

| Papel | Responsabilidades |
|---|---|
| 1 iOS developer (Swift) | Integracao HealthKit, notificacoes, app movel |
| 1 backend developer | Trigger engine, APIs, banco de dados, integracoes LLM |
| 1 AI / ML engineer (part-time) | Prompt engineering, preference model, geracao de relatorios |
| 1 product designer (UX) | Fluxos de onboarding, notificacoes, relatorio visual |

Com uma equipe enxuta de 3–4 pessoas, o MVP e viavel em 3 meses. Custo estimado de desenvolvimento: R$ 150–200k (equipe brasileira em regime de equity + salario reduzido, ou via aceleracao).

---

## 7. Riscos e Mitigacoes

| Risco | Probabilidade / Impacto | Mitigacao |
|---|---|---|
| Apple e Google lancam feature similar nativamente | Media / Alto | Foco em personalizacao profunda e loop de feedback que plataformas genericas nao conseguem replicar rapidamente |
| Usuario acha notificacoes invasivas e desativa | Alta / Medio | Controle granular de frequencia e horarios desde o onboarding; aprendizado de preferencias de interrupcao |
| Precisao do trigger engine baixa -> insights irrelevantes | Media / Alto | MVP com regras conservadoras; coletar feedback sobre relevancia das notificacoes; iterar rapido |
| Custo de API LLM inviabiliza unit economics | Baixa / Alto | Usar LLM apenas para geracao de texto; logica de negocio em codigo; caching de respostas similares |
| Regulatorio ANVISA para claims de saude | Media / Medio | Posicionar como wellness (nao diagnostico medico); disclaimers claros; evitar claims terapeuticos |
| Churn alto por falta de novidade | Media / Alto | Relatorio mensal como ancora de valor; gamificacao leve de streaks e evolucao de objetivos |
| Deteccao de refeicao com falsos positivos (ex: escovar dentes, gesto similar) | Alta / Medio | Threshold de confianca conservador no MVP; confirmacao sempre pedida nas primeiras semanas; modelo se personaliza rapidamente com feedback do usuario |

---

## 8. Proximos Passos

### 8.1 Validacao antes de construir

Antes de escrever uma linha de codigo, vale validar as hipoteses centrais com usuarios reais:

1. Entrevistar 20 usuarios de smartwatch sobre frustracao com apps atuais e receptividade a ideia de notificacoes proativas
2. Criar um prototipo de baixa fidelidade (Figma) e testar o fluxo de onboarding + recebimento de mensagem matinal
3. Validar disposicao de pagamento: quanto pagariam por mes por um "coach de saude no bolso"
4. Encontrar um nutricionista ou personal trainer parceiro para validar a qualidade das sugestoes do modelo

### 8.2 Decisoes tecnicas imediatas

- **Escolher stack backend:** Node.js + TypeScript (velocidade de desenvolvimento) ou Java/Spring (robustez para eventos em tempo real)
- **Definir LLM provider:** Claude API (melhor para texto em portugues) vs. OpenAI GPT-4o
- **Decidir sobre banco de receitas:** API Spoonacular (com adaptacao BR) ou curadoria manual de 200 receitas para MVP
- **Definir estrategia de monetizacao no MVP:** freemium desde o inicio ou 100% gratuito ate atingir 1.000 usuarios ativos
