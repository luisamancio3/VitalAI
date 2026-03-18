# Verification Plan — VitalAI MVP Phase 2

Use this checklist to verify that Phase 2 was built correctly. Run through each section after the build is complete.

---

## 1. HealthKit Service — Data Fetching

### Code inspection
- [ ] `HealthKitService.swift` has @Published properties: `latestHeartRate`, `latestHRV`, `todaySteps`, `lastSleepHours`, `lastSleepQuality`, `lastWorkoutEndDate`
- [ ] Force-unwrap on `sleepAnalysis` (old line 25) is replaced with safe optional binding
- [ ] `refreshAll()` method exists and calls all fetch methods
- [ ] `fetchLatestHeartRate()` uses `HKStatisticsQuery` or `HKSampleQuery` on `.heartRate`
- [ ] `fetchLatestHRV()` queries `.heartRateVariabilitySDNN`
- [ ] `fetchTodaySteps()` uses `HKStatisticsQuery` with `.cumulativeSum()` and today's date predicate
- [ ] `fetchLastNightSleep()` filters for asleep categories (`.asleepCore`, `.asleepDeep`, `.asleepREM`), not just `.inBed`
- [ ] `fetchLastWorkout()` queries `HKWorkoutType.workoutType()`
- [ ] Background delivery is set up for at least heart rate and workout types

### Functional check (on device/simulator)
- [ ] App compiles without errors
- [ ] After granting HealthKit permissions, `refreshAll()` runs without crashing
- [ ] On a simulator with no health data, all values are nil (not crashes or defaults)
- [ ] No force-unwraps remain in the file

---

## 2. Dashboard — Live Data

### Code inspection
- [ ] `DashboardView.swift` uses `@EnvironmentObject` for HealthKitService
- [ ] Health Score is calculated from real data (not hardcoded 78)
- [ ] Health Score formula uses weighted components (sleep, HRV, steps, HR)
- [ ] Metric cards display: heart rate (BPM), HRV (ms), steps (count), sleep (hours)
- [ ] Pull-to-refresh triggers `healthKitService.refreshAll()`
- [ ] `.task` modifier calls `refreshAll()` on appear
- [ ] Uses existing design system components (VitalCard, ProgressRing, VitalSpacing, etc.)
- [ ] All text is in Portuguese (BR)
- [ ] Handles nil states gracefully (shows "--" or placeholder, not "0" or crash)

### Visual check
- [ ] Dashboard looks consistent with the design system (teal accent, slate backgrounds)
- [ ] ProgressRing shows correct percentage
- [ ] Metric cards are horizontally scrollable
- [ ] No hardcoded values remain (search for "78", "72", "7.5" in the file)

---

## 3. Database Schema

### Code inspection
- [ ] `backend/src/db/schema.ts` exists
- [ ] `users` table has: id (uuid PK), auth0_id (unique), email, name, fcm_token, notification_preferences (jsonb), health_goals (jsonb), created_at, updated_at
- [ ] `health_events` table has: id (uuid PK), user_id (FK → users), trigger_type, payload (jsonb), message_generated, notification_sent, created_at
- [ ] `notification_log` table has: id (uuid PK), user_id (FK → users), event_id (FK → health_events), title, body, fcm_message_id, delivered, created_at
- [ ] Foreign key relationships are properly defined
- [ ] `drizzle.config.ts` exists at backend root
- [ ] package.json has `db:generate` and `db:migrate` scripts

### Functional check
```bash
cd backend
npm run db:generate  # Should generate migration SQL files without errors
```
- [ ] Migration files are generated in a migrations folder
- [ ] Generated SQL looks correct (CREATE TABLE with proper types and constraints)

---

## 4. Backend Routes & Auth

### Code inspection — Auth middleware
- [ ] `backend/src/middleware/auth.ts` exists
- [ ] Uses `jose` library (not jsonwebtoken) to verify JWTs
- [ ] Fetches JWKS from Auth0 (`AUTH_ISSUER_URL` env var)
- [ ] Extracts `sub` claim from verified token
- [ ] Returns 401 with JSON error on invalid/missing token
- [ ] Attaches userId to Fastify request

### Code inspection — Routes
- [ ] `backend/src/index.ts` — routes are UNCOMMENTED and properly imported
- [ ] `backend/src/index.ts` — rate limiting middleware is registered
- [ ] `backend/src/index.ts` — MongoDB connection is called on startup
- [ ] `auth.routes.ts` — POST /register creates or updates user in DB using auth0_id
- [ ] `auth.routes.ts` — POST /fcm-token stores token for authenticated user
- [ ] `events.routes.ts` — userId comes from JWT middleware, NOT hardcoded

### Code inspection — Trigger processor
- [ ] `trigger-processor.ts` — `sendPushNotification` is UNCOMMENTED
- [ ] `trigger-processor.ts` — calls `getUserFcmToken()` to get FCM token
- [ ] `trigger-processor.ts` — stores event in health_events table
- [ ] `trigger-processor.ts` — stores notification in notification_log table
- [ ] `trigger-processor.ts` — handles case where user has no FCM token (skip notification, still store event)

