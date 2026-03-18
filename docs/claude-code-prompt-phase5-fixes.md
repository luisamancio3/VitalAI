# Claude Code Prompt — Phase 5 Fixes

## Context

You are working on VitalAI at `/home/user/VitalAI/` on branch `claude/vitalai-product-overview-o6hT1`. Phase 4 fixes were applied. This is the Phase 5 review round — 6 issues.

---

## Fix 1 (High): `Anthropic` client exported and instantiated at module scope with no API key check

**File:** `/home/user/VitalAI/backend/src/config/claude.ts` (line 3)

```typescript
export const anthropic = new Anthropic();
```

The `Anthropic()` constructor reads `ANTHROPIC_API_KEY` from env. If the key is missing, the client is created silently but every API call will fail with a confusing auth error. Also, `anthropic` is exported but never used outside this module — it leaks an implementation detail.

**Fix:** Make the client private and validate the key at startup:

```typescript
import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

const anthropic = new Anthropic();

export async function generateMessage(
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      },
      { signal: controller.signal },
    );

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.text ?? "";
  } finally {
    clearTimeout(timeout);
  }
}
```

Key changes: removed `export` from `anthropic`, added env var check.

---

## Fix 2 (High): `deliverNotification` return type is untyped — `messageId` is cast unsafely

**File:** `/home/user/VitalAI/backend/src/services/notification.service.ts` (lines 14-24)

`deliverNotification` returns `{ success: true, messageId }` or `{ success: false, error }` — but there's no return type annotation. The caller in `trigger-processor.ts` line 83 does `result.messageId as string` which is an unsafe cast.

**Fix:** Add a discriminated union return type:

```typescript
type DeliveryResult =
  | { success: true; messageId: string }
  | { success: false; error: unknown };

export async function deliverNotification(payload: NotificationPayload): Promise<DeliveryResult> {
  const { fcmToken, title, body, data } = payload;

  try {
    const messageId = await sendPushNotification(fcmToken, title, body, data);
    return { success: true, messageId };
  } catch (error) {
    console.error("FCM delivery failed:", error);
    return { success: false, error };
  }
}
```

Then in `/home/user/VitalAI/backend/src/services/trigger-processor.ts` line 83, remove the unsafe cast:

Replace:
```typescript
        fcmMessageId: result.success ? (result.messageId as string) : null,
```
With:
```typescript
        fcmMessageId: result.success ? result.messageId : null,
```

With the discriminated union, TypeScript knows `result.messageId` is `string` when `result.success` is `true` — no cast needed.

---

## Fix 3 (High): `processEvent` catch returns `{ processed: false }` — caller can't tell failure from cooldown

**File:** `/home/user/VitalAI/backend/src/services/trigger-processor.ts` (lines 97-99)

Both the cooldown branch (line 47) and the error catch (line 99) return `{ processed: false }`. The events route handler (line 51 in `events.routes.ts`) returns this to the client — there's no way to distinguish "on cooldown, try later" from "internal error". This will make debugging production issues very difficult.

**Fix:** Add a `reason` field to `ProcessResult`:

```typescript
interface ProcessResult {
  processed: boolean;
  message?: string;
  reason?: "cooldown" | "error";
}
```

Then update the two return points:

Line 47 (cooldown):
```typescript
  if (!acquired) return { processed: false, reason: "cooldown" };
```

Lines 97-99 (catch):
```typescript
  } catch (error) {
    console.error(`[TriggerProcessor] Failed to process ${triggerType} for ${userId}:`, error);
    return { processed: false, reason: "error" };
  }
```

And in `/home/user/VitalAI/backend/src/routes/events.routes.ts` line 51, include the reason:
```typescript
      return { processed: result.processed, message: result.message, triggerType: parsed.data.triggerType, reason: result.reason };
```

---

## Fix 4 (Medium): `getUserFcmToken` doesn't handle Redis errors gracefully

**File:** `/home/user/VitalAI/backend/src/services/notification.service.ts` (lines 26-46)

If Redis is down, `redis.get()` or `redis.setex()` will throw, which propagates up through `processEvent` and causes the entire event to fail. The FCM token lookup from the database should still work even if Redis is unavailable.

**Fix:** Make Redis calls best-effort:

```typescript
export async function getUserFcmToken(userId: string): Promise<string | null> {
  // Check Redis cache first (best-effort)
  try {
    const cached = await redis.get(`fcm:${userId}`);
    if (cached) return cached;
  } catch {
    // Redis unavailable — fall through to database
  }

  // Query database for FCM token
  const [user] = await db
    .select({ fcmToken: users.fcmToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const token = user?.fcmToken ?? null;

  // Cache in Redis with 5-minute TTL (best-effort)
  if (token) {
    try {
      await redis.setex(`fcm:${userId}`, 300, token);
    } catch {
      // Redis unavailable — skip caching
    }
  }

  return token;
}
```

---

## Fix 5 (Medium): `trigger-processor.test.ts` assertion `expect(result.message).toBeDefined()` is too weak

**File:** `/home/user/VitalAI/backend/tests/trigger-processor.test.ts` (line 62)

```typescript
expect(result.message).toBeDefined();
```

This passes for any non-undefined value (including `null`, `0`, `false`, empty string). The mock returns `"Ótimo treino! Descanse e se hidrate."` — the test should verify it's actually a non-empty string from the Claude mock.

**Fix:** Replace line 62:

```typescript
    expect(result.message).toBe("Ótimo treino! Descanse e se hidrate.");
```

Also strengthen the notification test (line 112) to verify the message was actually returned:

After line 112, add:
```typescript
    expect(result.message).toBe("Ótimo treino! Descanse e se hidrate.");
```

---

## Fix 6 (Medium): `SignUpView` and `LoginView` don't disable social login buttons during loading

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Features/Onboarding/LoginView.swift` (lines 34-39)
**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Features/Onboarding/SignUpView.swift` (lines 34-39)

The email/password "Entrar" / "Criar conta" buttons are correctly disabled when `authService.isLoading` is true. But the Apple/Google social login buttons have no such guard — users can tap them while a login is in progress, triggering duplicate `loginWithUniversalLogin()` calls and potentially race conditions in Auth0's web session.

**Fix:** In both `LoginView.swift` and `SignUpView.swift`, add `.disabled(authService.isLoading)` to the social login section.

In **LoginView.swift**, after line 40 (closing brace of the social buttons VStack), before `.padding(.horizontal, VitalSpacing.lg)`:

```swift
                VStack(spacing: VitalSpacing.md) {
                    SocialLoginButton(provider: .apple) {
                        Task { await authService.loginWithUniversalLogin() }
                    }
                    SocialLoginButton(provider: .google) {
                        Task { await authService.loginWithUniversalLogin() }
                    }
                }
                .disabled(authService.isLoading)
                .padding(.horizontal, VitalSpacing.lg)
```

Apply the same `.disabled(authService.isLoading)` in **SignUpView.swift** at the same location (after the social buttons VStack, before `.padding`).

---

## Constraints

- Do NOT change anything else beyond these 6 fixes
- Run `cd /home/user/VitalAI/backend && npm test` after all backend fixes and ensure all tests pass
- Commit with message: "Fix Phase 5 review issues: API key validation, typed delivery result, process reason, Redis resilience, test assertions, social button disable"
- Push to `claude/vitalai-product-overview-o6hT1`
