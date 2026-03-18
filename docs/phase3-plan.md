# VitalAI — Phase 3 Development Plan (Alpha: Nutrition Module)

**March 2026**

---

## Where We Are

### Completed (Phases 1-2 + Review Rounds)

**iOS App:**
- Auth0 authentication (Universal Login, email/password, Apple, Google)
- Onboarding flow (3-slide carousel + sign-up)
- HealthKit integration (HR, HRV, steps, sleep analysis, workouts)
- Live dashboard with calculated Health Score (weighted: sleep 40%, HRV 30%, steps 20%, HR 10%)
- Metric cards (HR, HRV, steps, sleep) with pull-to-refresh
- Profile with logout, HealthKit status, notification toggle
- API client syncing user registration + FCM token to backend
- Dark Mode support (adaptive colors, system backgrounds)
- `@MainActor` on all ObservableObject services
- Proper error handling throughout (no force-unwraps, no silent failures)

**Backend:**
- Fastify API with JWT auth middleware (Auth0 JWKS)
- Zod validation on all endpoints (register, fcm-token, events)
- Trigger processor with 7 event types and per-type cooldowns
- Atomic Redis cooldown (SET NX EX) preventing race conditions
- Claude API integration for message generation (with 10s timeout)
- FCM push notification delivery pipeline
- Notification logging with delivery tracking
- PostgreSQL schema with indexes (users, health_events, notification_log)
- Try/catch error handling on all routes and services
- Redis resilience (best-effort caching with DB fallback)
- CORS allowlist, per-user rate limiting, env var validation
- 7 passing tests (cooldown, TTL, notification delivery, error path, Zod validation, auth middleware)

**Watch App:**
- Shell with placeholder data and empty state

**Infrastructure:**
- Dockerfile with NODE_ENV=production
- .env.example with all required vars
- Drizzle ORM config with migration support

### What's NOT Built Yet (from Product Roadmap)

**MVP gaps (should finish before Alpha):**
- On-device trigger engine (rules-based context detection on watch/phone)
- WatchConnectivity bridge (watch → phone event relay)
- Background processing (HealthKit observer queries triggering events)
- Notification fatigue protection (daily budget, quiet hours)
- Actual classified event generation from HealthKit data changes

**Alpha scope (Months 4-6 per roadmap):**
- Complete nutrition module (onboarding, suggestions, feedback loop)
- Meal gesture detection (watch accelerometer)
- Recipe catalog (Brazilian recipes)
- Weekly report v1

---

## Phase 3 Plan: Complete MVP + Begin Alpha

Phase 3 bridges the gap between "backend works with manual API calls" and "the app proactively sends notifications from real biometric data." Then it starts the nutrition module.

### Part A — Complete the MVP Pipeline (End-to-End Proactivity)

#### Task 1: WatchConnectivity Bridge

**Goal:** Watch detects trigger conditions → sends classified event to iPhone → iPhone forwards to backend.

**Files to create/modify:**
- `ios/VitalAIWatch/Services/WatchConnectivityService.swift` (new)
- `ios/VitalAI/VitalAI/Services/WatchConnectivityService.swift` (new, phone side)
- `ios/VitalAIWatch/App/VitalAIWatchApp.swift` (wire up service)
- `ios/VitalAI/VitalAI/VitalAIApp.swift` (wire up service)

**Implementation:**
- `WCSession` delegate on both sides
- Phone side: receive `transferUserInfo` messages, parse trigger type + payload, call `APIService.sendHealthEvent()`
- Watch side: send classified events via `transferUserInfo` (queued, reliable delivery)
- Use `applicationContext` for syncing user preferences (notification toggle, health goals)

#### Task 2: Background HealthKit Observer Queries

**Goal:** When HealthKit data changes (new workout, new HR sample), automatically evaluate trigger rules and send events.

**Files to create/modify:**
- `ios/VitalAI/VitalAI/Services/TriggerEngine.swift` (new)
- `ios/VitalAI/VitalAI/Services/HealthKitService.swift` (add observer queries)
- `ios/VitalAI/VitalAI/VitalAIApp.swift` (register background tasks)

