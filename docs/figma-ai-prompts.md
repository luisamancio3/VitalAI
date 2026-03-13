# VitalAI — Figma AI Prompts

Prompts prontos para colar no Figma AI (Make Design) e gerar cada tela.
Copie e cole um prompt por vez. Apos gerar, ajuste cores e tipografia para manter consistencia.

**Cores para referencia:** Primary green #2DD4A8, Secondary blue #4A90D9, Background #FFFFFF, Surface #F7F8FA, Text #1A1A2E, Text secondary #6B7280, Success #22C55E, Warning #F59E0B, Error #EF4444, Stress orange #F97316.

**Fonte:** Inter.

---

## DESIGN SYSTEM

### Prompt DS-1: Component Library

```
Create a mobile app design system component library for a health coaching app called "VitalAI". Use Inter font, primary color #2DD4A8 (green), secondary #4A90D9 (blue), background white, text #1A1A2E. Include these components:

1. Buttons: Primary (green fill, white text), Secondary (green outline), Ghost (text only), Disabled (gray) — sizes Large (48px height), Medium (40px), Small (32px)
2. Input fields: Default, Focused (green border), Error (red border), Disabled — with and without left icon
3. Star rating: 5 stars, show empty and filled states in gold/yellow
4. Chips/Tags: Selectable (outline, fills on select with green) and Static (gray background) — for dietary restrictions
5. Macro pill: Small rounded pill showing icon + value + label (e.g. protein icon, "45g", "Proteina") — 4 color variants: red for protein, yellow for carbs, blue for fat, green for calories
6. Toggle switch: On (green) and Off (gray) with label
7. Progress bar: Linear (thin, green fill on gray track) and Circular (ring style, green on gray)
8. Bottom navigation bar: 4 tabs with icons and labels — Home, Nutricao, Relatorios, Perfil. Show active state (green icon + text) and inactive (gray)
9. Top navigation bar: Left back arrow, center title text, right action icon
10. Card: Rounded corners 12px, white background, subtle shadow, 16px padding
```

---

## FLOW 1 — ONBOARDING

### Prompt 1.1: Splash Screen

```
Design a mobile splash screen (iPhone 15 Pro, 393x852) for a health app called "VitalAI". Centered layout with the app logo (a stylized heart with a pulse line) and the wordmark "VitalAI" below it. Tagline underneath: "Seu companheiro proativo de saude". Background is a subtle gradient from #2DD4A8 to #1FA88A (green tones). Logo and text in white. Clean, minimal, premium feel. Inter font.
```

### Prompt 1.2: Welcome Carousel

```
Design a mobile onboarding welcome screen (iPhone 15 Pro) showing slide 1 of a 3-slide carousel for a health app called VitalAI.

Top half: Flat illustration of a smartwatch and smartphone connected with data flowing between them (health metrics like heart, sleep, steps icons floating between devices). Use green (#2DD4A8) and blue (#4A90D9) tones.

Bottom half on white background:
- Title: "Seus dados de saude, finalmente uteis" (22px bold, #1A1A2E)
- Subtitle: "O VitalAI transforma dados do seu smartwatch em sugestoes personalizadas no momento certo." (16px regular, #6B7280)
- 3 dot page indicator at the bottom (first dot active in green, others gray)
- At the very bottom: text link "Ja tenho conta" in #4A90D9

Inter font. Clean, modern, health/wellness aesthetic.
```

### Prompt 1.3: Welcome Carousel — Slide 2

```
Design mobile onboarding slide 2 of 3 (iPhone 15 Pro) for health app VitalAI.

Top half: Flat illustration showing a phone with notification cards floating above it — showing sample health notifications (sleep summary, meal suggestion, stress alert). Green and blue tones.

Bottom half on white:
- Title: "Voce nao precisa abrir o app" (22px bold, #1A1A2E)
- Subtitle: "Receba insights sobre sono, nutricao e estresse automaticamente — sem esforco." (16px regular, #6B7280)
- 3 dot page indicator (second dot active green)
- Text link "Ja tenho conta" in blue

Inter font.
```

### Prompt 1.4: Welcome Carousel — Slide 3

```
Design mobile onboarding slide 3 of 3 (iPhone 15 Pro) for health app VitalAI.

Top half: Flat illustration of a person reading a health report on their phone, looking satisfied. A coach figure or document with charts floating nearby. Green and blue tones.

Bottom half on white:
- Title: "Seu coach de saude pessoal" (22px bold, #1A1A2E)
- Subtitle: "Relatorios semanais com linguagem de coach, nao de planilha." (16px regular, #6B7280)
- Large green button (#2DD4A8): "Comecar" (white text, full width, 48px height, rounded 12px)
- 3 dot page indicator (third dot active green)
- Text link "Ja tenho conta" in blue below the button

Inter font.
```

### Prompt 1.5: Sign Up

```
Design a mobile sign up screen (iPhone 15 Pro) for health app VitalAI.

White background. Top: small VitalAI logo centered. Title: "Crie sua conta" (22px bold).

Two social login buttons stacked (full width, 48px height, rounded 12px):
- "Continuar com Apple" — black background, white Apple icon + text
- "Continuar com Google" — white background, gray border, Google icon + text

Horizontal divider with "ou" text in the middle (gray).

Below: Email input field with envelope icon, Password input field with lock icon and eye toggle.

Green primary button: "Criar conta" (full width, #2DD4A8, white text).

Small legal text at bottom: "Ao criar conta, voce concorda com os Termos de Uso e Politica de Privacidade" with blue underlined links.

Text link at very bottom: "Ja tenho conta? Entrar" in blue.

Inter font. Colors: primary #2DD4A8, text #1A1A2E, secondary text #6B7280.
```

### Prompt 1.6: Connect Wearable

