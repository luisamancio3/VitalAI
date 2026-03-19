# VitalAI — Current State Review & Gap Analysis

**Date: March 19, 2026**

---

## 1. Where We Are: Roadmap Progress

The product roadmap defines 5 phases. Here's our actual progress against each:

### MVP — Fundação (Months 1-3)

| Deliverable | Status | Notes |
|-------------|--------|-------|
| HealthKit integration | ✅ Done | HR, HRV, steps, sleep, workouts with background delivery for all 5 types |
| Trigger engine with rules | ✅ Done | 6 deterministic rules on-device (TriggerEngine.swift), 7 types processed on backend |
| Morning sleep message | ✅ Done | Fires 5-9am when sleep data available, 24h cooldown |
| Post-workout suggestion | ✅ Done | Fires within 10min of workout end, 1h cooldown |
| Basic iOS app | ✅ Done | 4-tab app: Dashboard, Nutrition, Reports, Profile |
| Auth (login/signup) | ✅ Done | Auth0 Universal Login + email/password |
| Push notifications | ✅ Done | APNs registration, FCM delivery, foreground banners, deep links |
| Notification fatigue | ✅ Done | Quiet hours (22-7), daily budget (6/day), per-type cooldowns |
| Backend API | ✅ Done | Fastify + JWT auth + 11 endpoints |
| Database schema | ✅ Done | 6 PostgreSQL tables + MongoDB recipes + Redis cache |
| WatchConnectivity | ✅ Done | Bidirectional phone↔watch bridge |
| CI/CD | ✅ Done | GitHub Actions for backend lint/test/build |
| Docker | ✅ Done | Multi-stage Dockerfile + docker-compose (Postgres, Mongo, Redis) |

**MVP: 100% complete** ✅

### Alpha — Nutrição (Months 4-6)

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Complete nutrition module | ✅ Done | Profile onboarding, suggestions, feedback, history |
| Diet onboarding | ✅ Done | 3-step wizard: goal, restrictions, cooking skill |
| Meal gesture detection (accelerometer) | ❌ Not started | Requires Core ML model on watch |
| Feedback loop | ✅ Done | 1-5 star rating, excludes disliked recipes, boosts liked ones |
| Brazilian recipe catalog | ✅ Done | 50 recipes across 5 categories, seeded via script |
| Weekly report v1 | ✅ Done | Claude-generated, metrics grid, push notification |

**Alpha: ~85% complete** (missing meal gesture detection)

### Beta — Aprendizado (Months 7-9)

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Preference model (ML) | ❌ Not started | Currently simple rule-based filtering |
| Food photo recognition | ❌ Not started | Requires vision pipeline |
| Routine confirmation (GPS + time) | ❌ Not started | Requires location permissions |
| Stress detection | 🟡 Partial | Low HRV trigger exists, but no dedicated stress scoring |
| Hydration detection | 🟡 Partial | hydration_reminder trigger type exists, but no smart scheduling |
| Android + Wear OS | ❌ Not started | iOS only |
| Monthly reports | ❌ Not started | Only weekly reports exist |

**Beta: ~15% complete** (only trigger types exist as foundations)

### v1.0 — Lançamento (Months 10-12)

| Deliverable | Status | Notes |
|-------------|--------|-------|
| App Store polishing | ❌ Not started | |
| Play Store (Android) | ❌ Not started | |
| Free/Premium/Pro tiers | ❌ Not started | No subscription/paywall |
| Optimized onboarding | 🟡 Partial | Onboarding exists but not A/B tested |
| Marketing | ❌ Not started | |

**v1.0: ~5% complete**

### v1.x — Escala (Year 2)

| Deliverable | Status | Notes |
|-------------|--------|-------|
| B2B corporate | ❌ | |
| Biometric meal inference | ❌ | |
| Improved on-device models | ❌ | |
| Garmin support | ❌ | |
| Professional export | ❌ | |
| Internationalization | ❌ | |

**v1.x: 0% complete**

---

## 2. Overall Assessment

```
Roadmap Progress:

MVP (Months 1-3)     ████████████████████ 100%
Alpha (Months 4-6)   █████████████████░░░  85%
Beta (Months 7-9)    ███░░░░░░░░░░░░░░░░░  15%
v1.0 (Months 10-12)  █░░░░░░░░░░░░░░░░░░░   5%
v1.x (Year 2)        ░░░░░░░░░░░░░░░░░░░░   0%
```

**We're solidly through MVP and most of Alpha.** The app can:
1. Authenticate users (Auth0)
2. Read HealthKit data in real-time
3. Detect 6 health contexts automatically
4. Generate personalized AI messages (Claude)
5. Deliver push notifications with fatigue protection
6. Sync data to Apple Watch
7. Onboard nutrition preferences
8. Suggest contextual Brazilian meals
9. Collect meal feedback and learn from it
10. Generate weekly AI coach reports

---

## 3. What's Built vs What the Product Needs

### Codebase Inventory