**Implementation:**
- Register `HKObserverQuery` for heart rate, workouts, sleep
- `TriggerEngine` with deterministic rules (Phase 1 per product doc):
  - `morning_sleep`: first HR reading after 5am + previous night sleep data exists
  - `post_workout`: workout sample ended within last 10 minutes
  - `high_heart_rate`: resting HR > user's 7-day average + 20%
  - `low_hrv`: HRV < user's 7-day average - 30%
  - `inactivity`: no step increase for 2+ hours during waking hours (8am-10pm)
  - `hydration_reminder`: every 90 min during waking hours if no recent water log
- Each triggered event: get access token → call `APIService.sendHealthEvent()`
- Respect local `notificationsEnabled` toggle before sending

#### Task 3: Notification Fatigue Protection

**Goal:** Prevent notification overload with daily budgets and quiet hours.

**Files to create/modify:**
- `backend/src/services/trigger-processor.ts` (add budget + quiet hours logic)
- `backend/src/db/schema.ts` (add notification_preferences fields)

**Implementation:**
- Add `dailyNotificationBudget` (default: 6/day for MVP) check before processing
- Count today's delivered notifications per user from `notification_log`
- Add quiet hours check: read `notification_preferences.quietStart` / `quietEnd` from user profile
- Default quiet hours: 22:00-07:00
- If in quiet hours: queue event for delivery at quiet end (or skip if cooldown would expire)

#### Task 4: Notification Delivery Verification

**Goal:** Ensure push notifications actually arrive on device.

**Files to create/modify:**
- `ios/VitalAI/VitalAI/VitalAIApp.swift` (register for remote notifications)
- `ios/VitalAI/VitalAI/Services/NotificationService.swift` (new)

**Implementation:**
- Request notification permission during HealthKit permission step
- Register with APNs, get device token
- Send FCM token to backend via `APIService.sendFCMToken()`
- Handle foreground notification display with `UNUserNotificationCenterDelegate`
- Display notification with trigger-type-appropriate category and actions

---

### Part B — Nutrition Module Foundation

#### Task 5: Nutrition Profile Onboarding

**Goal:** After HealthKit setup, ask user about dietary preferences to enable meal suggestions.

**Files to create/modify:**
- `ios/VitalAI/VitalAI/Features/Nutrition/NutritionOnboardingView.swift` (new)
- `ios/VitalAI/VitalAI/Features/Nutrition/NutritionView.swift` (update from placeholder)
- `backend/src/routes/nutrition.routes.ts` (new)
- `backend/src/db/schema.ts` (add nutrition_profiles table)

**Implementation:**
- 3-step onboarding: dietary goal (lose/maintain/gain), restrictions (vegan, gluten-free, lactose-free, etc.), cooking skill (beginner/intermediate/advanced)
- Store in new `nutrition_profiles` table
- Backend CRUD endpoints: `POST /api/v1/nutrition/profile`, `GET /api/v1/nutrition/profile`, `PATCH /api/v1/nutrition/profile`
- Show onboarding on first visit to Nutrition tab, then show meal history

#### Task 6: Recipe Catalog + Contextual Meal Suggestions

**Goal:** Suggest meals based on time of day, recent activity, and nutrition profile.

**Files to create/modify:**
- `backend/src/db/recipes.ts` (new — MongoDB schema)
- `backend/src/services/meal-suggestion.service.ts` (new)
- `backend/src/routes/nutrition.routes.ts` (add suggestion endpoint)
- `ios/VitalAI/VitalAI/Features/Nutrition/MealSuggestionView.swift` (new)

**Implementation:**
- MongoDB collection for recipes: `{ name, ingredients[], macros: { protein, carbs, fat, calories }, tags[], prepTime, difficulty, imageUrl }`
- Seed with 50 curated Brazilian recipes covering: post-workout, breakfast, lunch, dinner, snack
- `GET /api/v1/nutrition/suggestion?context=post_workout` — filters by user profile + context, uses Claude to personalize the suggestion text
- iOS view: card showing recipe name, macros, prep time, with "Gostei" / "Trocar" buttons
- Integrate into post_workout notification: deep link to meal suggestion

#### Task 7: Meal Feedback Loop

**Goal:** User rates meals → system learns preferences.

