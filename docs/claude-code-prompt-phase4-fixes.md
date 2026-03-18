# Claude Code Prompt — Phase 4 Fixes

## Context

You are working on VitalAI at `/home/user/VitalAI/` on branch `claude/vitalai-product-overview-o6hT1`. Phase 3 fixes were applied. This is the Phase 4 review round — 6 issues.

---

## Fix 1 (Critical): Hardcoded `localhost` base URL in APIService

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Services/APIService.swift` (line 6)

```swift
private let baseURL = URL(string: "http://localhost:3000/api/v1")!
```

This is a force-unwrap on a hardcoded localhost URL. In production this will never reach the real backend. It also uses `http://` (not HTTPS) and will be blocked by iOS App Transport Security.

**Fix:** Read the base URL from a configuration, with a production default and HTTPS:

```swift
final class APIService {
    static let shared = APIService()

    private let baseURL: URL

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()

    private init() {
        let urlString = Bundle.main.infoDictionary?["API_BASE_URL"] as? String
            ?? "https://api.vitalai.com/api/v1"
        guard let url = URL(string: urlString) else {
            fatalError("Invalid API_BASE_URL: \(urlString)")
        }
        self.baseURL = url
    }
```

This reads from `Info.plist` (settable per scheme/configuration), falls back to production HTTPS URL, and removes the force-unwrap on the URL literal.

---

## Fix 2 (High): CORS allows all origins

**File:** `/home/user/VitalAI/backend/src/index.ts` (line 12)

```typescript
await app.register(cors, { origin: true });
```

`origin: true` reflects any `Origin` header back, effectively allowing every domain. This is fine for local dev but dangerous in production — any website can make authenticated requests to the API.

**Fix:** Use an environment-based allowlist:

```typescript
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:5173"];

await app.register(cors, { origin: CORS_ORIGINS });
```

---

## Fix 3 (High): `DATABASE_URL` and `MONGODB_URI` force-unwrapped at module load

**File:** `/home/user/VitalAI/backend/src/config/database.ts` (lines 8, 14)

```typescript
const connectionString = process.env.DATABASE_URL!;
// ...
const uri = process.env.MONGODB_URI!;
```

Using the non-null assertion `!` on env vars means if they're missing, the app silently gets `undefined` passed as a connection string, producing cryptic connection errors instead of a clear startup failure.

**Fix:** Add explicit checks that fail fast with a clear message:

```typescript
// PostgreSQL + TimescaleDB (via Drizzle ORM)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

// MongoDB (recipe catalog, food database)
export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required");
  }
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}
```

---

## Fix 4 (High): `events.test.ts` duplicates the Zod schema instead of importing it

**File:** `/home/user/VitalAI/backend/tests/events.test.ts` (lines 4-17)

The test file recreates the entire `eventSchema` inline with a comment saying "Replicate the event schema from events.routes.ts". If the schema in `events.routes.ts` changes (e.g., new trigger type added), the test will still pass against its own stale copy — giving false confidence.

**Fix:** Export the schema from the routes file, then import it in the test.

First, in `/home/user/VitalAI/backend/src/routes/events.routes.ts`, export the schema (line 9):

```typescript
export const eventSchema = z.object({
```

Then replace the entire test file `/home/user/VitalAI/backend/tests/events.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { eventSchema } from "../src/routes/events.routes.js";

describe("Event Zod Validation", () => {
  it("should accept a valid event body", () => {
    const validEvent = {
      triggerType: "post_workout",
      payload: { duration: 45, type: "running" },
      timestamp: "2026-03-18T10:00:00.000Z",
    };

    const result = eventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("should reject an invalid triggerType", () => {
    const invalidEvent = {
      triggerType: "unknown_trigger",
      payload: { data: "test" },
      timestamp: "2026-03-18T10:00:00.000Z",
    };

    const result = eventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it("should reject a missing timestamp", () => {
    const missingTimestamp = {
      triggerType: "low_hrv",
      payload: { hrv: 25 },
    };

    const result = eventSchema.safeParse(missingTimestamp);
    expect(result.success).toBe(false);
  });

  it("should reject an invalid payload type", () => {
    const invalidPayload = {
      triggerType: "morning_sleep",
      payload: "not an object",
      timestamp: "2026-03-18T10:00:00.000Z",
    };

    const result = eventSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it("should reject an invalid timestamp format", () => {
    const invalidTimestamp = {
      triggerType: "inactivity",
      payload: {},
      timestamp: "not-a-date",
    };

    const result = eventSchema.safeParse(invalidTimestamp);
    expect(result.success).toBe(false);
  });

  it("should accept all valid trigger types", () => {
    const triggers = [
      "post_workout",
      "morning_sleep",
      "low_hrv",
      "high_heart_rate",
      "meal_detected",
      "inactivity",
      "hydration_reminder",
    ];

    for (const triggerType of triggers) {
      const result = eventSchema.safeParse({
        triggerType,
        payload: {},
        timestamp: "2026-03-18T10:00:00.000Z",
      });
      expect(result.success).toBe(true);
    }
  });
});
```

---

## Fix 5 (Medium): `generateMessage` needs max_tokens guard and timeout

**File:** `/home/user/VitalAI/backend/src/config/claude.ts`

The `generateMessage` function (lines 5-18) has `max_tokens: 1024` but no timeout. If the Claude API is slow or hangs, `processEvent` blocks indefinitely. Also, 1024 tokens is generous for a 2-sentence Portuguese message — it wastes tokens and latency.

**Fix:** Lower max_tokens and add a timeout via AbortController:

```typescript
export async function generateMessage(
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

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

---

## Fix 6 (Medium): Add indexes to `notification_log` table

**File:** `/home/user/VitalAI/backend/src/db/schema.ts`

`health_events` got indexes in Phase 2, but `notification_log` is also queried by `userId` and `eventId` (for checking delivery status) and has none.

**Fix:** Add indexes to the `notificationLog` table:

```typescript
// notification_log table
export const notificationLog = pgTable("notification_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  eventId: uuid("event_id").references(() => healthEvents.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  fcmMessageId: text("fcm_message_id"),
  delivered: boolean("delivered").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notification_log_user_id").on(table.userId),
  index("idx_notification_log_event_id").on(table.eventId),
]);
```

---

## Constraints

- Do NOT change anything else beyond these 6 fixes
- Run `cd /home/user/VitalAI/backend && npm test` after all backend fixes and ensure all tests pass
- Commit with message: "Fix Phase 4 review issues: API base URL config, CORS allowlist, env validation, schema import, Claude timeout, notification indexes"
- Push to `claude/vitalai-product-overview-o6hT1`