```
Design a mobile screen (iPhone 15 Pro) asking user to connect their smartwatch for health app VitalAI.

Top: Progress bar showing step 3 of 5 (green fill #2DD4A8).

Center: Flat illustration of a smartwatch and phone connecting wirelessly (green/blue tones).

Title: "Conecte seu smartwatch" (22px bold, #1A1A2E).
Subtitle: "O VitalAI precisa acessar seus dados de saude para gerar insights personalizados. Seus dados nunca saem do seu aparelho sem sua permissao." (14px, #6B7280).

List of 5 data types requested, each with an icon and label on a subtle gray card:
- Heart icon: "Frequencia cardiaca"
- Wave icon: "Variabilidade cardiaca (HRV)"
- Moon icon: "Sono"
- Running icon: "Atividade fisica"
- Brain icon: "Nivel de estresse"

Small badge at bottom of list: lock icon + "Seus dados sao processados no seu dispositivo" (green text).

Green button: "Conectar Apple Health" (full width, #2DD4A8).
Text link below: "Pular por enquanto" (#6B7280).

Inter font. White background.
```

### Prompt 1.7: Notification Permission

```
Design a mobile screen (iPhone 15 Pro) for health app VitalAI asking notification permission.

Top: Progress bar step 4 of 5 (green #2DD4A8).

Center: Illustration showing 3 notification cards stacked/overlapping, looking like iOS notification previews. Each shows a brief health insight.

Title: "Insights que chegam ate voce" (22px bold).
Subtitle: "O VitalAI envia sugestoes no momento certo — sem voce precisar abrir o app. Voce controla a frequencia e os horarios." (14px, #6B7280).

Below: A realistic iOS notification preview mockup:
- App icon (small green circle) + "VitalAI" + "agora"
- Body: "Bom dia! Voce dormiu 7h12min com qualidade 85. Cafe sugerido: ovos mexidos com pao integral."
- Rounded card with subtle shadow on light gray background

Green button: "Ativar notificacoes" (full width, #2DD4A8).
Text link: "Agora nao" (#6B7280).

Inter font. White background.
```

### Prompt 1.8: Health Profile

```
Design a mobile screen (iPhone 15 Pro) for health app VitalAI — health and nutrition profile setup. Scrollable content.

Top: Progress bar step 4 of 5 (green #2DD4A8). Title: "Seu perfil de saude".

Section 1 — "Qual seu objetivo principal?" (18px semibold):
4 selectable cards in a 2x2 grid, each with an icon and label. One card is selected (green border + light green background):
- Scale icon: "Emagrecer"
- Dumbbell icon: "Ganhar massa muscular" (selected)
- Lightning icon: "Melhorar performance"
- Heart icon: "Saude geral"

Section 2 — "Alguma restricao alimentar?" (18px semibold):
Horizontal wrap of selectable chips (rounded pills). Some selected (green fill, white text), others unselected (gray outline):
- Vegetariano, Vegano, Sem gluten (selected), Sem lactose, Low carb, Sem frutos do mar
- Text input below: "Outra restricao" with placeholder text

Section 3 — "Na cozinha, voce e..." (18px semibold):
3 selectable cards stacked vertically, one selected:
- Chef hat simple: "Pratico" — "Prefiro receitas de ate 15min"
- Chef hat medium: "Intermediario" — "Cozinho bem, aceito receitas de ate 30min" (selected)
- Chef hat fancy: "Chef" — "Adoro cozinhar, pode mandar receitas elaboradas"

Bottom sticky: Green button "Continuar" + text link "Pular".

Inter font. Colors: #2DD4A8 green, #1A1A2E text, #F7F8FA surface, white background.
```

### Prompt 1.9: Quiet Hours Setup

```
Design a mobile screen (iPhone 15 Pro) for health app VitalAI — notification schedule configuration.

Top: Progress bar step 5 of 5 (green #2DD4A8). Title: "Seus horarios".

Section 1 — "Quando voce prefere nao ser interrompido?" (18px semibold):
A 24-hour circular clock visualization showing a shaded quiet zone from 22:00 to 07:00 (dark gray arc). The active hours (07:00-22:00) shown in green arc. Two draggable handles at 22:00 and 07:00.
Below the clock: "Silencio das 22:00 as 07:00" label.

Toggle row: "Respeitar modo Foco do iPhone" — toggle ON (green).

Section 2 — "Quantas notificacoes por dia?" (18px semibold):
Horizontal slider from 2 to 10, thumb positioned at 6 (green #2DD4A8). Dynamic label above: "Ate 6 notificacoes por dia" (16px, green text).

Bottom: Large green button "Comecar a usar o VitalAI" (full width, #2DD4A8, white text, 48px height).

Inter font. White background. Colors: #2DD4A8 primary, #1A1A2E text, #6B7280 secondary.
```

---

## FLOW 2 — HOME & NAVIGATION

### Prompt 2.1: Home Timeline

```
Design a mobile home screen (iPhone 15 Pro) for health app VitalAI showing daily timeline.

Top bar: "Bom dia, Luis" (left, 22px bold), circular avatar with initials "L" (right), gear icon for settings.

Below top bar — Summary card (rounded, subtle shadow, white on #F7F8FA):
- Left: Large circular progress ring (green #2DD4A8) with "78" score in the center (36px bold)
- Right: 3 mini metrics stacked vertically:
  - Moon icon + "6h48m" + "Sono"
  - Wave icon + "45ms" + "HRV"
  - Footsteps icon + "3.240" + "Passos"

Below: Vertical timeline with time markers on the left and cards on the right:
- 07:12 — Card "Resumo do sono" with moon icon, subtitle "Qualidade 72 • 6h48min", small green "Ver" link
- 08:30 — Card "Cafe da manha" with fork icon, "Ovo mexido, pao integral", 4 stars shown
- 12:15 — Card "Sugestao de almoco" with sparkle/AI icon, "Frango grelhado com arroz", green button "Ver receita"
- 14:00 — Card "Lembrete de movimento" with walking icon, "90min inativo", gray text
- 18:30 — Card "Treino detectado" with running icon, "Corrida 42min • 380kcal", green accent

Green FAB (floating action button) bottom right: "+" icon.

Bottom navigation bar: Home (active, green icon), Nutricao, Relatorios, Perfil (all gray).

Inter font. White background. Timeline line is thin gray vertical.
```

