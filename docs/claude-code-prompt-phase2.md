# Claude Code Prompt — VitalAI MVP Phase 2: HealthKit + Dashboard + Backend Core

## Context

You are working on VitalAI, a proactive health AI coach iOS app. Phase 1 (auth/login) is complete. You need to build Phase 2: the core health data pipeline.

**Repository:** The codebase is at `/home/user/VitalAI/`
**Branch:** `claude/vitalai-product-overview-o6hT1`

### What already exists:
- **iOS app** with Auth0 login (fully working), onboarding flow, HealthKit permission request, design system (Colors, Typography, Spacing), reusable components (VitalButton, VitalCard, VitalTextField, ProgressRing, etc.)
- **Backend** with Fastify server (only `/health` works — all routes commented out in `src/index.ts`), Claude API integration (`src/config/claude.ts`), Firebase FCM integration (`src/config/firebase.ts`), Redis + Postgres + Mongo config (`src/config/database.ts`), trigger processor with cooldown system (`src/services/trigger-processor.ts` — notification delivery commented out), notification service (`src/services/notification.service.ts` — getUserFcmToken returns null)
- **Auth routes** (`src/routes/auth.routes.ts`) — all 3 endpoints return placeholder strings
- **Events routes** (`src/routes/events.routes.ts`) — Zod validation works, userId hardcoded as "placeholder-user-id"
- **No database schemas** — Drizzle ORM is installed but zero table definitions exist
- **No tests** — single `expect(true).toBe(true)` placeholder

### Key files to understand before coding:
- `docs/product-overview.md` — full MVP spec and feature requirements
- `docs/technical-architecture.md` — stack decisions, data flow, architecture principles
- `ios/VitalAI/VitalAI/Services/HealthKitService.swift` — currently only requests permissions, no data queries
- `ios/VitalAI/VitalAI/Features/Dashboard/DashboardView.swift` — static hardcoded UI
- `backend/src/index.ts` — all routes commented out
- `backend/src/services/trigger-processor.ts` — cooldown logic works, notification send commented out
- `backend/src/config/database.ts` — connections configured, no schemas

---

## Task: Build Phase 2 in this exact order

### Task 1: HealthKit Data Fetching (iOS)

Expand `ios/VitalAI/VitalAI/Services/HealthKitService.swift` to actually query health data:

1. **Add @Published properties** for the latest health readings:
   - `latestHeartRate: Double?`
   - `latestHRV: Double?`
   - `todaySteps: Int?`
   - `lastSleepHours: Double?`
   - `lastSleepQuality: String?` (Bom/Regular/Ruim based on hours)
   - `lastWorkoutEndDate: Date?`

2. **Implement these query methods:**
   - `fetchLatestHeartRate()` — HKStatisticsQuery for most recent HR sample
   - `fetchLatestHRV()` — most recent HRV sample
   - `fetchTodaySteps()` — HKStatisticsQuery with cumulative sum for today
   - `fetchLastNightSleep()` — HKSampleQuery for sleep analysis, filter for `.asleepCore`, `.asleepDeep`, `.asleepREM` categories, sum duration from last night (8PM-12PM window)
   - `fetchLastWorkout()` — most recent HKWorkout sample

3. **Add a `refreshAll()` method** that calls all fetch methods concurrently using `async let`

4. **Fix the force-unwrap** on line 25: `HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)!` — use safe optional binding like the other types

5. **Add background delivery** setup: `enableBackgroundDelivery(for:frequency:)` for heart rate and workout types so the app gets notified of new data even in background

### Task 2: Live Dashboard (iOS)

Replace the hardcoded `DashboardView.swift` with a real data-driven view:

1. **Inject HealthKitService** via `@EnvironmentObject`
2. **Health Score card** — calculate from real data: weighted average of sleep quality (40%), HRV relative to baseline (30%), steps vs 10k goal (20%), resting HR zone (10%). Display with the existing ProgressRing component
3. **Metric cards row** — horizontal ScrollView with VitalCard for each:
   - Heart Rate (latest BPM + trend icon)
   - HRV (ms + status label)
   - Steps (count + % of 10k goal)
   - Sleep (hours + quality label)
4. **Day timeline section** — vertical list of today's health events. For now, show the data refresh timestamps. This will later show trigger notifications
5. **Pull-to-refresh** — call `healthKitService.refreshAll()` on pull
6. **Auto-refresh on appear** — `.task { await healthKitService.refreshAll() }`
7. Use the existing design system: `.vitalPrimary`, `.vitalBackground`, VitalCard, ProgressRing, VitalSpacing, Typography

### Task 3: Database Schema (Backend)

Create the Drizzle ORM schema. Add a new file `backend/src/db/schema.ts`:

1. **users table:**
   - `id` (uuid, primary key, default gen_random_uuid())
   - `auth0_id` (text, unique, not null) — maps to Auth0 `sub`
   - `email` (text, not null)
   - `name` (text)
   - `fcm_token` (text) — for push notifications
   - `notification_preferences` (jsonb, default '{}')
   - `health_goals` (jsonb, default '{}')
   - `created_at` (timestamp, default now())
   - `updated_at` (timestamp, default now())

