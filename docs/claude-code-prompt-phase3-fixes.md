# Claude Code Prompt — Phase 3 Fixes

## Context

You are working on VitalAI at `/home/user/VitalAI/` on branch `claude/vitalai-product-overview-o6hT1`. Phase 2 fixes were applied. This is the Phase 3 review round — 6 new issues.

---

## Fix 1 (Critical): Add `@MainActor` to AuthService

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Services/AuthService.swift`

`AuthService` is an `ObservableObject` with `@Published` properties (`state`, `isLoading`, `errorMessage`) that are set from `async` methods. Without `@MainActor`, these writes can happen off the main thread, causing UI crashes.

`HealthKitService` was fixed in Phase 2 — `AuthService` needs the same treatment.

**Fix:** Add `@MainActor` before the class declaration (line 29):

```swift
@MainActor
final class AuthService: ObservableObject {
```

No other changes needed — all methods are instance methods and inherit the annotation.

---

## Fix 2 (Critical): Wrap `processEvent` in try/catch

**File:** `/home/user/VitalAI/backend/src/services/trigger-processor.ts`

The `processEvent` function (lines 40-99) calls `generateMessage`, `db.insert`, `deliverNotification`, `db.update` — all of which can throw. There is zero error handling. An unhandled rejection from any of these will crash the Fastify route handler.

**Fix:** Wrap the body of `processEvent` in a try/catch. Replace lines 40-99 with:

```typescript
export async function processEvent(event: ClassifiedEvent): Promise<ProcessResult> {
  const { userId, triggerType } = event;
  const cooldownKey = `cooldown:${userId}:${triggerType}`;

  // Check cooldown via Redis
  const isOnCooldown = await redis.exists(cooldownKey);
  if (isOnCooldown) return { processed: false };

  // Set cooldown
  const cooldownSeconds = COOLDOWN_MAP[triggerType];
  await redis.setex(cooldownKey, cooldownSeconds, "1");

  try {
    // Generate personalized message via Claude
    const systemPrompt = buildSystemPrompt(triggerType);
    const userContext = JSON.stringify(event.payload);
    const message = await generateMessage(systemPrompt, userContext);

    // Insert health event into DB
    const [insertedEvent] = await db
      .insert(healthEvents)
      .values({
        userId,
        triggerType,
        payload: event.payload,
        messageGenerated: message,
      })
      .returning();

    // Send push notification
    const fcmToken = await getUserFcmToken(userId);
    if (fcmToken) {
      const title = buildNotificationTitle(triggerType);
      const result = await deliverNotification({
        userId,
        fcmToken,
        title,
        body: message,
      });

      // Log notification
      await db.insert(notificationLog).values({
        userId,
        eventId: insertedEvent.id,
        title,
        body: message,
        fcmMessageId: result.success ? (result.messageId as string) : null,
        delivered: result.success,
      });

      // Update health event
      if (result.success) {
        await db
          .update(healthEvents)
          .set({ notificationSent: true })
          .where(eq(healthEvents.id, insertedEvent.id));
      }
    }

    return { processed: true, message };
  } catch (error) {
    console.error(`[TriggerProcessor] Failed to process ${triggerType} for ${userId}:`, error);
    return { processed: false };
  }
}
```

Note: The cooldown set stays OUTSIDE the try/catch — this is intentional. If processing fails, the cooldown still prevents retry spam. The catch returns `{ processed: false }` so the route can respond gracefully.

---

## Fix 3 (High): Fix TOCTOU race condition in cooldown

**File:** `/home/user/VitalAI/backend/src/services/trigger-processor.ts`

Lines 45-50 have a classic TOCTOU race: `redis.exists()` then `redis.setex()` are two separate calls. Two concurrent requests for the same user+trigger can both pass the check before either sets the key.

**Fix:** Replace the two Redis calls (lines 44-50) with a single atomic operation using `SET NX EX`:

Replace:
```typescript
  // Check cooldown via Redis
  const isOnCooldown = await redis.exists(cooldownKey);
  if (isOnCooldown) return { processed: false };

