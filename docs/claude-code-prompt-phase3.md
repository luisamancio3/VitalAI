# VitalAI — Phase 3 Implementation Prompt

**For: Claude Code / Development Team**
**Date: March 2026**
**Prerequisite: Phase 2 complete (all 6 review rounds done)**

---

## Context

Phase 2 delivered a working app with Auth0 login, HealthKit data display, and a backend that can process classified events and send push notifications. But there's a critical gap: **nothing triggers events automatically.** The user has to manually call the API. Phase 3 closes this loop and adds the nutrition module.

### Current state of code

**iOS app** (`ios/VitalAI/VitalAI/`):
- `VitalAIApp.swift` — Entry point, creates `AuthService` + `HealthKitService` as `@StateObject`
- `Services/HealthKitService.swift` — `@MainActor`, `@Published` properties for HR/HRV/steps/sleep/workout, query methods, background delivery registration
- `Services/AuthService.swift` — Auth0 Universal Login, `@Published isAuthenticated/isLoading`
- `Services/APIService.swift` — `registerUser()`, `sendFCMToken()`, `sendHealthEvent()`, base URL from Info.plist `API_BASE_URL`
- `Features/Dashboard/DashboardView.swift` — Live HealthKit data, health score calculation
- `Features/Nutrition/NutritionView.swift` — Placeholder ("Em breve")
- `Features/Reports/ReportsHubView.swift` — Placeholder ("Em breve")
- `Features/Profile/ProfileView.swift` — Logout, HealthKit status, notification toggle
- `ContentView.swift` — Tab bar with 4 tabs: Dashboard, Nutrition, Reports, Profile

**Watch app** (`ios/VitalAIWatch/`):
- `WatchDashboardView.swift` — Placeholder with zeros, TODO for WatchConnectivity
- `MealPromptView.swift` — "Comendo agora?" UI shell with Sim/Nao buttons (no logic)

**Backend** (`backend/src/`):
- `index.ts` — Fastify server, CORS, helmet, rate limit, health check, auth + events routes
- `db/schema.ts` — users, health_events, notification_log tables with indexes
- `middleware/auth.ts` — JWT verification via jose + Auth0 JWKS
- `services/trigger-processor.ts` — 7 trigger types, atomic Redis cooldown (SET NX EX), Claude message generation, FCM delivery, DB logging
- `services/notification.service.ts` — FCM delivery + Redis-cached token lookup
- `routes/auth.routes.ts` — POST /register (upsert), POST /fcm-token
- `routes/events.routes.ts` — POST /events with Zod validation, user lookup, processEvent()
- `config/claude.ts` — Anthropic SDK, 10s timeout, claude-sonnet-4-6
- `config/firebase.ts` — Firebase Admin, APNs sound+badge
- `config/database.ts` — PostgreSQL (Drizzle), MongoDB (Mongoose), Redis (ioredis)

---

## Task 1: WatchConnectivity Bridge

### Watch side (`ios/VitalAIWatch/`)

**Create** `Services/WatchConnectivityService.swift`:
```swift
import WatchConnectivity

final class WatchSessionManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchSessionManager()

    @Published var healthScore: Int = 0
    @Published var heartRate: Int = 0
    @Published var sleepHours: Double = 0

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // Send classified event to phone
    func sendTriggerEvent(type: String, payload: [String: Any]) {
        guard WCSession.default.isReachable else {
            // Queue via transferUserInfo for guaranteed delivery
            WCSession.default.transferUserInfo([
                "triggerType": type,
                "payload": payload,
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ])
            return
        }
        WCSession.default.sendMessage([
            "triggerType": type,
            "payload": payload,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ], replyHandler: nil)
    }

    // Receive applicationContext from phone (user prefs, health data for display)
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            self.healthScore = applicationContext["healthScore"] as? Int ?? 0
            self.heartRate = applicationContext["heartRate"] as? Int ?? 0
            self.sleepHours = applicationContext["sleepHours"] as? Double ?? 0
        }
    }

    // Required delegate methods
    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {}
}
```

**Modify** `App/VitalAIWatchApp.swift`:
- Create `@StateObject var sessionManager = WatchSessionManager.shared`
- Pass as `@environmentObject` to `WatchDashboardView`

**Modify** `Views/WatchDashboardView.swift`:
- Replace `@State` placeholders with `@EnvironmentObject var sessionManager: WatchSessionManager`
- Read `sessionManager.healthScore`, `.heartRate`, `.sleepHours`

### Phone side (`ios/VitalAI/VitalAI/`)