2. **health_events table** (this is the core event store):
   - `id` (uuid, primary key)
   - `user_id` (uuid, references users.id)
   - `trigger_type` (text, not null) — matches TriggerType enum
   - `payload` (jsonb, not null) — the classified event data
   - `message_generated` (text) — the Claude-generated notification text
   - `notification_sent` (boolean, default false)
   - `created_at` (timestamp, default now())

3. **notification_log table:**
   - `id` (uuid, primary key)
   - `user_id` (uuid, references users.id)
   - `event_id` (uuid, references health_events.id)
   - `title` (text, not null)
   - `body` (text, not null)
   - `fcm_message_id` (text)
   - `delivered` (boolean, default false)
   - `created_at` (timestamp, default now())

4. **Add a `drizzle.config.ts`** at backend root for migration generation
5. **Add npm script** `"db:generate": "drizzle-kit generate"` and `"db:migrate": "drizzle-kit migrate"` to package.json

### Task 4: Backend Routes & Auth Middleware

1. **Create JWT auth middleware** (`backend/src/middleware/auth.ts`):
   - Use `jose` library to verify Auth0 JWT tokens
   - Fetch JWKS from Auth0 issuer URL (from env `AUTH_ISSUER_URL`)
   - Extract `sub` claim as userId
   - Attach userId to request (use Fastify decorators)
   - Return 401 on invalid/expired tokens

2. **Implement auth routes** (`backend/src/routes/auth.routes.ts`):
   - `POST /register` — receive Auth0 token, extract profile, upsert user in DB
   - `POST /fcm-token` — store FCM token for authenticated user
   - Remove the `/token` endpoint (Auth0 handles token exchange client-side)

3. **Enable all routes in `backend/src/index.ts`:**
   - Uncomment and properly import authRoutes and eventsRoutes
   - Register rate limiting middleware
   - Connect to MongoDB on startup

4. **Fix events route** — replace hardcoded `"placeholder-user-id"` with userId from JWT middleware

5. **Complete the trigger processor** (`backend/src/services/trigger-processor.ts`):
   - Uncomment the `sendPushNotification` call on line 51
   - Import and call `getUserFcmToken()` to get the user's FCM token
   - Store the generated message and notification result in the health_events and notification_log tables
   - Return the generated message in the response

6. **Complete notification service** (`backend/src/services/notification.service.ts`):
   - Implement `getUserFcmToken()` — query users table for fcm_token, cache in Redis with 5-minute TTL

### Task 5: iOS API Client

Create `ios/VitalAI/VitalAI/Services/APIService.swift`:

1. **Base configuration:**
   - `baseURL` from environment or hardcoded dev URL
   - Auth header injection using `authService.getAccessToken()`
   - JSON encoding/decoding with snake_case strategy

2. **Endpoints:**
   - `registerUser()` — POST /api/v1/auth/register (call after successful Auth0 login)
   - `sendFCMToken(_ token: String)` — POST /api/v1/auth/fcm-token
   - `sendHealthEvent(triggerType:payload:)` — POST /api/v1/events

3. **Integrate into auth flow:**
   - After Auth0 login succeeds in AuthService, call `APIService.registerUser()` to sync user to backend
   - Register for push notifications and send FCM token to backend

### Task 6: Profile Logout & Settings

1. **ProfileView.swift** — add a working logout button at the bottom that calls `authService.logout()`
2. **Wire up** the "Dispositivos Conectados" row to show HealthKit connection status
3. **Wire up** the "Notificações" row to show a basic toggle for enabling/disabling notifications

### Task 7: Tests

1. **Backend unit tests** (`backend/tests/`):
   - `trigger-processor.test.ts` — test cooldown logic with mocked Redis (test that events within cooldown period are rejected, events after cooldown pass)
   - `events.test.ts` — test Zod validation (valid event passes, invalid triggerType rejected, missing timestamp rejected)
   - `auth.test.ts` — test JWT middleware with valid/invalid tokens (mock jose)

2. **Mock external services** — don't call real Claude API, Firebase, or Redis in tests. Use vitest mocks.

---

## Important constraints

- **All UI text must be in Portuguese (BR)** — the app targets Brazilian users
- **Use the existing design system** — VitalColors, VitalTypography, VitalSpacing, existing components. Do NOT create new color/font definitions
- **Privacy by design** — raw biometric data stays on-device. Only classified events (trigger type + summary payload) are sent to the backend
- **Do NOT create new files unnecessarily** — edit existing files when possible
- **Do NOT add features beyond what's listed** — no nutrition module, no reports, no meal detection yet (those are Alpha phase)
- **Model name in claude.ts is correct** — `claude-sonnet-4-6` is the current model ID, do not change it
- Commit each task separately with a descriptive message. Push to `claude/vitalai-product-overview-o6hT1` when all tasks are done.