  // Set cooldown
  const cooldownSeconds = COOLDOWN_MAP[triggerType];
  await redis.setex(cooldownKey, cooldownSeconds, "1");
```

With:
```typescript
  // Atomically check-and-set cooldown via Redis SET NX EX
  const cooldownSeconds = COOLDOWN_MAP[triggerType];
  const acquired = await redis.set(cooldownKey, "1", "EX", cooldownSeconds, "NX");
  if (!acquired) return { processed: false };
```

This uses `SET key value EX seconds NX` which only sets if the key doesn't exist, atomically. Returns `"OK"` if set, `null` if key already exists.

---

## Fix 4 (High): Add Zod validation to fcm-token route

**File:** `/home/user/VitalAI/backend/src/routes/auth.routes.ts`

The `/register` route now has Zod validation (Phase 2 fix), but the `/fcm-token` route (line 38-57) still uses a raw type assertion with only a truthy check. An empty string `""` passes the `!body.fcmToken` check since it's falsy, but a string of length 1 like `"x"` would be accepted as a valid FCM token.

**Fix:** Add a Zod schema and apply it. After the `registerSchema` (line 11), add:

```typescript
const fcmTokenSchema = z.object({
  fcmToken: z.string().min(32).max(4096),
});
```

Then replace the handler body of the `/fcm-token` route (lines 39-56):

```typescript
  app.post("/fcm-token", { preHandler: [authMiddleware] }, async (request, reply) => {
    const auth0Id = request.userId;
    const parsed = fcmTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid or missing fcmToken" });
    }

    const result = await db
      .update(users)
      .set({ fcmToken: parsed.data.fcmToken, updatedAt: new Date() })
      .where(eq(users.auth0Id, auth0Id))
      .returning({ id: users.id });

    if (result.length === 0) {
      return reply.status(404).send({ error: "User not found" });
    }

    return reply.status(200).send({ success: true });
  });
```

---

## Fix 5 (Medium): Add try/catch to route handlers

**File:** `/home/user/VitalAI/backend/src/routes/auth.routes.ts`

Both route handlers lack try/catch. If `db.insert()` or `db.update()` throws (connection error, constraint violation), the error propagates as an unhandled rejection.

**Fix:** Wrap the DB operations in both handlers:

For the `/register` handler, after the Zod validation block, wrap lines 25-34:

```typescript
    try {
      const [user] = await db
        .insert(users)
        .values({ auth0Id, email, name })
        .onConflictDoUpdate({
          target: users.auth0Id,
          set: { email, name, updatedAt: new Date() },
        })
        .returning();

      return reply.status(200).send({ id: user.id, auth0Id: user.auth0Id });
    } catch (error) {
      request.log.error(error, "Failed to register user");
      return reply.status(500).send({ error: "Internal server error" });
    }
```

For the `/fcm-token` handler, wrap the DB operations similarly:

```typescript
    try {
      const result = await db
        .update(users)
        .set({ fcmToken: parsed.data.fcmToken, updatedAt: new Date() })
        .where(eq(users.auth0Id, auth0Id))
        .returning({ id: users.id });

      if (result.length === 0) {
        return reply.status(404).send({ error: "User not found" });
      }

      return reply.status(200).send({ success: true });
    } catch (error) {
      request.log.error(error, "Failed to update FCM token");
      return reply.status(500).send({ error: "Internal server error" });
    }
```

---

## Fix 6 (Medium): Add try/catch to events route handler

**File:** `/home/user/VitalAI/backend/src/routes/events.routes.ts`

The POST handler (lines 25-51) calls `db.select()` and `processEvent()` with no error handling. A DB connection failure or Claude API timeout will crash the route.

**Fix:** Wrap lines 32-50 in a try/catch:

```typescript
    try {
      // Look up internal user ID from Auth0 sub
      const auth0Id = request.userId;
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.auth0Id, auth0Id))
        .limit(1);

      if (!user) {
        return reply.status(404).send({ error: "User not found. Call /auth/register first." });
      }

      const result = await processEvent({
        userId: user.id,
        triggerType: parsed.data.triggerType,
        payload: parsed.data.payload,
        timestamp: parsed.data.timestamp,
      });

      return { processed: result.processed, message: result.message, triggerType: parsed.data.triggerType };
    } catch (error) {
      request.log.error(error, "Failed to process event");
      return reply.status(500).send({ error: "Internal server error" });
    }
```

---

## Constraints

- Do NOT change anything else beyond these 6 fixes
- Run `cd /home/user/VitalAI/backend && npm test` after all backend fixes and ensure all tests pass
- Commit with message: "Fix Phase 3 review issues: AuthService @MainActor, try/catch handlers, atomic cooldown, fcm-token validation"
- Push to `claude/vitalai-product-overview-o6hT1`