**Create** `Services/PhoneConnectivityService.swift`:
```swift
import WatchConnectivity

@MainActor
final class PhoneConnectivityService: NSObject, ObservableObject, WCSessionDelegate {
    private var apiService: APIService?

    func configure(apiService: APIService) {
        self.apiService = apiService
    }

    func activate() {
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // Send health data to watch for display
    func syncHealthData(healthScore: Int, heartRate: Int, sleepHours: Double) {
        guard WCSession.default.activationState == .activated else { return }
        try? WCSession.default.updateApplicationContext([
            "healthScore": healthScore,
            "heartRate": heartRate,
            "sleepHours": sleepHours
        ])
    }

    // Receive trigger events from watch
    nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        Task { @MainActor in
            await handleWatchEvent(userInfo)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor in
            await handleWatchEvent(message)
        }
    }

    private func handleWatchEvent(_ data: [String: Any]) async {
        guard let triggerType = data["triggerType"] as? String,
              let payload = data["payload"] as? [String: Any],
              let timestamp = data["timestamp"] as? String else { return }

        do {
            try await apiService?.sendHealthEvent(
                triggerType: triggerType,
                payload: payload,
                timestamp: timestamp
            )
        } catch {
            print("[WatchRelay] Failed to forward event: \(error)")
        }
    }

    // Required WCSessionDelegate
    nonisolated func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {}
    nonisolated func sessionDidBecomeInactive(_ session: WCSession) {}
    nonisolated func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }
}
```

**Modify** `VitalAIApp.swift`:
- Add `@StateObject private var connectivityService = PhoneConnectivityService()`
- In `init()` or `.onAppear`, call `connectivityService.configure(apiService:)` and `.activate()`
- Pass as `.environmentObject(connectivityService)`

---

## Task 2: Background HealthKit Observers + TriggerEngine

**Create** `Services/TriggerEngine.swift`:

```swift
import Foundation
import HealthKit

@MainActor
final class TriggerEngine: ObservableObject {
    private let healthStore = HKHealthStore()
    private let apiService: APIService
    private var observerQueries: [HKObserverQuery] = []

    // Running averages for comparison (loaded from UserDefaults)
    private var avgRestingHR: Double { UserDefaults.standard.double(forKey: "avgRestingHR") }
    private var avgHRV: Double { UserDefaults.standard.double(forKey: "avgHRV") }
    private var lastStepUpdate: Date { UserDefaults.standard.object(forKey: "lastStepUpdate") as? Date ?? Date() }

    init(apiService: APIService) {
        self.apiService = apiService
    }

    func startMonitoring() {
        registerObserver(for: HKQuantityType(.heartRate), handler: handleHeartRateUpdate)
        registerObserver(for: HKCategoryType(.sleepAnalysis), handler: handleSleepUpdate)
        registerObserver(for: HKQuantityType(.stepCount), handler: handleStepUpdate)
        registerObserver(for: .workoutType(), handler: handleWorkoutUpdate)
        registerObserver(for: HKQuantityType(.heartRateVariabilitySDNN), handler: handleHRVUpdate)
        scheduleInactivityCheck()
    }

    // --- Trigger Rules (Phase 1: deterministic thresholds) ---

    // morning_sleep: first HR reading after 5am + sleep data from last night
    private func handleSleepUpdate() { /* query last night's sleep, if hour 5-9am -> fire morning_sleep */ }

    // post_workout: workout ended within 10 min
    private func handleWorkoutUpdate() { /* query latest workout, if endDate > 10min ago -> fire */ }

    // high_heart_rate: resting HR > 7-day avg + 20%
    private func handleHeartRateUpdate() { /* compare to avgRestingHR */ }

    // low_hrv: HRV < 7-day avg - 30%
    private func handleHRVUpdate() { /* compare to avgHRV */ }

    // inactivity: no step increase for 2h during 8am-10pm
    private func handleStepUpdate() { /* update lastStepUpdate timestamp */ }
    private func scheduleInactivityCheck() { /* Timer every 30min, check lastStepUpdate */ }

    private func fireTrigger(type: String, payload: [String: Any]) {
        let notificationsEnabled = UserDefaults.standard.bool(forKey: "notificationsEnabled")
        guard notificationsEnabled else { return }

        Task {
            try await apiService.sendHealthEvent(
                triggerType: type,
                payload: payload,
                timestamp: ISO8601DateFormatter().string(from: Date())
            )
        }
    }
}
```