### Prompt 2.2: Event Card Expanded

```
Design a mobile screen (iPhone 15 Pro) showing an expanded event card overlay for health app VitalAI.

Background: The home timeline screen dimmed/blurred.

Foreground: Large white card (bottom sheet style, rounded top corners 20px) taking up 70% of the screen:

Header: Moon icon + "Resumo do sono" (18px semibold) + "Hoje, 07:12" (12px gray) + X close button top right.

AI message text (16px, #1A1A2E): "Bom dia, Luis! Voce dormiu 6h48min com qualidade 72. Seu HRV esta um pouco abaixo do normal — o dia de hoje pede energia moderada."

Sleep phases chart: Horizontal stacked bar showing 4 colors — Acordado (red, thin), Leve (light blue), Profundo (dark blue), REM (purple). Labels below.

Metrics in 2x2 grid of small cards:
- "Duracao" — "6h48m"
- "Qualidade" — "72/100"
- "HRV" — "38ms"
- "Ciclos" — "4"

Bottom of card: Two buttons side by side:
- "Util" (green outline, thumbs up icon)
- "Nao relevante" (gray outline, thumbs down icon)

Inter font. Colors: #2DD4A8, #1A1A2E, #6B7280.
```

### Prompt 2.3: Nutrition Daily View

```
Design a mobile nutrition screen (iPhone 15 Pro) for health app VitalAI.

Top bar: "Nutricao" title centered. Date selector showing "Hoje, 13 Mar" with left/right arrows.

Macro summary card (white card, subtle shadow):
4 macro pills in a horizontal row, each showing:
- Colored icon + current/goal + label + thin progress bar
- Proteina: red icon, "62g / 150g", 41% filled
- Carboidrato: yellow icon, "98g / 250g", 39% filled
- Gordura: blue icon, "28g / 70g", 40% filled
- Calorias: green icon, "892 / 2200", 40% filled

Below: List of meal cards stacked vertically:

1. "Cafe da manha" — 08:30 — Card with small food photo thumbnail on left, "Ovo mexido com pao integral" title, "320kcal • P:22g C:35g G:12g" subtitle, 4 filled stars (gold). Green check badge.

2. "Almoco" — Card with AI sparkle icon, "Sugestao: Frango grelhado com arroz" title, "Aceitar" green button + "Outra opcao" gray button. Light green background tint.

3. "Lanche" — Empty state: dashed border card, fork+knife icon grayed, "Registrar refeicao" text link.

4. "Jantar" — Empty state: same dashed style, "Registrar refeicao" text link.

Green FAB bottom right: "+".
Bottom nav: Home, Nutricao (active green), Relatorios, Perfil.

Inter font. White background.
```

### Prompt 2.4: Reports List

```
Design a mobile reports list screen (iPhone 15 Pro) for health app VitalAI.

Top bar: "Relatorios" title centered.

Tab bar below: Two tabs — "Semanais" (active, green underline #2DD4A8) | "Mensais" (inactive, gray text).

List of report cards stacked vertically:

Card 1 (newest): White card with subtle shadow.
- "Semana 10" (18px semibold) + green "Novo" badge (small rounded pill)
- "3 a 9 de marco de 2026" (14px gray)
- Right side: Score "78" in green circle
- Bottom: One-line preview "Sua semana de sono melhorou 8% em relacao a anterior"

Card 2: Same style without "Novo" badge.
- "Semana 9"
- "24 fev a 2 de marco de 2026"
- Score "75"
- Preview "3 treinos completados, proteina dentro da meta"

Card 3: Same style.
- "Semana 8"
- "17 a 23 de fevereiro de 2026"
- Score "71"

Bottom nav: Home, Nutricao, Relatorios (active green), Perfil.

Inter font. Background #F7F8FA. Cards white.
```

---

## FLOW 3 — NOTIFICATIONS

### Prompt 3.1: Morning Sleep Notification

```
Design a realistic iPhone 15 Pro lock screen showing a notification from health app VitalAI.

Lock screen: Time "07:12" large at top, date "Quinta-feira, 13 de marco" below. A subtle wallpaper (dark gradient or nature).

Notification card (iOS style, rounded, blurred glass background):
- Left: Small green app icon with heart pulse logo
- Header: "VitalAI" + "agora"
- Body text: "Bom dia, Luis! Voce dormiu 6h48min com qualidade 72. Seu HRV esta um pouco abaixo do normal — cafe sugerido: ovo mexido com pao integral e uma fruta."
- Below (expanded/long-press view): Two action buttons — "Ver detalhes" | "Util"

Make it look like a real iOS notification on a real lock screen. Accurate iOS styling.
```

### Prompt 3.2: Post-Workout Notification

```
Design a realistic iPhone 15 Pro lock screen notification from health app VitalAI.

Lock screen: Time "18:30", wallpaper visible.

Notification card (iOS style):
- Green app icon
- "VitalAI — Treino detectado" + "agora"
- Body: "Otimo treino! Voce queimou ~380kcal em 42min de corrida. Para recuperacao, proteina + carb em ate 45min. Que tal um wrap de frango com arroz? Leva 15min."
- Action buttons: "Ver receita" | "Outra opcao"

Realistic iOS notification styling.
```

### Prompt 3.3: Stress Alert Notification

```
Design a realistic iPhone 15 Pro lock screen notification from health app VitalAI.

Lock screen: Time "21:45", darker wallpaper (evening).

Notification card (iOS style):
- Green app icon
- "VitalAI" + "agora"
- Body: "Percebi que voce esta com o estresse um pouco elevado agora. Que tal 5 minutos de respiracao antes de dormir? Seu sono vai agradecer."
- Action buttons: "Iniciar respiracao" | "Agora nao"

Realistic iOS notification styling.
```

### Prompt 3.4: Inactivity Reminder Notification

