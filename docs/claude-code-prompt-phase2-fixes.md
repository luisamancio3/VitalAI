# Claude Code Prompt — Phase 2 Fixes

## Context

You are working on VitalAI at `/home/user/VitalAI/` on branch `claude/vitalai-product-overview-o6hT1`. Phase 2 was just completed and a review found 6 issues to fix. Fix them in order below.

---

## Fix 1 (High): Add `@MainActor` to HealthKitService

**File:** `ios/VitalAI/VitalAI/Services/HealthKitService.swift`

The class is an `ObservableObject` with `@Published` properties that get written at the end of each fetch method (e.g. `latestHeartRate = result` on line 72). HealthKit query callbacks run on arbitrary queues. The `withCheckedContinuation` bridges back to async, but the property writes still need the main actor.

**Fix:** Add `@MainActor` annotation to the class declaration:
```swift
@MainActor
final class HealthKitService: ObservableObject {
```

That's it. Since all fetch methods are instance methods, they inherit `@MainActor` isolation and the `@Published` writes are safe. No other changes needed.

---

## Fix 2 (High): Fix JWKS URL construction

**File:** `backend/src/middleware/auth.ts` (line 9)

Current code:
```ts
const jwks = createRemoteJWKSet(
  new URL(`${AUTH_ISSUER_URL}.well-known/jwks.json`),
);
```

If `AUTH_ISSUER_URL` doesn't end with `/`, this produces `https://domain.well-known/jwks.json` (missing slash). The default value happens to have a trailing slash, but this is fragile.

**Fix:** Use the `URL` constructor's base parameter for safe resolution:
```ts
const jwks = createRemoteJWKSet(
  new URL(".well-known/jwks.json", AUTH_ISSUER_URL),
);
```

This handles both `https://issuer.com/` and `https://issuer.com` correctly.

---

## Fix 3 (Medium): Add Zod validation to register body

**File:** `backend/src/routes/auth.routes.ts`

The register endpoint casts `request.body as { email?: string; name?: string }` with no validation (line 11). A malformed body could insert garbage into the database.

**Fix:** Add a Zod schema and validate:

```ts
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().max(200).optional(),
});
```

Then in the handler, replace the raw cast:
```ts
const parsed = registerSchema.safeParse(request.body);
if (!parsed.success) {
  return reply.status(400).send({ error: parsed.error.flatten() });
}
const email = parsed.data.email ?? "unknown@vitalai.app";
const name = parsed.data.name ?? null;
```

---

## Fix 4 (Medium): Add test for notification delivery path

**File:** `backend/tests/trigger-processor.test.ts`

Currently `getUserFcmToken` is mocked to return `null` in all tests, so the notification branch (lines 68-93 in `trigger-processor.ts`) is never exercised. The branch that calls `deliverNotification`, inserts into `notification_log`, and updates `health_events.notificationSent` is completely untested.

**Fix:** Add a new test case inside the existing `describe("TriggerProcessor")` block:

```ts
it("should send notification when user has FCM token", async () => {
  const { getUserFcmToken, deliverNotification } = await import("../src/services/notification.service.js");
  (redis.exists as ReturnType<typeof vi.fn>).mockResolvedValue(0);
  (getUserFcmToken as ReturnType<typeof vi.fn>).mockResolvedValue("fcm-token-abc");
  (deliverNotification as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, messageId: "msg-456" });

  const result = await processEvent({
    userId: "user-with-token",
    triggerType: "low_hrv",
    payload: { hrv: 20 },
    timestamp: new Date().toISOString(),
  });

  expect(result.processed).toBe(true);
  expect(deliverNotification).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "user-with-token",
      fcmToken: "fcm-token-abc",
    }),
  );
});
```

---

## Fix 5 (Low): Add database indexes on health_events

**File:** `backend/src/db/schema.ts`

The `health_events` table will be queried by `user_id` and `trigger_type` frequently but has no indexes.

**Fix:** Add an index import and define indexes:

```ts
import { pgTable, uuid, text, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
```

Then update the `healthEvents` table to include indexes as a third argument:

```ts
export const healthEvents = pgTable("health_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  triggerType: text("trigger_type").notNull(),
  payload: jsonb("payload").notNull(),
  messageGenerated: text("message_generated"),
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_health_events_user_id").on(table.userId),
  index("idx_health_events_trigger_type").on(table.triggerType),
]);
```

---

## Fix 6 (Low): Use string defaults for jsonb columns

**File:** `backend/src/db/schema.ts`

Lines 10-11 use `.default({})` which passes a JS object. This may not serialize correctly to jsonb in all Drizzle versions.

**Fix:** Change to SQL-safe string defaults:

```ts
notificationPreferences: jsonb("notification_preferences").default('{}'),
healthGoals: jsonb("health_goals").default('{}'),
```

---

## Constraints

- Do NOT change anything else beyond these 6 fixes
- Run `cd backend && npm test` after fixes 2-6 and ensure all tests pass
- Commit with message: "Fix Phase 2 review issues: @MainActor, JWKS URL, Zod validation, test coverage, DB indexes"
- Push to `claude/vitalai-product-overview-o6hT1`