| Area | Files | Lines (est.) | State |
|------|-------|-------------|-------|
| iOS App | 29 Swift files | ~3,500 | Production-ready |
| Watch App | 5 Swift files | ~200 | MVP shell |
| Backend | 13 TS files | ~1,800 | Production-ready |
| Tests | 3 test files (19 tests) | ~200 | Partial coverage |
| Design System | 9 component files | ~400 | Solid foundation |
| Docs | 7 spec/plan docs | ~2,000 | Comprehensive |
| Infra | Docker + CI/CD | ~100 | Working |

### Backend API Coverage

| Route Group | Endpoints | Tested? |
|-------------|-----------|---------|
| Auth | 2 | ✅ Yes (5 tests) |
| Events | 1 | ✅ Yes (6 + 8 tests) |
| Nutrition | 6 | ❌ No |
| Reports | 3 | ❌ No |

### Test Gaps

| Area | Coverage | Priority |
|------|----------|----------|
| Trigger processor + cooldowns | ✅ Good | — |
| Auth middleware + JWT | ✅ Good | — |
| Event validation (Zod) | ✅ Good | — |
| Quiet hours logic | ✅ Good | — |
| Nutrition routes | ❌ Missing | HIGH |
| Meal suggestion service | ❌ Missing | HIGH |
| Report generation | ❌ Missing | MEDIUM |
| Reports routes | ❌ Missing | MEDIUM |

---

## 4. Key Gaps to Close Before Beta

### Gap 1: Meal Gesture Detection (Alpha scope)
**What**: Watch accelerometer + gyroscope detects hand-to-mouth eating pattern
**Why it matters**: Core differentiator from competitors — zero-friction meal logging
**Effort**: HIGH — needs Core ML model, watch sensor pipeline, training data
**Recommendation**: Defer to early Beta or build a simplified "meal time detection" using time-of-day + routine learning instead

### Gap 2: Test Coverage for New Features
**What**: Nutrition endpoints, meal suggestion logic, report generation have zero tests
**Why it matters**: Can't ship with confidence, regressions likely
**Effort**: MEDIUM — follow existing test patterns, mock DB/Claude
**Recommendation**: Write before starting Beta features

### Gap 3: Monthly Reports
**What**: Aggregate 4 weekly reports into monthly trend analysis
**Why it matters**: Retention anchor, justifies Premium subscription
**Effort**: MEDIUM — extend report-generator.ts with monthly aggregation
**Recommendation**: Build in next phase alongside weekly report improvements

### Gap 4: Preference Model
**What**: Replace simple "exclude rating ≤ 2" with ML-based recommendations
**Why it matters**: Makes nutrition suggestions dramatically better over time
**Effort**: HIGH — needs embedding model, user vectors, collaborative filtering
**Recommendation**: Start with enhanced rule-based system (ingredient similarity, macro matching) before full ML

### Gap 5: Android + Wear OS
**What**: Kotlin app with Health Connect SDK
**Why it matters**: ~50% of Brazilian smartphone market
**Effort**: VERY HIGH — parallel codebase, Health Connect API differences
**Recommendation**: Delay until after v1.0 iOS launch proves product-market fit

### Gap 6: Subscription/Paywall
**What**: Free/Premium/Pro tier enforcement
**Why it matters**: Revenue. No monetization path exists yet
**Effort**: MEDIUM — StoreKit 2 integration, backend plan enforcement
**Recommendation**: Build alongside v1.0 launch prep

---

## 5. Recommended Next Steps (Phase 4)

### Priority 1: Harden What We Have
1. **Write tests for nutrition routes** (profile CRUD, suggestion endpoint, feedback)
2. **Write tests for report generation** (metric aggregation, Claude fallback)
3. **Add error states to all iOS views** (network failure, empty data, loading)
4. **Cron job for weekly reports** (currently manual trigger only)

### Priority 2: Complete Alpha (Finish the 85%)
5. **Simplified meal detection** — Use time-of-day + notification prompt instead of accelerometer (80% of the value, 20% of the effort)
6. **Improve weekly reports** — Add nutrition data, trend comparison vs previous week

### Priority 3: Start Beta Foundation
7. **Monthly reports** — Aggregate weekly data, Claude summary of trends
8. **Enhanced meal preferences** — Ingredient-based similarity, macro goal matching
9. **Stress management module** — Dedicated view with breathing exercises triggered by low HRV
10. **Hydration tracking** — Simple water log with smart reminders

### Out of Scope for Next Phase
- Android / Wear OS (too large, defer to v1.0)
- Food photo recognition (needs vision ML pipeline)
- GPS-based routine detection (needs location permissions + data collection period)
- Subscription/paywall (defer to v1.0 launch)
- B2B, Garmin, internationalization (Year 2)

---

## 6. Product Hypotheses Status

From the product-overview.md:

| Hypothesis | Testable? | Status |
|-----------|-----------|--------|
| H1: Users prefer proactive insights over active searching | ✅ Yes — trigger engine + notifications work | Ready to test with users |
| H2: Meal feedback is simple enough to do consistently | ✅ Yes — 1-5 stars in 10 seconds | Ready to test with users |
| H3: Weekly report has enough value for Premium | ✅ Yes — report generation works | Ready to test with users |
| H4: Auto meal detection reduces nutrition module abandonment | ❌ Not yet — gesture detection not built | Needs simplified version first |

**3 of 4 hypotheses are testable today.** The app is ready for a small closed beta to validate them.