**Modify** `Services/HealthKitService.swift`:
- Add `enableBackgroundDelivery(for:frequency:)` calls in the existing `setupBackgroundDelivery()` for all 5 types
- Register `HKObserverQuery` that calls back to `TriggerEngine`

**Modify** `VitalAIApp.swift`:
- Create `TriggerEngine` after `APIService` is available
- Call `triggerEngine.startMonitoring()` when user is authenticated

**Key rules (from product-overview.md Section 5.2):**

| Trigger | Condition | Cooldown |
|---------|-----------|----------|
| morning_sleep | Sleep data exists + hour 5-9am + first of day | 24h |
| post_workout | Workout endDate within last 10min | 1h |
| high_heart_rate | Resting HR > 7-day avg * 1.2 | 30min |
| low_hrv | HRV < 7-day avg * 0.7 | 2h |
| inactivity | No step increase for 2h, 8am-10pm | 2h |
| hydration_reminder | Every 90min during 8am-10pm | 90min |

**Running averages:** Compute from HealthKit's `HKStatisticsQuery` over last 7 days. Store in `UserDefaults` and refresh daily.

---

## Task 3: Notification Fatigue Protection

**Modify** `backend/src/services/trigger-processor.ts`:

Add before the cooldown check in `processEvent()`:
```typescript
// 1. Check quiet hours
const userPrefs = await getUserPreferences(userId);
const now = new Date();
const currentHour = now.getHours();
const quietStart = userPrefs.quietHoursStart ?? 22;
const quietEnd = userPrefs.quietHoursEnd ?? 7;
if (isInQuietHours(currentHour, quietStart, quietEnd)) {
  return { processed: false, reason: "quiet_hours" };
}

// 2. Check daily budget
const todayCount = await getTodayNotificationCount(userId);
const dailyBudget = userPrefs.dailyBudget ?? 6;
if (todayCount >= dailyBudget) {
  return { processed: false, reason: "daily_budget" };
}
```

**Add helper functions:**
```typescript
async function getUserPreferences(userId: string) {
  const [user] = await db
    .select({ notificationPreferences: users.notificationPreferences })
    .from(users).where(eq(users.id, userId)).limit(1);
  return (user?.notificationPreferences as Record<string, unknown>) ?? {};
}

async function getTodayNotificationCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationLog)
    .where(and(
      eq(notificationLog.userId, userId),
      eq(notificationLog.delivered, true),
      gte(notificationLog.createdAt, startOfDay)
    ));
  return result[0]?.count ?? 0;
}

function isInQuietHours(hour: number, start: number, end: number): boolean {
  if (start > end) return hour >= start || hour < end; // e.g. 22-7 wraps midnight
  return hour >= start && hour < end;
}
```

**Update `ProcessResult` type** to add `"quiet_hours" | "daily_budget"` to the reason union.

**Add tests** in `tests/trigger-processor.test.ts`:
- Test quiet hours blocking (23:00 with default 22-7)
- Test daily budget exceeded
- Test budget not exceeded (count < limit)

---

## Task 4: APNs Registration + Notification Handling

**Create** `Services/NotificationService.swift`:

```swift
import UserNotifications
import UIKit

@MainActor
final class NotificationService: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    @Published var isAuthorized = false
    @Published var deviceToken: String?

    func requestPermission() async {
        let center = UNUserNotificationCenter.current()
        center.delegate = self

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            isAuthorized = granted
            if granted {
                UIApplication.shared.registerForRemoteNotifications()
            }
        } catch {
            print("[Notifications] Permission error: \(error)")
        }
    }

    func handleDeviceToken(_ token: Data) {
        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
        deviceToken = tokenString
    }

    // Show notification in foreground
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .badge]
    }

    // Handle notification tap
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo
        // Deep link based on triggerType in userInfo
        if let triggerType = userInfo["triggerType"] as? String {
            await MainActor.run {
                NotificationCenter.default.post(
                    name: .didReceiveDeepLink,
                    object: nil,
                    userInfo: ["triggerType": triggerType]
                )
            }
        }
    }
}

extension Notification.Name {
    static let didReceiveDeepLink = Notification.Name("didReceiveDeepLink")
}
```

**Modify** `VitalAIApp.swift`:
- Add `@UIApplicationDelegateAdaptor` for handling `didRegisterForRemoteNotificationsWithDeviceToken`
- Create `NotificationService` as `@StateObject`
- Request permission after HealthKit permission is granted
- Send token to backend via `APIService.sendFCMToken()` when available

---

## Task 5: Nutrition Profile Onboarding

### Backend