```
Design a realistic iPhone 15 Pro lock screen notification from VitalAI health app.

Lock screen: Time "15:22", daytime wallpaper.

Notification (iOS style):
- Green app icon
- "VitalAI" + "agora"
- Body: "Ja faz 90 minutos sem movimento. Uma caminhada rapida de 5 minutos faz diferenca — seu corpo agradece."
- Action buttons: "Ok, vou me mexer" | "Estou ocupado"
```

### Prompt 3.5: Hydration Reminder Notification

```
Design a realistic iPhone 15 Pro lock screen notification from VitalAI health app.

Lock screen: Time "16:10", bright wallpaper.

Notification (iOS style):
- Green app icon
- "VitalAI" + "agora"
- Body: "Dia quente + treino pesado = hidratacao redobrada. Ja bebeu agua nas ultimas 2 horas?"
- Action buttons: "Ja bebi" | "Vou beber agora"
```

### Prompt 3.6: Poor Sleep Notification

```
Design a realistic iPhone 15 Pro lock screen notification from VitalAI health app.

Lock screen: Time "07:05", morning wallpaper.

Notification (iOS style):
- Green app icon
- "VitalAI" + "agora"
- Body: "Noite curta — 5h12min com HRV baixo. Hoje o corpo pede calma: treino leve, comida nutritiva e dormir mais cedo. Cafe sugerido: aveia com banana e mel."
- Action buttons: "Ver sugestoes do dia" | "Entendi"
```

---

## FLOW 4 — MEAL DETECTION

### Prompt 4.1: Watch Meal Detection Alert

```
Design an Apple Watch (44mm, 396x484px) notification screen for health app VitalAI.

Black background (OLED). Centered layout:
- Small green VitalAI icon at top (heart pulse logo)
- Text: "Comendo agora?" (18px, white, Inter bold)
- Two large circular buttons side by side at bottom:
  - Green circle with white checkmark (Sim)
  - Dark gray circle with white X (Nao)

Ultra-minimal. Large touch targets. Apple Watch Series 9 frame if possible.
```

### Prompt 4.2: Phone Meal Detection Alert

```
Design a mobile screen (iPhone 15 Pro) for VitalAI health app showing a meal detection notification as an in-app bottom sheet.

Background: Home timeline screen visible but dimmed.

Bottom sheet (white, rounded top 20px, ~40% of screen):
- Small green AI sparkle icon + "Refeicao detectada" (16px semibold)
- "Parece que voce esta comendo. E almoco?" (14px, #6B7280)
- Suggested meal card (light green tint #F0FDF9, rounded):
  - "Almoco de sempre?" (16px bold)
  - "Arroz, feijao, frango grelhado e salada" (14px gray)
- Three buttons in a row:
  - "Confirmar" (green filled, primary)
  - "Corrigir" (gray outline)
  - Camera icon button (gray outline, no text)

Inter font.
```

### Prompt 4.3: Camera Food Capture

```
Design a mobile camera screen (iPhone 15 Pro) for food recognition in VitalAI health app.

Full-screen camera viewfinder (dark, simulating a plate of food being photographed).

Overlay elements:
- Top left: "Cancelar" text in white
- Top right: Flash icon (white)
- Center: Circular guide outline (thin white dashed circle) with text "Posicione o prato no centro" (small white text above the circle)
- Bottom center: Large white circular capture button (standard camera button style)

Clean, minimal camera UI. Dark edges/vignette around the viewfinder.
```

### Prompt 4.4: Food Recognition Result

```
Design a mobile screen (iPhone 15 Pro) for VitalAI showing food recognition results after photo capture.

Top: Photo of a lunch plate (rice, grilled chicken, salad) with subtle colored bounding boxes around each identified food item.

Below the photo, white card area:
Title: "Alimentos identificados" (18px semibold)

List of detected items, each on its own row:
- Green check icon + "Arroz branco" + "45g carb, 4g prot" (right-aligned gray)
- Green check icon + "Frango grelhado" + "32g prot, 3g gord"
- Green check icon + "Salada mista" + "2g carb, 1g gord"

Divider line.

Total row (bold): "Total estimado" — "420kcal | P:36g C:47g G:12g"
Show 4 macro pills below the total.

Two buttons at bottom:
- "Confirmar" (green filled, full width)
- "Corrigir" (gray outline, full width)

Inter font. White background.
```

### Prompt 4.5: Meal Feedback

```
Design a mobile bottom sheet (iPhone 15 Pro) for meal feedback in VitalAI health app.

Background: Nutrition screen dimmed.

Bottom sheet (white, rounded top 20px, ~50% of screen height):
- Title: "Como foi o almoco?" (18px semibold)
- Small meal info: Fork icon + "Frango grelhado com arroz" + "12:35" (14px gray)
- 5 large stars in a row (gold/yellow when filled, gray outline when empty). Show 4 stars filled.
- Text input area below with placeholder: "Algum comentario? (opcional)" — light gray border, rounded. Example text in gray: "Ex: muito salgado, porcao pequena..."
- Green button: "Enviar" (full width, #2DD4A8)
- Text link below: "Pular" (#6B7280)

Inter font. Clean and fast — this should feel completable in under 10 seconds.
```

---

## FLOW 5 — NUTRITION SUGGESTIONS

### Prompt 5.1: Meal Suggestion Card

```
Design a mobile meal suggestion card screen (iPhone 15 Pro) for VitalAI health app.

Top bar: Back arrow + "Sugestao pos-treino" title.

Large card filling most of the screen:
- Hero food photo at top (appetizing wrap/burrito, warm lighting) — rounded top corners
- Green tag overlaid on bottom of photo: "Ideal pos-treino"
- Clock icon + "15 min" next to the tag

Below photo:
- Title: "Wrap de frango com arroz" (22px bold)
- 4 macro pills in a row: Proteina 45g (red), Carb 62g (yellow), Gordura 12g (blue), 530kcal (green)
- AI-generated text: "Proteina e carb na medida certa para recuperacao muscular apos sua corrida de hoje." (14px, #6B7280, with small sparkle/AI icon)

Bottom sticky area:
- Green button: "Vou fazer essa" (full width, #2DD4A8)
- Gray outline button: "Ver outra opcao"
- Text link: "Ver receita completa"

Inter font. White background.
```