**Files to create/modify:**
- `backend/src/db/schema.ts` (add meal_feedback table)
- `backend/src/routes/nutrition.routes.ts` (add feedback endpoint)
- `ios/VitalAI/VitalAI/Features/Nutrition/MealFeedbackView.swift` (new)

**Implementation:**
- `meal_feedback` table: `userId, recipeId, rating (1-5), comment?, context, createdAt`
- `POST /api/v1/nutrition/feedback` endpoint
- iOS: star rating (1-5) + optional one-line comment after meal suggestion
- Query: when suggesting next meal, exclude recipes rated ≤2 by this user, prefer recipes rated ≥4
- Simple preference weighting (no ML yet — that's Beta phase)

---

### Part C — Weekly Report v1

#### Task 8: Weekly Health Report Generation

**Goal:** Every Sunday, generate a personalized weekly summary and deliver via push notification.

**Files to create/modify:**
- `backend/src/services/report-generator.ts` (new)
- `backend/src/routes/reports.routes.ts` (new)
- `backend/src/db/schema.ts` (add weekly_reports table)
- `ios/VitalAI/VitalAI/Features/Reports/WeeklyReportView.swift` (new)
- `ios/VitalAI/VitalAI/Features/Reports/ReportsHubView.swift` (update from placeholder)

**Implementation:**
- `weekly_reports` table: `userId, weekStartDate, reportData (JSONB), generatedAt`
- Cron job (or scheduled task): every Sunday at 9am, for each active user:
  - Query `health_events` from the past 7 days
  - Aggregate: avg HR, avg HRV, total steps, avg sleep hours, workout count, notification count
  - Send aggregated data to Claude with a report system prompt
  - Store generated report in DB
  - Send push notification with deep link to report
- `GET /api/v1/reports/weekly?week=2026-W12` endpoint
- iOS: scrollable report view with sections (Sleep, Activity, Heart, Nutrition if available)
- ReportsHubView: list of past weekly reports with date and score summary

---

## Task Prioritization

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P0 | Task 2: Background HealthKit observers + TriggerEngine | High | Critical — without this, the app is not proactive |
| P0 | Task 4: Notification delivery (APNs registration) | Medium | Critical — notifications don't work without this |
| P1 | Task 1: WatchConnectivity bridge | Medium | High — enables watch-originated triggers |
| P1 | Task 3: Notification fatigue protection | Low | High — prevents user churn from spam |
| P1 | Task 5: Nutrition profile onboarding | Medium | High — gate for entire nutrition module |
| P2 | Task 6: Recipe catalog + meal suggestions | High | Medium — core nutrition feature |
| P2 | Task 7: Meal feedback loop | Medium | Medium — enables learning |
| P2 | Task 8: Weekly report | High | Medium — retention anchor |

---

## Success Criteria for Phase 3

1. **End-to-end proactivity works:** HealthKit data change → trigger evaluation → backend processing → Claude message → push notification arrives on device — all automatically, no manual API calls
2. **Notification quality:** quiet hours respected, daily budget enforced, cooldowns working
3. **Nutrition MVP:** user can set dietary profile, receive contextual meal suggestion, rate it
4. **Weekly report:** generated automatically, viewable in app
5. **Watch connected:** classified events flow from watch to phone to backend
6. **All existing tests pass** + new tests for TriggerEngine rules, nutrition endpoints, report generation
7. **No regressions** in auth, onboarding, dashboard, profile

---

## Development Order (Suggested)

```
Week 1-2:  Task 2 (TriggerEngine + observer queries) + Task 4 (notification delivery)
Week 3:    Task 1 (WatchConnectivity) + Task 3 (fatigue protection)
Week 4-5:  Task 5 (nutrition onboarding) + Task 6 (recipes + suggestions)
Week 6:    Task 7 (feedback loop) + Task 8 (weekly report)
Week 7:    Integration testing, bug fixes, polish
```

---

## Out of Scope (deferred to Phase 4 / Beta)

- Meal gesture detection via watch accelerometer (needs Core ML model)
- Food photo recognition (needs computer vision pipeline)
- Routine recognition via GPS + time (needs location permissions + 2-3 weeks of data)
- Preference model with embeddings (simple rating filter is enough for Alpha)
- Android / Wear OS
- Monthly reports
- Subscription/paywall