**Modify** `backend/src/db/schema.ts` — add:
```typescript
export const nutritionProfiles = pgTable("nutrition_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).unique().notNull(),
  goal: text("goal").notNull(), // "lose" | "maintain" | "gain"
  restrictions: jsonb("restrictions").default('[]'), // ["vegan", "gluten_free", ...]
  cookingSkill: text("cooking_skill").notNull(), // "beginner" | "intermediate" | "advanced"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Create** `backend/src/routes/nutrition.routes.ts`:
- `POST /api/v1/nutrition/profile` — create/update nutrition profile
- `GET /api/v1/nutrition/profile` — get current profile
- `PATCH /api/v1/nutrition/profile` — partial update
- All behind `authMiddleware`
- Zod validation for goal enum, restrictions array, cookingSkill enum

**Modify** `backend/src/index.ts`:
- Import and register `nutritionRoutes` at `/api/v1/nutrition`

### iOS

**Create** `Features/Nutrition/NutritionOnboardingView.swift`:
- 3-step wizard:
  1. Goal: "Perder peso" / "Manter peso" / "Ganhar massa" (3 large tappable cards)
  2. Restrictions: multi-select chips: "Vegetariano", "Vegano", "Sem Gluten", "Sem Lactose", "Low Carb", "Nenhuma"
  3. Cooking skill: "Iniciante" / "Intermediario" / "Avancado" with descriptions
- Progress indicator (3 dots)
- "Continuar" button, "Pular" link
- On complete: POST to `/api/v1/nutrition/profile`

**Modify** `Features/Nutrition/NutritionView.swift`:
- Check if profile exists (GET on appear)
- If no profile: show `NutritionOnboardingView`
- If profile exists: show meal suggestion list (Task 6) or empty state

---

## Task 6: Recipe Catalog + Meal Suggestions

### Backend

**Create** `backend/src/db/recipes.ts` (MongoDB via Mongoose):
```typescript
import mongoose from "mongoose";

const recipeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  ingredients: [{ name: String, amount: String }],
  macros: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
  },
  tags: [String], // ["post_workout", "breakfast", "lunch", "dinner", "snack", "high_protein", "low_carb"]
  prepTime: Number, // minutes
  difficulty: { type: String, enum: ["easy", "medium", "hard"] },
  imageUrl: String,
  servings: Number,
});