### Prompt 5.2: Recipe Detail

```
Design a mobile recipe detail screen (iPhone 15 Pro) for VitalAI health app. Scrollable.

Hero image: Large food photo at top (wrap de frango com arroz, appetizing).

Below (white background):
Title: "Wrap de frango com arroz" (22px bold)
Tags row: "Pos-treino" (green pill), "15 min" (gray pill), "Alto em proteina" (gray pill)

Section "Informacao nutricional":
Table showing per serving: Calorias 530 | Proteina 45g | Carboidrato 62g | Gordura 12g | Fibra 4g

Section "Ingredientes" (18px semibold):
Checklist with checkboxes:
- [ ] 1 tortilha integral grande
- [x] 150g peito de frango grelhado
- [ ] 1/2 xicara arroz cozido
- [ ] Alface, tomate, cenoura ralada
- [ ] 1 colher de requeijao light

Servings adjuster: "1 porcao" with - and + buttons.

Section "Modo de preparo" (18px semibold):
Numbered steps:
1. Grelhe o frango temperado com sal e pimenta por 5 minutos de cada lado.
2. Aqueça a tortilha no microondas por 20 segundos.
3. Monte: espalhe requeijao, adicione arroz, frango fatiado e vegetais.
4. Enrole firme e corte ao meio.

Bottom sticky: Green button "Fiz essa refeicao" + Share icon button.

Inter font.
```

### Prompt 5.3: Alternative Meals

```
Design a mobile screen (iPhone 15 Pro) showing alternative meal suggestions for VitalAI health app.

Top bar: Back arrow + "Outras opcoes" title.

Subtitle: "Todas com proteina e carb para recuperacao" (14px, #6B7280, with AI sparkle icon).

3 meal cards stacked vertically, each card showing:
- Left: Small square food photo (80x80px, rounded 8px)
- Right side content:
  - Meal name (16px semibold): "Omelete de frango com batata doce"
  - Prep time: Clock icon + "20 min" (12px gray)
  - Macros: "P:38g C:45g G:14g • 460kcal" (12px gray)
- Chevron right icon on far right

Card 1: "Omelete de frango com batata doce" — 20 min
Card 2: "Bowl de atum com quinoa" — 15 min
Card 3: "Sanduiche natural de frango" — 10 min
Card 4: "Shake proteico com banana e aveia" — 5 min

Bottom: Text link "Nenhuma me agrada — registrar refeicao manual" (#4A90D9)

Inter font. Background #F7F8FA. Cards white with subtle shadow.
```

---

## FLOW 6 — WEEKLY REPORT

### Prompt 6.1: Weekly Report Cover

```
Design a mobile weekly report cover screen (iPhone 15 Pro) for VitalAI health app.

Top bar: Back arrow + "Relatorio semanal" + Share icon.

White background. Centered content:
- "Sua semana em resumo" (22px bold)
- "3 a 9 de marco de 2026" (14px gray)

Large circular score in center: Green ring (#2DD4A8) at 78% fill with "78" in the center (48px bold). Below the ring: "3 pontos acima da semana passada" with green up arrow.

4 pillar cards in 2x2 grid below:
- Sono: Moon icon, score "72", small colored bar
- Nutricao: Fork icon, score "81", small colored bar
- Atividade: Running icon, score "85", small colored bar
- Bem-estar: Heart icon, score "74", small colored bar
Each card is white with subtle shadow, score colored based on value (green if >75, yellow if 60-75, red if <60).

Bottom:
- Green button: "Ler relatorio completo" (full width)
- Gray outline button: "Exportar PDF" with download icon

Inter font.
```

### Prompt 6.2: Weekly Report — Sleep Section

```
Design a mobile report section screen (iPhone 15 Pro) for VitalAI showing sleep data.

Top bar: Back arrow + "Relatorio semanal" + "Sono" tab active.

Section header: Moon icon + "Sono" (22px bold) + Score badge "72" in circle.

Bar chart: 7 bars (Mon-Sun) showing sleep duration per night. Y-axis: 0-9 hours. Bars colored green if >7h, yellow if 6-7h, red if <6h. Wednesday bar tallest (7h34m), Friday shortest (5h12m). Gray horizontal line at 7h (goal).

Line chart below: HRV trend line across the week. Green line on light gray grid. Labeled "HRV noturno (ms)".

Metrics in 2x2 grid:
- "Media de duracao" — "6h52min"
- "Media de qualidade" — "72/100"
- "Melhor noite" — "Quarta (7h34m)"
- "Pior noite" — "Sexta (5h12m)"

Coach text (14px, with AI sparkle icon): "Sua semana de sono foi razoavel mas com uma queda significativa na sexta. Seu HRV ficou abaixo da sua baseline em 3 das 7 noites. Tente manter um horario mais consistente para dormir."

Bottom: Navigation hint "Deslize para Nutricao ->" (14px gray, right arrow).

Inter font. White background.
```

### Prompt 6.3: Weekly Report — Nutrition Section

```
Design a mobile report section screen (iPhone 15 Pro) for VitalAI showing nutrition data.

Top bar: Back arrow + "Relatorio semanal" + "Nutricao" tab active.

Section header: Fork icon + "Nutricao" (22px bold) + Score badge "81" in green circle.

Stacked bar chart: 7 bars (Mon-Sun) with 3 colors stacked — red (protein), yellow (carbs), blue (fat). Gray dashed line at calorie goal. Labels on x-axis.

Metrics in list:
- "Refeicoes registradas" — "19/21 (90%)" with green progress bar
- "Media de proteina" — "142g/dia (meta: 150g)" with progress bar at 94%
- "Dias dentro da meta calorica" — "5/7" with progress bar

Coach text with AI sparkle icon: "Excelente aderencia ao registro de refeicoes essa semana! Sua proteina ficou consistentemente perto da meta. Nos dias de treino, aumente o carb em 15-20% para melhor recuperacao."

"Refeicoes favoritas da semana" subtitle:
2 small horizontal cards showing top-rated meals with stars:
- "Wrap de frango com arroz" — 5 stars
- "Omelete com batata doce" — 4 stars

Inter font. White background.
```

