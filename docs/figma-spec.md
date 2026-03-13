# VitalAI - Figma Design Specification

**Design Reference v1.0 — Marco 2026**

Este documento descreve tela por tela o que deve ser construido no Figma. Cada tela inclui: nome, descricao funcional, elementos de UI, copy sugerido, estados e notas para o designer. Serve como briefing completo para montar o arquivo Figma do zero.

---

## Design System — Fundacao

Antes de criar as telas, montar os seguintes componentes base:

### Cores

| Token | Uso | Sugestao |
|---|---|---|
| `primary` | Botoes principais, destaques, links | Verde-saude vibrante (#2DD4A8 ou similar) |
| `primary-dark` | Hover/pressed states | Versao escura do primary |
| `secondary` | Acentos, badges, tags | Azul calmo (#4A90D9) |
| `background` | Fundo do app | Branco (#FFFFFF) |
| `surface` | Cards, modais | Cinza muito claro (#F7F8FA) |
| `text-primary` | Texto principal | Quase preto (#1A1A2E) |
| `text-secondary` | Labels, subtitulos | Cinza medio (#6B7280) |
| `text-muted` | Placeholders, hints | Cinza claro (#9CA3AF) |
| `success` | Feedback positivo, metas atingidas | Verde (#22C55E) |
| `warning` | Alertas leves, atencao | Amarelo (#F59E0B) |
| `error` | Erros, alertas criticos | Vermelho (#EF4444) |
| `stress` | Indicador de estresse | Laranja-avermelhado (#F97316) |

### Tipografia

| Estilo | Uso | Spec |
|---|---|---|
| H1 | Titulos de secao (relatorio) | 28px, Bold |
| H2 | Titulos de card | 22px, Semibold |
| H3 | Subtitulos | 18px, Semibold |
| Body | Texto corrido | 16px, Regular |
| Body Small | Labels, descricoes | 14px, Regular |
| Caption | Timestamps, metadados | 12px, Regular |
| Number Large | Metricas em destaque (BPM, score) | 36px, Bold, Monospace |
| Number Medium | Macros, valores secundarios | 24px, Semibold, Monospace |

Fonte sugerida: **Inter** (gratuita, excelente legibilidade em mobile, suporte completo a portugues).

### Componentes reutilizaveis

Criar como components no Figma antes de montar telas:

| Componente | Variantes |
|---|---|
| Button | Primary, Secondary, Ghost, Disabled — tamanhos Large, Medium, Small |
| Input Field | Default, Focused, Error, Disabled — com e sem icone |
| Card | Meal card, Metric card, Notification card, Report section card |
| Notification Banner | Info, Success, Warning, Alert — com e sem action buttons |
| Star Rating | 1-5 estrelas, estados vazio/preenchido/hover |
| Chip/Tag | Selectable, Static — para restricoes alimentares e tags |
| Progress Bar | Linear e circular — para metas diarias |
| Bottom Navigation | 4 tabs com icones e labels |
| Top Bar | Com titulo, back button, e action icons |
| Macro Pill | Icone + valor + label (ex: proteina 45g) — cores por macro |
| Avatar | Com iniciais ou foto, tamanhos S/M/L |
| Toggle | On/Off com label |
| Slider | Para configurar horarios e budgets |
| Empty State | Ilustracao + texto + CTA |
| Skeleton Loader | Para cards e listas enquanto carrega |

---

## Fluxo 1 — Onboarding (7 telas)

### 1.1 Splash Screen

**Nome Figma:** `Onboarding / Splash`

- **Descricao:** Primeira tela ao abrir o app. Logo animado do VitalAI + tagline.
- **Elementos:**
  - Logo VitalAI centralizado (icone + wordmark)
  - Tagline: "Seu companheiro proativo de saude"
  - Fundo com gradiente sutil (primary -> primary-dark)
- **Comportamento:** Exibe por 2s, depois transiciona para Welcome.
- **Nota para designer:** Pensar na animacao do logo (pulso cardiaco sutil no icone).

### 1.2 Welcome / Value Proposition

**Nome Figma:** `Onboarding / Welcome`

- **Descricao:** Carrossel de 3 slides explicando o valor do app antes do cadastro.
- **Elementos:**
  - Slide 1 — Ilustracao de smartwatch + celular
    - Titulo: "Seus dados de saude, finalmente uteis"
    - Subtitulo: "O VitalAI transforma dados do seu smartwatch em sugestoes personalizadas no momento certo."
  - Slide 2 — Ilustracao de notificacao no celular
    - Titulo: "Voce nao precisa abrir o app"
    - Subtitulo: "Receba insights sobre sono, nutricao e estresse automaticamente — sem esforco."
  - Slide 3 — Ilustracao de relatorio
    - Titulo: "Seu coach de saude pessoal"
    - Subtitulo: "Relatorios semanais com linguagem de coach, nao de planilha."
  - Indicador de pagina (3 dots)
  - Botao "Comecar" (aparece no slide 3)
  - Link "Ja tenho conta" (texto clicavel abaixo)
- **Nota para designer:** Ilustracoes flat, coloridas, estilo health/wellness. Evitar fotos stock.

### 1.3 Sign Up

**Nome Figma:** `Onboarding / SignUp`

- **Descricao:** Cadastro simples — priorizar social login para reduzir friccao.
- **Elementos:**
  - Titulo: "Crie sua conta"
  - Botao "Continuar com Apple" (Apple Sign In — obrigatorio para iOS)
  - Botao "Continuar com Google"
  - Separador "ou"
  - Campo email
  - Campo senha (com toggle mostrar/ocultar)
  - Botao "Criar conta"
  - Texto legal: "Ao criar conta, voce concorda com os Termos de Uso e Politica de Privacidade" (links clicaveis)
  - Link "Ja tenho conta? Entrar"
- **Estados:** Default, Loading (botao com spinner), Erro (email invalido, senha fraca)

### 1.4 Conectar Wearable

**Nome Figma:** `Onboarding / ConnectWearable`

- **Descricao:** Solicita permissao para acessar dados de saude do smartwatch.
- **Elementos:**
  - Ilustracao de smartwatch conectado ao celular
  - Titulo: "Conecte seu smartwatch"
  - Subtitulo: "O VitalAI precisa acessar seus dados de saude para gerar insights personalizados. Seus dados nunca saem do seu aparelho sem sua permissao."
  - Lista de dados solicitados com icones:
    - Frequencia cardiaca
    - Variabilidade cardiaca (HRV)
    - Sono
    - Atividade fisica
    - Nivel de estresse
  - Botao "Conectar Apple Health" (iOS) / "Conectar Health Connect" (Android)
  - Link "Pular por enquanto" (texto secundario)
  - Badge de privacidade: "Seus dados sao processados no seu dispositivo"
- **Estados:** Conectado com sucesso (checkmark verde + nome do dispositivo detectado), Erro de conexao
- **Nota para designer:** Esse e o momento de maior abandono. Design precisa transmitir confianca e privacidade.

### 1.5 Permissao de Notificacoes

**Nome Figma:** `Onboarding / NotificationPermission`

- **Descricao:** Explica o valor das notificacoes antes de pedir permissao do sistema.
- **Elementos:**
  - Ilustracao de 3 notificacoes empilhadas (mockup de como serao)
  - Titulo: "Insights que chegam ate voce"
  - Subtitulo: "O VitalAI envia sugestoes no momento certo — sem voce precisar abrir o app. Voce controla a frequencia e os horarios."
  - Preview de notificacao exemplo: "Bom dia! Voce dormiu 7h12min com qualidade 85. Cafe sugerido: ovos mexidos com pao integral."
  - Botao "Ativar notificacoes"
  - Link "Agora nao" (texto secundario)
- **Nota para designer:** Mostrar a notificacao como preview real do iOS/Android para que o usuario entenda exatamente o que vai receber.

### 1.6 Perfil de Saude e Nutricao

**Nome Figma:** `Onboarding / HealthProfile`

- **Descricao:** Coleta objetivo, restricoes e preferencias em uma unica tela com scroll ou steps.
- **Elementos — Secao 1: Objetivo**
  - Titulo: "Qual seu objetivo principal?"
  - 4 opcoes em cards selecionaveis (selecao unica):
    - "Emagrecer" — icone balanca
    - "Ganhar massa muscular" — icone haltere
    - "Melhorar performance" — icone raio
    - "Saude geral e longevidade" — icone coracao
- **Elementos — Secao 2: Restricoes alimentares**
  - Titulo: "Alguma restricao alimentar?"
  - Chips selecionaveis (multi-selecao):
    - Vegetariano, Vegano, Sem gluten, Sem lactose, Low carb, Sem frutos do mar, Kosher, Halal
  - Campo "Outra restricao" (input de texto livre)
- **Elementos — Secao 3: Preferencias**
  - Titulo: "Na cozinha, voce e..."
  - 3 opcoes em cards:
    - "Pratico" — "Prefiro receitas de ate 15min"
    - "Intermediario" — "Cozinho bem, aceito receitas de ate 30min"
    - "Chef" — "Adoro cozinhar, pode mandar receitas elaboradas"
- **Elementos — Navegacao:**
  - Progress bar no topo (etapa 4 de 5)
  - Botao "Continuar"
  - Link "Pular" (usa defaults)

### 1.7 Configuracao de Horarios

**Nome Figma:** `Onboarding / QuietHours`

- **Descricao:** Define janela de silencio e horarios preferidos de interacao.
- **Elementos:**
  - Titulo: "Quando voce prefere nao ser interrompido?"
  - Slider duplo para definir horario de silencio (default: 22h–7h)
  - Visualizacao de relogio 24h com zona de silencio destacada
  - Toggle: "Respeitar modo Foco do iPhone" (default: ativado)
  - Subtitulo: "Quantas notificacoes por dia?"
  - Slider de 2 a 10 (default: 6) com label dinamico: "Ate 6 notificacoes por dia"
  - Botao "Comecar a usar o VitalAI"
- **Nota para designer:** Essa tela e crucial para evitar churn por notification fatigue. Design deve transmitir que o usuario tem controle total.

---

## Fluxo 2 — Home e Navegacao Principal (4 telas)

### 2.1 Home — Timeline do Dia

**Nome Figma:** `Home / Timeline`

- **Descricao:** Tela principal do app. Mostra a timeline do dia com eventos e metricas.
- **Elementos:**
  - Top bar: "Bom dia, Luis" + avatar + icone de configuracoes
  - Card de resumo do dia (topo):
    - Score geral do dia (0-100) com indicador circular
    - 3 mini-metricas: Sono (6h48m), HRV (45ms), Passos (3.240)
  - Timeline vertical com cards de eventos (ordem cronologica):
    - 07:12 — Card "Resumo do sono" (expandivel)
    - 08:30 — Card "Cafe da manha registrado" (ovo mexido, pao integral)
    - 12:15 — Card "Sugestao de almoco" (com botao "Ver receita")
    - 14:00 — Card "Lembrete de movimento" (90min inativo)
    - 18:30 — Card "Treino detectado" (corrida 42min, 380kcal)
    - 18:45 — Card "Sugestao pos-treino" (wrap de frango)
  - FAB (Floating Action Button): "+" para registro manual de refeicao
- **Bottom navigation:**
  - Home (ativo) | Nutricao | Relatorios | Perfil
- **Estados:** Dia vazio (empty state com ilustracao + "Seu dia esta comecando"), Dia completo com muitos cards (scroll)

### 2.2 Home — Card de Evento Expandido

**Nome Figma:** `Home / EventCardExpanded`

- **Descricao:** Ao tocar em um card da timeline, ele expande com detalhes.
- **Exemplo — Card "Resumo do sono" expandido:**
  - Titulo: "Resumo do sono"
  - Timestamp: "Hoje, 07:12"
  - Texto da IA: "Bom dia, Luis! Voce dormiu 6h48min com qualidade 72. Seu HRV esta um pouco abaixo do normal — o dia de hoje pede energia moderada."
  - Grafico de fases do sono (barra horizontal: acordado, leve, profundo, REM)
  - Metricas: Duracao 6h48m | Qualidade 72/100 | HRV 38ms | Ciclos 4
  - Botoes de feedback: "Util" / "Nao relevante"
  - Botao "Fechar"

### 2.3 Tela de Nutricao

**Nome Figma:** `Nutrition / DailyView`

- **Descricao:** Hub de nutricao com resumo diario e refeicoes.
- **Elementos:**
  - Top bar: "Nutricao" + seletor de data (hoje, ontem, etc.)
  - Card de resumo diario de macros:
    - 4 Macro Pills em linha: Proteina (62g / 150g), Carb (98g / 250g), Gordura (28g / 70g), Calorias (892 / 2200)
    - Progress bars preenchidas proporcionalmente
  - Lista de refeicoes do dia:
    - Cafe da manha — card com foto (se disponivel), nome, horario, macros, estrelas de feedback
    - Almoco — card (pendente de registro)
    - Lanche — card (sugerido pela IA)
    - Jantar — card (nao registrado ainda)
  - Cada card de refeicao tem estados:
    - Registrado + avaliado (com estrelas)
    - Registrado sem avaliacao (botao "Avaliar")
    - Sugerido pela IA (botao "Aceitar" / "Outra opcao")
    - Vazio (botao "Registrar refeicao")
  - FAB: "+" registro manual
- **Bottom navigation:** Home | Nutricao (ativo) | Relatorios | Perfil

### 2.4 Tela de Relatorios

**Nome Figma:** `Reports / List`

- **Descricao:** Lista de relatorios semanais e mensais gerados.
- **Elementos:**
  - Top bar: "Relatorios"
  - Filtro: "Semanais" | "Mensais" (tabs)
  - Lista de cards de relatorios (mais recente primeiro):
    - Card: "Semana 10 — 3 a 9 Mar 2026" + preview de 1 linha do insight principal + badge "Novo"
    - Card: "Semana 9 — 24 Fev a 2 Mar 2026"
    - Card: "Fevereiro 2026" (tag "Mensal")
  - Cada card mostra: periodo, score geral, mini-grafico de tendencia, 1 insight destaque
  - Empty state para novos usuarios: "Seu primeiro relatorio sera gerado no proximo domingo"
- **Bottom navigation:** Home | Nutricao | Relatorios (ativo) | Perfil

---

## Fluxo 3 — Notificacoes (6 telas)

### 3.1 Notificacao — Resumo Matinal de Sono

**Nome Figma:** `Notification / MorningSleep`

- **Descricao:** Notificacao push recebida ao acordar. Mostrar como aparece na lock screen e na central de notificacoes.
- **Elementos (lock screen):**
  - Icone VitalAI
  - Titulo: "VitalAI"
  - Corpo: "Bom dia, Luis! Voce dormiu 6h48min com qualidade 72. Seu HRV esta um pouco abaixo do normal — cafe sugerido: ovo mexido com pao integral e uma fruta."
  - Action buttons (long press): "Ver detalhes" | "Util" | "Nao relevante"
- **Nota para designer:** Criar mockup em contexto real — lock screen do iPhone com hora, data, e a notificacao do VitalAI.

### 3.2 Notificacao — Sugestao Pos-Treino

**Nome Figma:** `Notification / PostWorkout`

- **Elementos (lock screen):**
  - Icone VitalAI
  - Titulo: "VitalAI — Treino detectado"
  - Corpo: "Otimo treino! Voce queimou ~380kcal em 42min de corrida. Para recuperacao, proteina + carb em ate 45min. Que tal um wrap de frango com arroz? Leva 15min."
  - Action buttons: "Ver receita" | "Outra opcao"

### 3.3 Notificacao — Alerta de Estresse

**Nome Figma:** `Notification / StressAlert`

- **Elementos (lock screen):**
  - Icone VitalAI
  - Titulo: "VitalAI"
  - Corpo: "Percebi que voce esta com o estresse um pouco elevado agora. Que tal 5 minutos de respiracao antes de dormir? Seu sono vai agradecer."
  - Action buttons: "Iniciar respiracao" | "Agora nao"

### 3.4 Notificacao — Lembrete de Movimento

**Nome Figma:** `Notification / InactivityReminder`

- **Elementos (lock screen):**
  - Icone VitalAI
  - Titulo: "VitalAI"
  - Corpo: "Ja faz 90 minutos sem movimento. Uma caminhada rapida de 5 minutos faz diferenca — seu corpo agradece."
  - Action buttons: "Ok, vou me mexer" | "Estou ocupado"

### 3.5 Notificacao — Hidratacao

**Nome Figma:** `Notification / Hydration`

- **Elementos (lock screen):**
  - Icone VitalAI
  - Titulo: "VitalAI"
  - Corpo: "Dia quente + treino pesado = hidratacao redobrada. Ja bebeu agua nas ultimas 2 horas?"
  - Action buttons: "Ja bebi" | "Vou beber agora"

### 3.6 Notificacao — Sono Ruim (Ajuste do Dia)

**Nome Figma:** `Notification / PoorSleep`

- **Elementos (lock screen):**
  - Icone VitalAI
  - Titulo: "VitalAI"
  - Corpo: "Noite curta — 5h12min com HRV baixo. Hoje o corpo pede calma: treino leve, comida nutritiva e dormir mais cedo. Cafe sugerido: aveia com banana e mel."
  - Action buttons: "Ver sugestoes do dia" | "Entendi"

---

## Fluxo 4 — Deteccao de Refeicao (5 telas)

### 4.1 Deteccao por Gesto — Notificacao no Watch

**Nome Figma:** `MealDetection / WatchAlert`

- **Descricao:** O watch detectou gesto alimentar e exibe uma notificacao sutil.
- **Elementos (Apple Watch mockup):**
  - Icone VitalAI pequeno
  - Texto: "Comendo agora?"
  - Dois botoes: "Sim" (check verde) | "Nao" (X vermelho)
- **Nota para designer:** Tela pequena (44mm). Design ultra-minimalista. Botoes grandes para toque facil.

### 4.2 Deteccao por Gesto — Notificacao no Phone

**Nome Figma:** `MealDetection / PhoneAlert`

- **Descricao:** Se confirmou no watch ou nao respondeu, notificacao aparece no celular.
- **Elementos (notificacao expandida):**
  - Titulo: "VitalAI — Refeicao detectada"
  - Corpo: "Parece que voce esta comendo. E almoco?"
  - Sugestao: "Almoco de sempre? Arroz, feijao, frango grelhado e salada" (baseado no historico)
  - Action buttons: "Confirmar" | "Corrigir" | "Tirar foto"
- **Nota para designer:** O "Almoco de sempre?" so aparece apos 2-3 semanas de uso (rotina aprendida). Versao inicial mostra apenas "O que voce esta comendo?"

### 4.3 Camera — Foto da Refeicao

**Nome Figma:** `MealDetection / CameraCapture`

- **Descricao:** Tela da camera com overlay para identificacao de alimentos.
- **Elementos:**
  - Camera viewfinder em tela cheia
  - Overlay com guia circular no centro: "Posicione o prato no centro"
  - Botao de captura (grande, centralizado na base)
  - Botao "Cancelar" (canto superior esquerdo)
  - Botao flash (canto superior direito)
  - Apos captura: preview da foto com loading "Identificando alimentos..."
- **Estado pos-identificacao:**
  - Foto com bounding boxes nos alimentos identificados
  - Lista dos alimentos detectados com macros estimados:
    - "Arroz branco — 45g carb, 4g prot"
    - "Frango grelhado — 32g prot, 3g gord"
    - "Salada mista — 2g carb, 1g gord"
  - Total estimado: 420kcal | 36g prot | 47g carb | 12g gord
  - Botao "Confirmar" | Botao "Corrigir"

### 4.4 Confirmacao de Refeicao

**Nome Figma:** `MealDetection / MealConfirmation`

- **Descricao:** Tela de confirmacao com resumo da refeicao registrada.
- **Elementos:**
  - Foto da refeicao (se tirou) ou ilustracao generica
  - Nome da refeicao: "Almoco"
  - Horario: "12:35"
  - Itens: lista dos alimentos
  - Macros totais: 4 Macro Pills
  - Botao "Salvar"
  - Link "Editar detalhes"
- **Nota para designer:** Essa tela deve ser rapida — o objetivo e salvar em < 10 segundos.

### 4.5 Feedback de Refeicao

**Nome Figma:** `MealDetection / MealFeedback`

- **Descricao:** Apos a refeicao, o app pede avaliacao. Pode aparecer como notificacao ou in-app.
- **Elementos:**
  - Titulo: "Como foi o almoco?"
  - Nome/foto da refeicao
  - 5 estrelas para avaliacao (tap para selecionar)
  - Campo de texto opcional: "Algum comentario?" (placeholder: "Ex: muito salgado, porcao pequena...")
  - Botao "Enviar" (ativo apos selecionar estrelas)
  - Link "Pular"
- **Nota para designer:** Deve ser completavel em < 10 segundos. Estrelas sao o unico input obrigatorio.

---

## Fluxo 5 — Sugestao Nutricional (3 telas)

### 5.1 Card de Sugestao de Refeicao

**Nome Figma:** `Nutrition / MealSuggestionCard`

- **Descricao:** Card completo de uma sugestao de refeicao da IA.
- **Elementos:**
  - Foto da refeicao (imagem do catalogo)
  - Nome: "Wrap de frango com arroz"
  - Tag de contexto: "Ideal pos-treino" (verde)
  - Tempo de preparo: "15 min" com icone de relogio
  - 4 Macro Pills: Proteina 45g | Carb 62g | Gordura 12g | 530kcal
  - Texto da IA: "Proteina e carb na medida certa para recuperacao muscular apos sua corrida de hoje."
  - Botao primario: "Vou fazer essa"
  - Botao secundario: "Ver outra opcao"
  - Link: "Ver receita completa"

### 5.2 Receita Completa

**Nome Figma:** `Nutrition / RecipeDetail`

- **Descricao:** Tela de detalhe da receita com ingredientes e modo de preparo.
- **Elementos:**
  - Foto grande da refeicao (hero image)
  - Nome da receita
  - Tags: "Pos-treino" | "15 min" | "Alto em proteina"
  - Secao "Informacao nutricional":
    - Tabela com macros detalhados (por porcao)
  - Secao "Ingredientes":
    - Lista com checkbox (para marcar o que ja tem em casa)
    - Quantidades para 1 porcao (com botao para ajustar porcoes)
  - Secao "Modo de preparo":
    - Passos numerados com texto claro
  - Botao "Fiz essa refeicao" (registra automaticamente)
  - Botao "Compartilhar receita"
- **Nota para designer:** Scroll longo. Botao "Fiz essa refeicao" fixo na base (sticky).

### 5.3 Opcoes Alternativas

**Nome Figma:** `Nutrition / AlternativeMeals`

- **Descricao:** Lista de 3-4 alternativas quando o usuario rejeita a sugestao principal.
- **Elementos:**
  - Titulo: "Outras opcoes para o pos-treino"
  - Subtitulo: "Todas com proteina e carb para recuperacao"
  - 3-4 cards menores (lista vertical):
    - Foto pequena + Nome + Tempo de preparo + Macros resumidos
    - Tap abre o MealSuggestionCard completo
  - Botao no final: "Nenhuma me agrada — registrar refeicao manual"

---

## Fluxo 6 — Relatorio Semanal (5 telas)

### 6.1 Relatorio — Capa

**Nome Figma:** `Report / WeeklyCover`

- **Descricao:** Tela de abertura do relatorio semanal. Tom de coach.
- **Elementos:**
  - Titulo: "Sua semana em resumo"
  - Subtitulo: "3 a 9 de marco de 2026"
  - Score geral da semana: numero grande (ex: 78/100) com indicador circular colorido
  - Comparacao com semana anterior: "3 pontos acima da semana passada" (seta verde para cima)
  - Preview dos 4 pilares com mini-scores:
    - Sono: 72 | Nutricao: 81 | Atividade: 85 | Bem-estar: 74
  - Botao "Ler relatorio completo"
  - Botao "Exportar PDF" (icone de compartilhar)

### 6.2 Relatorio — Secao Sono

**Nome Figma:** `Report / SleepSection`

- **Descricao:** Secao de sono do relatorio semanal.
- **Elementos:**
  - Titulo da secao: "Sono"
  - Score: 72/100
  - Grafico de barras — duracao de sono por dia da semana (seg a dom)
  - Grafico de linha — HRV noturno ao longo da semana
  - Metricas resumidas:
    - Media de duracao: 6h52min
    - Media de qualidade: 72/100
    - Melhor noite: Quarta (7h34min, qualidade 88)
    - Pior noite: Sexta (5h12min, qualidade 54)
  - Texto do coach (gerado por LLM):
    - "Sua semana de sono foi razoavel mas com uma queda significativa na sexta. Seu HRV ficou abaixo da sua baseline em 3 das 7 noites — isso pode indicar acumulo de estresse ou treino pesado sem recuperacao adequada. Tente manter um horario mais consistente para dormir."
  - Navegacao: "Proximo: Nutricao" (swipe ou botao)

### 6.3 Relatorio — Secao Nutricao

**Nome Figma:** `Report / NutritionSection`

- **Descricao:** Secao de nutricao do relatorio semanal.
- **Elementos:**
  - Titulo: "Nutricao"
  - Score: 81/100
  - Grafico de barras empilhadas — macros diarios (proteina, carb, gordura) por dia
  - Metricas:
    - Refeicoes registradas: 19/21 (90%)
    - Media de proteina: 142g/dia (meta: 150g)
    - Dias dentro da meta calorica: 5/7
  - Texto do coach:
    - "Excelente aderencia ao registro de refeicoes essa semana! Sua proteina ficou consistentemente perto da meta. Nos dias de treino, voce poderia aumentar o carb em 15-20% para melhor recuperacao."
  - Refeicoes favoritas da semana (2-3 mais bem avaliadas com estrelas)

### 6.4 Relatorio — Secao Atividade

**Nome Figma:** `Report / ActivitySection`

- **Descricao:** Secao de atividade fisica.
- **Elementos:**
  - Titulo: "Atividade"
  - Score: 85/100
  - Grafico — calorias queimadas por dia (barras) com linha de meta
  - Lista de treinos da semana:
    - Seg: Musculacao 55min — 420kcal
    - Qua: Corrida 42min — 380kcal
    - Sex: HIIT 30min — 310kcal
  - Metricas: Passos medios 8.420/dia | Minutos ativos: 187/semana
  - Texto do coach:
    - "3 treinos na semana com boa variedade. Sua FC pos-treino voltou ao normal mais rapido na quarta do que na segunda — sinal de que seu condicionamento esta melhorando."

### 6.5 Relatorio — Focos da Proxima Semana

**Nome Figma:** `Report / WeeklyFocus`

- **Descricao:** Secao final do relatorio com 3 focos concretos para a proxima semana.
- **Elementos:**
  - Titulo: "Seus 3 focos para a semana que vem"
  - Foco 1 — Card:
    - Icone de lua
    - "Dormir ate 23h pelo menos 5 dias"
    - Subtitulo: "Suas melhores noites foram quando voce dormiu antes das 23h"
  - Foco 2 — Card:
    - Icone de proteina
    - "Atingir 150g de proteina nos dias de treino"
    - Subtitulo: "Voce ficou em 142g — faltam 8g, equivale a 1 ovo extra"
  - Foco 3 — Card:
    - Icone de agua
    - "Beber agua a cada 2h nos dias de treino"
    - Subtitulo: "Seus dias de melhor HRV foram os com melhor hidratacao"
  - Checkbox em cada foco (para o usuario se comprometer)
  - Botao "Aceitar focos e comecar a semana"
  - Botao "Exportar relatorio (PDF)"
  - Texto de encerramento: "Ate domingo que vem. Boa semana, Luis!"

---

## Fluxo 7 — Relatorio Mensal (2 telas)

### 7.1 Relatorio Mensal — Visao Geral

**Nome Figma:** `Report / MonthlyCover`

- **Descricao:** Resumo mensal com tendencias de longo prazo.
- **Elementos:**
  - Titulo: "Fevereiro 2026 — Seu mes em resumo"
  - Score mensal com comparacao ao mes anterior
  - 4 graficos de tendencia (linhas) — um por pilar:
    - Sono: tendencia de qualidade ao longo das 4 semanas
    - Nutricao: aderencia ao plano
    - Atividade: volume semanal
    - Bem-estar: HRV medio semanal
  - Destaques do mes:
    - "Melhor semana de sono: Semana 2"
    - "Recorde de passos: 14.200 em 18/fev"
    - "Maior streak de registro de refeicoes: 12 dias"
  - Texto do coach (1-2 paragrafos sobre evolucao geral)
  - Botao "Exportar PDF"
  - Botao "Compartilhar com profissional"

### 7.2 Relatorio Mensal — Progresso vs Objetivos

**Nome Figma:** `Report / MonthlyGoals`

- **Descricao:** Evolucao em relacao ao objetivo declarado no onboarding.
- **Elementos:**
  - Titulo: "Progresso em relacao ao seu objetivo"
  - Objetivo do usuario: "Ganho de massa muscular" (exibido como badge)
  - Metricas relevantes ao objetivo:
    - Media de proteina: 138g/dia (meta: 150g) — barra de progresso 92%
    - Treinos por semana: 3.2 (meta: 4) — barra de progresso 80%
    - Qualidade do sono: 74 (meta: 80) — barra de progresso 92%
  - Grafico de evolucao mensal (ultimos 3 meses se disponiveis)
  - Texto do coach sobre ajustes recomendados

---

## Fluxo 8 — Perfil e Configuracoes (5 telas)

### 8.1 Perfil — Tela Principal

**Nome Figma:** `Profile / Main`

- **Descricao:** Hub de configuracoes e informacoes do usuario.
- **Elementos:**
  - Avatar + nome + email
  - Badge do plano atual: "Premium" (ou "Free" / "Pro")
  - Secoes em lista:
    - "Perfil de saude" (objetivo, restricoes) — seta para editar
    - "Dispositivos conectados" — Apple Watch conectado (indicador verde)
    - "Notificacoes" — seta para configuracoes
    - "Plano e assinatura" — seta
    - "Exportar meus dados" — icone de download
    - "Privacidade" — seta
    - "Ajuda e suporte" — seta
    - "Sobre o VitalAI" — versao do app
  - Botao "Sair" (texto vermelho, no final)
- **Bottom navigation:** Home | Nutricao | Relatorios | Perfil (ativo)

### 8.2 Perfil — Configuracoes de Notificacao

**Nome Figma:** `Profile / NotificationSettings`

- **Descricao:** Controle granular das notificacoes.
- **Elementos:**
  - Titulo: "Notificacoes"
  - Secao "Geral":
    - Toggle: "Notificacoes ativadas" (master toggle)
    - Slider: "Limite diario" (2-10, com valor exibido)
    - Horario de silencio: picker de inicio e fim
  - Secao "Por tipo" (cada um com toggle individual):
    - "Resumo matinal de sono" — ativado
    - "Sugestoes de refeicao" — ativado
    - "Alerta de estresse" — ativado
    - "Lembrete de movimento" — ativado
    - "Lembrete de hidratacao" — desativado
    - "Deteccao de refeicao" — ativado
  - Secao "Feedback":
    - Toggle: "Pedir avaliacao apos refeicoes" — ativado

### 8.3 Perfil — Dispositivos Conectados

**Nome Figma:** `Profile / Devices`

- **Descricao:** Gerenciamento de wearables conectados.
- **Elementos:**
  - Titulo: "Dispositivos conectados"
  - Card do dispositivo conectado:
    - Icone Apple Watch + "Apple Watch Series 9"
    - Status: "Conectado" (badge verde)
    - Ultima sincronizacao: "Ha 3 minutos"
    - Dados sincronizados: FC, HRV, Sono, Atividade, SpO2 (checkmarks)
    - Botao "Desconectar" (texto vermelho)
  - Botao "Conectar novo dispositivo"
  - Lista de dispositivos compativeis (informativa):
    - Apple Watch — "Suportado"
    - Wear OS — "Em breve"
    - Garmin — "Em breve"
    - Oura Ring — "Futuro"

### 8.4 Perfil — Plano e Assinatura

**Nome Figma:** `Profile / Subscription`

- **Descricao:** Informacoes do plano atual e opcao de upgrade.
- **Elementos:**
  - Card do plano atual:
    - Nome: "Premium"
    - Preco: "R$ 39/mes"
    - Proximo pagamento: "12 de abril de 2026"
    - Botao "Gerenciar assinatura" (abre painel da App Store / Play Store)
  - Comparativo de planos (se no Free):
    - Tabela Free vs Premium vs Pro (resumida)
    - Botao "Upgrade para Premium" / "Upgrade para Pro"
  - Link "Cancelar assinatura"

### 8.5 Perfil — Privacidade e Dados

**Nome Figma:** `Profile / Privacy`

- **Descricao:** Controles de privacidade e LGPD.
- **Elementos:**
  - Titulo: "Privacidade e dados"
  - Secao "Seus dados":
    - "Seus dados biometricos sao processados no seu dispositivo e nunca sao compartilhados sem sua permissao."
  - Botao "Exportar todos os meus dados" (gera ZIP)
  - Botao "Solicitar exclusao da conta" (vermelho, com confirmacao)
  - Links:
    - "Politica de privacidade"
    - "Termos de uso"
    - "Consentimento LGPD" — com data do consentimento
  - Toggle: "Permitir dados anonimizados para melhoria do produto" (opt-in)

---

## Fluxo 9 — Paywall e Upgrade (2 telas)

### 9.1 Paywall — Comparativo de Planos

**Nome Figma:** `Paywall / PlanComparison`

- **Descricao:** Tela de upgrade exibida quando usuario Free tenta acessar feature Premium.
- **Elementos:**
  - Titulo: "Desbloqueie seu potencial completo"
  - Subtitulo: "Escolha o plano ideal para voce"
  - 3 colunas (ou cards empilhados em mobile):
    - **Free** (atual):
      - Resumo matinal de sono
      - 2 sugestoes de refeicao/dia
      - Resumo semanal basico
      - Preco: Gratis
    - **Premium** (recomendado — badge destaque):
      - Tudo do Free +
      - Proatividade completa ao longo do dia
      - Loop de feedback nutricional
      - Relatorio semanal completo
      - Historico ilimitado
      - Preco: R$ 39/mes ou R$ 349/ano (economia de 25%)
      - Botao "Assinar Premium"
    - **Pro**:
      - Tudo do Premium +
      - Relatorio mensal aprofundado
      - Exportacao PDF para profissionais
      - Suporte prioritario
      - Preco: R$ 79/mes ou R$ 699/ano
      - Botao "Assinar Pro"
  - Toggle: "Mensal" / "Anual" (com tag "Economize 25%")
  - Link "Continuar com Free"
  - Texto legal: "Cancele a qualquer momento. Sem compromisso."

### 9.2 Paywall — Confirmacao de Assinatura

**Nome Figma:** `Paywall / Confirmation`

- **Descricao:** Tela de sucesso apos assinar.
- **Elementos:**
  - Icone de check animado (grande, verde)
  - Titulo: "Bem-vindo ao Premium!"
  - Subtitulo: "Agora voce tem acesso a tudo que o VitalAI pode oferecer."
  - Lista de features desbloqueadas (com checkmarks)
  - Botao "Comecar a explorar"

---

## Fluxo 10 — Apple Watch (4 telas)

### 10.1 Watch — Complication

**Nome Figma:** `Watch / Complication`

- **Descricao:** Complication para watch face mostrando score do dia.
- **Variantes:**
  - Circular pequena: numero do score (78) com anel de progresso colorido
  - Retangular: "VitalAI 78" + mini-icone de tendencia (seta para cima/baixo)
- **Nota para designer:** Usar as guidelines de complication da Apple (44mm e 40mm). Fontes SF Compact.

### 10.2 Watch — Glance View

**Nome Figma:** `Watch / Glance`

- **Descricao:** Tela principal do app no watch. Informacoes rapidas sem scroll.
- **Elementos:**
  - Score do dia: 78 (numero grande com anel)
  - 3 metricas: Sono 6h48m | HRV 45ms | Passos 3.2k
  - Proximo evento: "Almoco sugerido: 12:30"
- **Nota para designer:** Fundo escuro (OLED). Fontes grandes. Maximo 3 informacoes.

### 10.3 Watch — Notificacao de Refeicao

**Nome Figma:** `Watch / MealNotification`

- **Descricao:** Notificacao de deteccao de refeicao no watch.
- **Elementos:**
  - Icone VitalAI
  - Texto: "Comendo agora?"
  - Botao verde: checkmark (Sim)
  - Botao vermelho: X (Nao)
- **Nota para designer:** Botoes grandes para toque facil. Haptic feedback indicado.

### 10.4 Watch — Respiracao Guiada

**Nome Figma:** `Watch / BreathingExercise`

- **Descricao:** Exercicio de respiracao de 5 minutos iniciado via alerta de estresse.
- **Elementos:**
  - Animacao circular que expande (inspirar) e contrai (expirar)
  - Texto alternando: "Inspire..." / "Expire..."
  - Timer: "4:32 restantes"
  - Haptic pulses sincronizados com ritmo
  - Botao "Encerrar" (discreto)
- **Nota para designer:** Similar ao app Breathe da Apple mas com branding VitalAI. Cores calmantes (azul/verde suave).

---

## Fluxo 11 — Estados Vazios e Erros (4 telas)

### 11.1 Empty State — Primeiro Dia

**Nome Figma:** `States / FirstDay`

- **Descricao:** Home no primeiro dia de uso, sem dados ainda.
- **Elementos:**
  - Ilustracao amigavel (pessoa com smartwatch, feliz)
  - Titulo: "Seu dia esta comecando!"
  - Subtitulo: "Use seu smartwatch normalmente. O VitalAI vai comecar a te conhecer e enviar insights personalizados em breve."
  - Checklist de setup:
    - Smartwatch conectado (check verde ou pendente)
    - Notificacoes ativadas (check verde ou pendente)
    - Perfil preenchido (check verde ou pendente)
  - Botao "Completar setup" (se algum item pendente)

### 11.2 Empty State — Sem Refeicoes Registradas

**Nome Figma:** `States / NoMeals`

- **Descricao:** Tela de nutricao sem nenhuma refeicao registrada.
- **Elementos:**
  - Ilustracao de prato vazio
  - Titulo: "Nenhuma refeicao registrada hoje"
  - Subtitulo: "O VitalAI detecta automaticamente quando voce come. Ou registre manualmente tocando no +"
  - Botao "Registrar refeicao"

### 11.3 Estado de Erro — Conexao Perdida

**Nome Figma:** `States / ConnectionError`

- **Descricao:** Quando o app perde conexao com o backend.
- **Elementos:**
  - Icone de nuvem com X
  - Titulo: "Sem conexao"
  - Subtitulo: "Suas notificacoes e deteccao de refeicao continuam funcionando offline. Os dados serao sincronizados quando voce reconectar."
  - Botao "Tentar novamente"

### 11.4 Estado de Erro — Wearable Desconectado

**Nome Figma:** `States / WearableDisconnected`

- **Descricao:** Banner persistente quando o watch esta desconectado.
- **Elementos:**
  - Banner amarelo (warning) no topo da home:
    - Icone de watch com exclamacao
    - "Apple Watch desconectado. Reconecte para continuar recebendo insights."
    - Botao "Reconectar"
  - Nota: Nao bloqueia o uso do app — apenas limita funcionalidades proativas.

---

## Resumo de Telas

| Fluxo | Telas | Total |
|---|---|---|
| Onboarding | Splash, Welcome, SignUp, ConnectWearable, NotificationPermission, HealthProfile, QuietHours | 7 |
| Home e Navegacao | Timeline, EventCardExpanded, Nutricao, Relatorios | 4 |
| Notificacoes | MorningSleep, PostWorkout, StressAlert, InactivityReminder, Hydration, PoorSleep | 6 |
| Deteccao de Refeicao | WatchAlert, PhoneAlert, CameraCapture, MealConfirmation, MealFeedback | 5 |
| Sugestao Nutricional | MealSuggestionCard, RecipeDetail, AlternativeMeals | 3 |
| Relatorio Semanal | Cover, SleepSection, NutritionSection, ActivitySection, WeeklyFocus | 5 |
| Relatorio Mensal | MonthlyCover, MonthlyGoals | 2 |
| Perfil e Configuracoes | Main, NotificationSettings, Devices, Subscription, Privacy | 5 |
| Paywall | PlanComparison, Confirmation | 2 |
| Apple Watch | Complication, Glance, MealNotification, BreathingExercise | 4 |
| Estados Vazios e Erros | FirstDay, NoMeals, ConnectionError, WearableDisconnected | 4 |
| **Total** | | **47 telas** |

---

## Notas Gerais para o Designer

1. **Mobile-first:** Todas as telas sao desenhadas para iPhone 15 Pro (393x852pt) como referencia. Adaptar para Android (Pixel 8) como segunda variante.
2. **Watch:** Apple Watch Series 9 (44mm, 396x484px) como referencia. Criar variante 40mm.
3. **Dark mode:** Nao e prioridade no MVP. Focar em light mode. Dark mode planejado para v1.1.
4. **Acessibilidade:** Contraste minimo WCAG AA (4.5:1 para texto). Fontes nao menores que 14px em mobile. Suporte a Dynamic Type no iOS.
5. **Animacoes:** Indicar com anotacoes no Figma. Transicoes suaves (300ms ease-in-out). Evitar animacoes que distraiam — o app e sobre saude, nao entretenimento.
6. **Ilustracoes:** Estilo flat, colorido, inclusivo (diversidade de genero, tom de pele, tipo corporal). Consistente em todo o app.
7. **Prototyping:** Criar prototype interativo no Figma para os fluxos criticos: Onboarding completo, Deteccao de refeicao (gesto -> confirmacao -> feedback), Leitura do relatorio semanal.