### Code inspection — Notification service
- [ ] `notification.service.ts` — `getUserFcmToken()` queries users table for fcm_token
- [ ] `notification.service.ts` — caches FCM token in Redis with TTL

### Functional check
```bash
cd backend
npm run build  # TypeScript compilation must succeed with zero errors
```

```bash
# Start the server (requires .env with at least REDIS_URL)
npm run dev

# Test health check
curl http://localhost:3000/health
# Expected: {"status":"ok","service":"vitalai-api","timestamp":"..."}

# Test unauthenticated request to events
curl -X POST http://localhost:3000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{"triggerType":"morning_sleep","payload":{},"timestamp":"2026-03-18T08:00:00Z"}'
# Expected: 401 Unauthorized (not 200, not 404)

# Test validation (if you bypass auth temporarily)
curl -X POST http://localhost:3000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{"triggerType":"invalid_type","payload":{},"timestamp":"2026-03-18T08:00:00Z"}'
# Expected: 400 with Zod validation error
```

---

## 5. iOS API Client

### Code inspection
- [ ] `ios/VitalAI/VitalAI/Services/APIService.swift` exists
- [ ] Has `baseURL` configuration
- [ ] Injects Auth0 access token in Authorization header
- [ ] `registerUser()` calls POST /api/v1/auth/register
- [ ] `sendFCMToken()` calls POST /api/v1/auth/fcm-token
- [ ] `sendHealthEvent()` calls POST /api/v1/events
- [ ] Uses proper error handling (throws, not force-try)
- [ ] Uses JSONEncoder/Decoder with `.convertToSnakeCase` strategy

### Integration check
- [ ] AuthService calls `APIService.registerUser()` after successful Auth0 login
- [ ] App registers for push notifications and sends FCM token to backend
- [ ] APIService is injected as environment object or accessible via singleton

---

## 6. Profile & Settings

### Code inspection
- [ ] `ProfileView.swift` has a logout button
- [ ] Logout button calls `authService.logout()`
- [ ] After logout, app navigates back to onboarding/login (check ContentView state flow)
- [ ] "Dispositivos Conectados" shows HealthKit connection status
- [ ] "Notificações" has a toggle for enabling/disabling

### Functional check
- [ ] Tapping logout clears session and returns to login screen
- [ ] Logging in again after logout works correctly
- [ ] All ProfileView text is in Portuguese (BR)

---

## 7. Tests

### Run tests
```bash
cd backend
npm test
```

### Check coverage
- [ ] `trigger-processor.test.ts` — tests cooldown enforcement (event during cooldown → rejected)
- [ ] `trigger-processor.test.ts` — tests cooldown expiry (event after cooldown → accepted)
- [ ] Event validation tests — valid payload passes, invalid triggerType rejected, missing timestamp rejected
- [ ] Auth middleware tests — valid JWT passes, expired JWT rejected, missing header rejected
- [ ] All tests pass with `npm test`
- [ ] Tests mock external services (Redis, Claude API, Firebase) — no real API calls

---

## 8. General Quality

### No regressions
- [ ] Onboarding flow still works (Splash → Slides → SignUp/Login)
- [ ] Auth0 login/signup still works
- [ ] HealthKit permission request still works
- [ ] Tab navigation works (Home, Nutrição, Relatórios, Perfil)
- [ ] App compiles with zero warnings related to new code

### Code quality
- [ ] No hardcoded API keys, tokens, or secrets in committed code
- [ ] No `print()` statements left in production code (use proper logging or remove)
- [ ] No force-unwraps (`!`) on optional values (except where Apple APIs require it)
- [ ] No unused imports
- [ ] Consistent code style with existing codebase

### Architecture
- [ ] Raw biometric data stays on-device (HealthKit values never sent to backend as-is)
- [ ] Only classified events (trigger type + summary) go to backend
- [ ] Backend stores events and notifications in database (not fire-and-forget)

---

## Quick Summary Checklist

| # | Area | Pass? |
|---|------|-------|
| 1 | HealthKit fetches real data (HR, HRV, steps, sleep, workout) | [ ] |
| 2 | Dashboard shows live data with calculated health score | [ ] |
| 3 | Database schema has users, health_events, notification_log tables | [ ] |
| 4 | Backend routes enabled with JWT auth middleware | [ ] |
| 5 | Trigger processor sends real notifications (not commented out) | [ ] |
| 6 | iOS API client syncs user and sends events to backend | [ ] |
| 7 | Profile has working logout | [ ] |
| 8 | Backend tests pass with mocked dependencies | [ ] |
| 9 | `npm run build` succeeds with zero errors | [ ] |
| 10 | iOS project compiles with zero errors | [ ] |
| 11 | All UI text in Portuguese (BR) | [ ] |
| 12 | No hardcoded values remain (78, placeholder-user-id, etc.) | [ ] |