### Prompt 6.4: Weekly Report — Activity Section

```
Design a mobile report section screen (iPhone 15 Pro) for VitalAI showing activity/exercise data.

Section header: Running icon + "Atividade" (22px bold) + Score badge "85" in green circle.

Bar chart: Daily calories burned (Mon-Sun). Green bars. Dashed gray line at daily goal. Some bars above goal, some below.

Workout list — 3 cards:
- "Seg — Musculacao" — "55min • 420kcal" — dumbbell icon
- "Qua — Corrida" — "42min • 380kcal" — running icon
- "Sex — HIIT" — "30min • 310kcal" — flame icon
Each with a small colored accent on the left border.

Metrics row:
- "Passos medios" — "8.420/dia"
- "Minutos ativos" — "187/semana"

Coach text with sparkle: "3 treinos na semana com boa variedade. Sua FC pos-treino voltou ao normal mais rapido na quarta do que na segunda — sinal de que seu condicionamento esta melhorando."

Inter font. White background.
```

### Prompt 6.5: Weekly Report — Focus Goals

```
Design a mobile screen (iPhone 15 Pro) for VitalAI showing 3 weekly focus goals — the closing section of the weekly report.

Title: "Seus 3 focos para a semana que vem" (22px bold).

3 goal cards stacked vertically, each white with subtle shadow and left colored border:

Card 1 (blue left border):
- Moon icon (blue)
- "Dormir ate 23h pelo menos 5 dias" (16px semibold)
- "Suas melhores noites foram quando voce dormiu antes das 23h" (14px gray)
- Unchecked circular checkbox on the right

Card 2 (red left border):
- Protein/meat icon (red)
- "Atingir 150g de proteina nos dias de treino" (16px semibold)
- "Voce ficou em 142g — faltam 8g, equivale a 1 ovo extra" (14px gray)
- Unchecked checkbox

Card 3 (cyan left border):
- Water drop icon (cyan)
- "Beber agua a cada 2h nos dias de treino" (16px semibold)
- "Seus dias de melhor HRV foram os com melhor hidratacao" (14px gray)
- Unchecked checkbox

Green button: "Aceitar focos e comecar a semana" (full width, #2DD4A8).
Gray outline button: "Exportar relatorio (PDF)".
Closing text: "Ate domingo que vem. Boa semana, Luis!" (14px, #6B7280, centered, with small green heart).

Inter font. Background #F7F8FA.
```

---

## FLOW 7 — MONTHLY REPORT

### Prompt 7.1: Monthly Report Overview

```
Design a mobile monthly report screen (iPhone 15 Pro) for VitalAI health app.

Title: "Fevereiro 2026" (22px bold) + subtitle "Seu mes em resumo".

Score: Large "81" in green circular ring, with "6 pontos acima de janeiro" and green up arrow.

4 mini line charts in 2x2 grid (sparkline style on small cards):
- "Sono" — upward trend line, green, score "74"
- "Nutricao" — stable trend, green, score "81"
- "Atividade" — upward trend, green, score "83"
- "Bem-estar" — slight upward, yellow, score "72"

"Destaques do mes" section with trophy icon:
3 highlight rows:
- Star icon + "Melhor semana de sono: Semana 2"
- Footsteps icon + "Recorde de passos: 14.200 em 18/fev"
- Fork icon + "Maior streak de refeicoes: 12 dias"

Coach text paragraph (14px, sparkle icon).

Buttons: "Exportar PDF" (green) + "Compartilhar com profissional" (gray outline).

Inter font. White background.
```

### Prompt 7.2: Monthly Goals Progress

```
Design a mobile screen (iPhone 15 Pro) for VitalAI showing monthly progress vs goals.

Title: "Progresso em relacao ao seu objetivo" (22px bold).
Badge: "Ganho de massa muscular" (green pill with dumbbell icon).

3 progress metrics, each on its own card:
- "Media de proteina" — "138g/dia" of "150g meta" — horizontal progress bar at 92% (green)
- "Treinos por semana" — "3.2" of "4 meta" — progress bar at 80% (yellow)
- "Qualidade do sono" — "74" of "80 meta" — progress bar at 92% (green)

Below: Line chart showing 3-month evolution (Dec, Jan, Feb) with overall score trending upward. X-axis: months, Y-axis: score 0-100.

Coach text with sparkle icon about recommended adjustments.

Inter font. White background.
```

---

## FLOW 8 — PROFILE & SETTINGS

### Prompt 8.1: Profile Main

```
Design a mobile profile screen (iPhone 15 Pro) for VitalAI health app.

Top section: Centered circular avatar with initials "LA" (green background, white text, 64px), "Luis Amancio" (18px bold), "luis@email.com" (14px gray). Green "Premium" badge pill below name.

Settings list with sections, each row has left icon + label + right chevron:

Section "Conta":
- Person icon + "Perfil de saude"
- Watch icon + "Dispositivos conectados" + green dot indicator "Conectado"
- Bell icon + "Notificacoes"
- Credit card icon + "Plano e assinatura"

Section "Dados":
- Download icon + "Exportar meus dados"
- Shield icon + "Privacidade"

Section "Suporte":
- Question icon + "Ajuda e suporte"
- Info icon + "Sobre o VitalAI" + "v1.0.0" gray text

"Sair" button at bottom (red text, no background).

Bottom nav: Home, Nutricao, Relatorios, Perfil (active green).

Inter font. Background #F7F8FA. White card sections.
```

### Prompt 8.2: Notification Settings