export const Recipe = mongoose.model("Recipe", recipeSchema);
```

**Create** `backend/src/services/meal-suggestion.service.ts`:
- `suggestMeal(userId, context)`:
  1. Load user's nutrition profile
  2. Filter recipes by: context tag, exclude disliked (from feedback), match difficulty to skill
  3. Pick top 3 candidates
  4. Use Claude to personalize suggestion text in Portuguese
  5. Return recipe + personalized message

**Create** `backend/src/scripts/seed-recipes.ts`:
- 50 Brazilian recipes covering all tags/contexts
- Categories: cafe da manha (10), almoco (15), jantar (10), lanche (10), pos-treino (5)
- Run via `npm run db:seed-recipes`

**Add** to `nutrition.routes.ts`:
- `GET /api/v1/nutrition/suggestion?context=post_workout` — returns personalized meal suggestion

### iOS

**Create** `Features/Nutrition/MealSuggestionView.swift`:
- Card with recipe name, macros (protein/carbs/fat pills), prep time, difficulty
- "Gostei" (green) / "Trocar" (gray) buttons
- "Trocar" calls suggestion endpoint again
- "Gostei" opens `MealFeedbackView` (Task 7)

**Create** `Features/Nutrition/MealSuggestionCard.swift`:
- Reusable card component with recipe display
- Macro pills using existing design system colors

---

## Task 7: Meal Feedback Loop

### Backend

**Modify** `backend/src/db/schema.ts` — add:
```typescript
export const mealFeedback = pgTable("meal_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  recipeId: text("recipe_id").notNull(), // MongoDB ObjectId as string
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  context: text("context"), // "post_workout", "breakfast", etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_meal_feedback_user_id").on(table.userId),
  index("idx_meal_feedback_recipe_id").on(table.recipeId),
]);
```

**Add** to `nutrition.routes.ts`:
- `POST /api/v1/nutrition/feedback` — save rating + optional comment
- `GET /api/v1/nutrition/history` — paginated meal feedback history

**Modify** `meal-suggestion.service.ts`:
- When filtering recipes, query `mealFeedback` for this user
- Exclude recipes with avg rating <= 2
- Boost recipes with avg rating >= 4

### iOS

**Create** `Features/Nutrition/MealFeedbackView.swift`:
- Star rating (1-5) using SF Symbols (star.fill / star)
- Optional text field: "Algum comentario?" (max 200 chars)
- "Enviar" button -> POST to feedback endpoint
- Success animation (checkmark) then dismiss

**Modify** `NutritionView.swift`:
- Add "Historico" section showing recent meals with ratings
- Tappable rows showing recipe name, date, star rating

---

## Task 8: Weekly Health Report

### Backend

**Modify** `backend/src/db/schema.ts` — add:
```typescript
export const weeklyReports = pgTable("weekly_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  metrics: jsonb("metrics").notNull(), // aggregated data
  reportText: text("report_text").notNull(), // Claude-generated
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_weekly_reports_user_id").on(table.userId),
]);
```

**Create** `backend/src/services/report-generator.ts`:
```typescript
export async function generateWeeklyReport(userId: string): Promise<string> {
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());

  // Aggregate from health_events
  const events = await db.select().from(healthEvents)
    .where(and(
      eq(healthEvents.userId, userId),
      gte(healthEvents.createdAt, weekStart),
      lte(healthEvents.createdAt, weekEnd)
    ));

  const metrics = aggregateMetrics(events);

  // Generate report text via Claude
  const reportText = await generateMessage(
    WEEKLY_REPORT_SYSTEM_PROMPT,
    JSON.stringify(metrics)
  );

  // Store
  await db.insert(weeklyReports).values({
    userId, weekStart, weekEnd, metrics, reportText
  });

  return reportText;
}
```

System prompt for weekly report:
```
You are VitalAI, a friendly health coach writing a weekly health summary for your client.
Write in Portuguese (BR), conversational tone, like a personal coach.
Structure: 1) Overall assessment (1 sentence), 2) Sleep analysis, 3) Activity summary, 4) Heart health, 5) One actionable tip for next week.
Keep it under 300 words. Be encouraging but honest.
```

**Create** `backend/src/routes/reports.routes.ts`:
- `GET /api/v1/reports/weekly` — list weekly reports (paginated)
- `GET /api/v1/reports/weekly/:id` — get specific report
- `POST /api/v1/reports/weekly/generate` — manually trigger report generation (for testing)

**Modify** `backend/src/index.ts`:
- Register `reportsRoutes` at `/api/v1/reports`

### iOS

**Create** `Features/Reports/WeeklyReportView.swift`:
- Sections: score summary, sleep card, activity card, heart card, coach tip
- Each section uses existing `VitalCard` component
- Pull data from report's `metrics` JSON + display `reportText`

**Modify** `Features/Reports/ReportsHubView.swift`:
- List of weekly reports with week date range and overall score
- NavigationLink to `WeeklyReportView`
- Empty state if no reports yet

---

## Important Constraints

1. **All UI in Portuguese (BR)** — no English strings in user-facing text
2. **Use existing design system** — `VitalColors`, `VitalTypography`, `VitalSpacing`, `VitalCard`, `VitalButton`
3. **Privacy by design** — raw biometric data stays on device; only classified events + aggregated metrics sent to backend
4. **No features beyond scope** — no meal gesture detection, no photo recognition, no GPS routines, no Android, no monthly reports, no subscriptions
5. **Commit each task separately** with descriptive messages
6. **All existing tests must pass** after each task
7. **No force-unwraps** — use `guard let` / `if let` / nil coalescing
8. **No hardcoded secrets** — use environment variables / Info.plist
9. **`@MainActor`** on all `ObservableObject` classes
10. **Model ID** for Claude API: `claude-sonnet-4-6`

---

## Verification Quick Checklist

After all 8 tasks:

- [ ] HealthKit data change automatically triggers backend event (no manual API calls)
- [ ] Push notification arrives on device from triggered event
- [ ] Watch displays real health data from phone
- [ ] Watch can send events to phone -> backend
- [ ] Quiet hours block notifications during 22:00-07:00
- [ ] Daily notification budget (6) is enforced
- [ ] Nutrition onboarding saves profile to backend
- [ ] Meal suggestion returns contextual recipe with macros
- [ ] Meal feedback (1-5 stars) saved and influences future suggestions
- [ ] Weekly report generated with Claude and viewable in app
- [ ] All existing tests pass + new tests for fatigue, nutrition, reports
- [ ] No regressions in auth, onboarding, dashboard, profile
- [ ] All UI in Portuguese (BR)
- [ ] No hardcoded secrets, no force-unwraps, no unused imports