```
Design a mobile notification settings screen (iPhone 15 Pro) for VitalAI health app.

Top bar: Back arrow + "Notificacoes" title.

Section "Geral" (white card):
- Toggle row: "Notificacoes ativadas" — toggle ON (green)
- Slider row: "Limite diario" — slider at 6, value label "6/dia" in green
- Time picker row: "Horario de silencio" — "22:00 ate 07:00" with clock icon

Section "Por tipo" (white card) — list of toggle rows:
- Moon icon + "Resumo matinal de sono" — ON (green)
- Fork icon + "Sugestoes de refeicao" — ON
- Brain icon + "Alerta de estresse" — ON
- Walking icon + "Lembrete de movimento" — ON
- Water icon + "Lembrete de hidratacao" — OFF (gray)
- Utensils icon + "Deteccao de refeicao" — ON

Section "Feedback" (white card):
- Star icon + "Pedir avaliacao apos refeicoes" — ON

Inter font. Background #F7F8FA. Green toggles #2DD4A8.
```

### Prompt 8.3: Connected Devices

```
Design a mobile connected devices screen (iPhone 15 Pro) for VitalAI.

Top bar: Back arrow + "Dispositivos conectados".

Connected device card (white, shadow, green left border):
- Apple Watch icon (large, 48px)
- "Apple Watch Series 9" (16px bold)
- Green dot + "Conectado" (14px green)
- "Ultima sincronizacao: Ha 3 minutos" (12px gray)
- Data types with green checkmarks: FC, HRV, Sono, Atividade, SpO2
- Red text link: "Desconectar"

Below: Green outline button "Conectar novo dispositivo" with + icon.

Section "Dispositivos compativeis" (14px gray header):
List with icons:
- Apple Watch icon + "Apple Watch" + green "Suportado" badge
- Wear OS icon + "Wear OS" + gray "Em breve" badge
- Garmin icon + "Garmin" + gray "Em breve" badge
- Oura icon + "Oura Ring" + gray "Futuro" badge

Inter font. Background #F7F8FA.
```

### Prompt 8.4: Subscription Management

```
Design a mobile subscription screen (iPhone 15 Pro) for VitalAI.

Top bar: Back arrow + "Plano e assinatura".

Current plan card (white, green border, subtle green tint):
- Green "Premium" badge (large)
- "R$ 39/mes" (22px bold)
- "Proximo pagamento: 12 de abril de 2026" (14px gray)
- Green outline button: "Gerenciar assinatura"

Below: "Seu plano inclui:" with checkmark list:
- Proatividade completa ao longo do dia
- Loop de feedback nutricional
- Relatorio semanal completo
- Historico ilimitado

Upgrade section: "Quer mais?" card:
- "Pro — R$ 79/mes" title
- Extra features: Relatorio mensal, Exportacao PDF, Suporte prioritario
- Green button: "Upgrade para Pro"

Bottom: Red text link "Cancelar assinatura".

Inter font. Background #F7F8FA.
```

### Prompt 8.5: Privacy and Data

```
Design a mobile privacy settings screen (iPhone 15 Pro) for VitalAI.

Top bar: Back arrow + "Privacidade e dados".

Info card (light blue tint, shield icon):
"Seus dados biometricos sao processados no seu dispositivo e nunca sao compartilhados sem sua permissao." (14px)

Section "Seus dados" (white card):
- Download icon + "Exportar todos os meus dados" — button style row with chevron. Subtitle: "Gera arquivo ZIP com todos os dados em JSON/CSV"
- Trash icon (red) + "Solicitar exclusao da conta" — red text row with chevron. Subtitle: "Seus dados serao removidos em ate 72h"

Section "Documentos" (white card):
- Document icon + "Politica de privacidade" — link row
- Document icon + "Termos de uso" — link row
- Check icon + "Consentimento LGPD" — "Aceito em 13/03/2026" (green text)

Section "Preferencias" (white card):
- Toggle row: "Permitir dados anonimizados para melhoria do produto" — OFF (gray toggle)
- Subtitle: "Dados agregados e anonimizados, sem identificacao pessoal"

Inter font. Background #F7F8FA.
```

---

## FLOW 9 — PAYWALL

### Prompt 9.1: Plan Comparison Paywall

```
Design a mobile paywall screen (iPhone 15 Pro) for VitalAI health app. Scrollable.

Top: X close button (top right). Title: "Desbloqueie seu potencial completo" (22px bold, centered). Subtitle: "Escolha o plano ideal para voce" (14px gray).

Toggle switch centered: "Mensal" | "Anual" with "Economize 25%" green badge on annual.

3 plan cards stacked vertically:

Card 1 "Free" (gray border, no fill):
- "Free" title + "Atual" badge (gray)
- Bullet list (14px): Resumo matinal de sono, 2 sugestoes/dia, Resumo semanal basico
- "Gratis" price
- Gray button "Plano atual" (disabled)

Card 2 "Premium" (green border, light green tint, "Recomendado" green badge):
- "Premium" title (18px bold)
- Bullet list with green checkmarks: Tudo do Free, Proatividade completa, Feedback nutricional, Relatorio semanal completo, Historico ilimitado
- "R$ 39/mes" (22px bold) or "R$ 349/ano" if annual toggle
- Green filled button: "Assinar Premium"

Card 3 "Pro" (blue border):
- "Pro" title
- Bullet list: Tudo do Premium, Relatorio mensal, Exportacao PDF, Suporte prioritario
- "R$ 79/mes" or "R$ 699/ano"
- Blue outline button: "Assinar Pro"

Bottom: "Continuar com Free" text link + "Cancele a qualquer momento" (12px gray).

Inter font.
```

### Prompt 9.2: Subscription Confirmation

```
Design a mobile success confirmation screen (iPhone 15 Pro) for VitalAI after subscribing.

Centered layout on white background:
- Large animated green checkmark in circle (80px) at top center
- "Bem-vindo ao Premium!" (22px bold, #1A1A2E)
- "Agora voce tem acesso a tudo que o VitalAI pode oferecer." (14px, #6B7280)

Features unlocked list with green checkmarks:
- Proatividade completa ao longo do dia
- Loop de feedback nutricional
- Relatorio semanal completo
- Historico ilimitado

Confetti/sparkle subtle decorative elements.

Green button at bottom: "Comecar a explorar" (full width, #2DD4A8).

Inter font. Celebratory but not over-the-top.
```

---

## FLOW 10 — APPLE WATCH

### Prompt 10.1: Watch Complication

```
Design Apple Watch complications for VitalAI health app on a watch face.

Show a watch face (Infograph Modular or similar) with VitalAI complications:

Circular complication (small): Green ring at 78% fill with "78" score number inside. VitalAI text below.

Rectangular complication: "VitalAI" label left, "78" score center with small green up arrow, tiny spark line chart right.

Use dark background (OLED black). Green #2DD4A8 accent color. SF Compact font. Apple Watch 44mm frame.
```

### Prompt 10.2: Watch Glance View

```
Design an Apple Watch app main screen (44mm, 396x484px) for VitalAI health app.

Black OLED background. Content:
- Top: Small green VitalAI logo
- Center: Large "78" score (44px bold white) inside thin green ring (70% fill)
- Below score: 3 metrics in a horizontal row (small, 12px):
  - Moon icon + "6h48m" (white)
  - Wave icon + "45ms" (white)
  - Footsteps icon + "3.2k" (white)
- Bottom: Small card with subtle dark gray background:
  - Fork icon + "Almoco sugerido: 12:30" (14px, light gray)

Minimal. Clean. High contrast for OLED. Apple Watch Series 9 frame.
```

### Prompt 10.3: Watch Breathing Exercise

```
Design an Apple Watch breathing exercise screen (44mm) for VitalAI health app.

Black OLED background:
- Center: Large concentric circles animation (expanded state = "Inspire"). Circles in calming green/teal gradient (#2DD4A8 to #4A90D9). Soft glow effect.
- Text below circles: "Inspire..." (18px, white, centered)
- Timer: "4:32" (14px, light gray, below the text)
- Bottom: Small "Encerrar" text button (dark gray text, subtle)

Calming, meditative feel. Smooth gradients. Apple Watch frame.
```

---

## FLOW 11 — EMPTY & ERROR STATES

### Prompt 11.1: First Day Empty State

```
Design a mobile empty state screen (iPhone 15 Pro) for VitalAI — user's first day, no data yet.

Top bar: "Bom dia, Luis" + avatar.

Center content:
- Friendly flat illustration: Person wearing a smartwatch, looking at their phone with a smile. Green/blue color palette. Inclusive design.
- Title: "Seu dia esta comecando!" (22px bold)
- Subtitle: "Use seu smartwatch normalmente. O VitalAI vai comecar a te conhecer e enviar insights personalizados em breve." (14px, #6B7280)

Setup checklist (3 items, each on a small row):
- Green check + "Smartwatch conectado"
- Green check + "Notificacoes ativadas"
- Orange circle + "Perfil incompleto" (pending)

Green button: "Completar perfil"

Bottom nav: Home (active), Nutricao, Relatorios, Perfil.

Inter font. White background. Warm and encouraging.
```

### Prompt 11.2: No Meals Empty State

```
Design a mobile empty state for the nutrition tab (iPhone 15 Pro) in VitalAI.

Top bar: "Nutricao" + date "Hoje, 13 Mar".

Macro summary showing all zeros: P: 0g, C: 0g, G: 0g, Cal: 0 — progress bars empty.

Center: Flat illustration of an empty plate with fork and knife, friendly style, muted green/gray.
- Title: "Nenhuma refeicao registrada hoje" (18px semibold)
- Subtitle: "O VitalAI detecta automaticamente quando voce come. Ou registre manualmente tocando no +" (14px, gray)
- Green outline button: "Registrar refeicao"

Green FAB at bottom right.
Bottom nav with Nutricao active.

Inter font. Background #F7F8FA.
```

### Prompt 11.3: Connection Error

```
Design a mobile error state screen (iPhone 15 Pro) for VitalAI — no internet connection.

Same layout as home but with centered overlay:
- Cloud icon with X mark (gray, 64px)
- Title: "Sem conexao" (18px semibold, #1A1A2E)
- Subtitle: "Suas notificacoes e deteccao de refeicao continuam funcionando offline. Os dados serao sincronizados quando voce reconectar." (14px, #6B7280)
- Green outline button: "Tentar novamente"

Bottom nav still visible.

Calm tone — not alarming. Just informative.
Inter font. White background.
```

### Prompt 11.4: Wearable Disconnected Banner

```
Design a mobile home screen (iPhone 15 Pro) for VitalAI showing a disconnected wearable warning banner.

Normal home timeline visible underneath.

At the top (below the status bar, above the greeting): Yellow warning banner (full width, #FEF3C7 background, #92400E text):
- Left: Watch icon with exclamation mark (orange)
- Text: "Apple Watch desconectado. Reconecte para continuar recebendo insights."
- Right: "Reconectar" text button in orange (#F59E0B)

The banner pushes content down slightly. Rest of home screen visible below normally.

Inter font.
```

---

## WORKFLOW ORDER

Recommended order to generate screens in Figma AI:

1. **Design System** — DS-1 (component library)
2. **Onboarding** — 1.1 through 1.9 (9 prompts)
3. **Home** — 2.1 through 2.4
4. **Notifications** — 3.1 through 3.6
5. **Meal Detection** — 4.1 through 4.5
6. **Nutrition** — 5.1 through 5.3
7. **Weekly Report** — 6.1 through 6.5
8. **Monthly Report** — 7.1, 7.2
9. **Profile** — 8.1 through 8.5
10. **Paywall** — 9.1, 9.2
11. **Watch** — 10.1 through 10.3
12. **States** — 11.1 through 11.4

After generating: Review consistency of colors, fonts, spacing. Connect screens with Figma prototyping for the 3 key flows: Onboarding, Meal Detection, Weekly Report.
