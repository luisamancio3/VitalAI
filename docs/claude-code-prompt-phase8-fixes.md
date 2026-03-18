# Claude Code Prompt — Phase 8 Fixes (Final)

## Context

You are working on VitalAI at `/home/user/VitalAI/` on branch `claude/vitalai-product-overview-o6hT1`. Phase 7 fixes were applied. This is the final review round — 5 remaining items to reach a clean state.

---

## Fix 1 (Medium): `ProfileView` still imports `Combine` — missed in Phase 6

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Features/Profile/ProfileView.swift` (line 2)

Phase 6 removed unused `import Combine` from 4 files but missed `ProfileView.swift`. It imports `Combine` but only uses `@EnvironmentObject` and `@AppStorage`, both from SwiftUI.

**Fix:** Remove line 2 (`import Combine`). Keep `import SwiftUI` and `import HealthKit`.

---

## Fix 2 (Medium): `AuthService` imports `Combine` unnecessarily

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Services/AuthService.swift` (line 2)

`AuthService` uses `@Published` and `ObservableObject`, both re-exported by SwiftUI. The `Combine` import is not needed — no `AnyCancellable`, `Publisher`, or other Combine-specific types are used.

**Fix:** Remove line 2 (`import Combine`). Keep `import SwiftUI` and `import Auth0`.

---

## Fix 3 (Medium): `HealthKitService` imports `Combine` unnecessarily

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Services/HealthKitService.swift` (line 2)

Same issue. Uses `@Published` and `ObservableObject` from SwiftUI only.

**Fix:** Remove line 2 (`import Combine`). Keep `import SwiftUI` and `import HealthKit`.

---

## Fix 4 (Medium): `drizzle.config.ts` uses `DATABASE_URL!` without validation

**File:** `/home/user/VitalAI/backend/drizzle.config.ts` (line 6)

```typescript
url: process.env.DATABASE_URL!,
```

Phase 4 fixed the same issue in `database.ts`, but `drizzle.config.ts` still uses the non-null assertion. If `DATABASE_URL` is missing when running `npm run db:generate` or `db:migrate`, it fails with a cryptic error.

**Fix:** Replace the config with a validated version:

```typescript
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required for Drizzle Kit");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
```

---

## Fix 5 (Medium): `APIService` methods silently return on HTTP errors instead of throwing

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Services/APIService.swift`

All three methods (`registerUser`, `sendFCMToken`, `sendHealthEvent`) are marked `async throws` but silently `return` on non-2xx responses instead of throwing an error. This means callers using `try` will never catch failures — the function always "succeeds" from the caller's perspective.

For `registerUser` (line 44-46) and `sendFCMToken` (line 64-66), this is called fire-and-forget so it's less critical. But `sendHealthEvent` (line 88-90) silently discards failures, and future callers may rely on the `throws` contract.

**Fix:** Define an error type and throw on non-2xx responses:

Add at the top of the file, after `import Foundation`:

```swift
enum APIError: LocalizedError {
    case httpError(statusCode: Int)

    var errorDescription: String? {
        switch self {
        case .httpError(let code):
            return "HTTP error \(code)"
        }
    }
}
```

Then update each method's error guard to throw instead of return. For `registerUser` (replace lines 43-46):

```swift
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            print("[APIService] registerUser failed with status: \(code)")
            throw APIError.httpError(statusCode: code)
        }
```

For `sendFCMToken` (replace lines 62-66):

```swift
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            print("[APIService] sendFCMToken failed with status: \(code)")
            throw APIError.httpError(statusCode: code)
        }
```

For `sendHealthEvent` (replace lines 86-90):

```swift
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            print("[APIService] sendHealthEvent failed with status: \(code)")
            throw APIError.httpError(statusCode: code)
        }
```

Note: The callers in `AuthService` already use `try?` for fire-and-forget, so they'll continue to silently absorb these errors as intended. But now any future caller that uses `try` will get proper error propagation.

---

## Constraints

- Do NOT change anything else beyond these 5 fixes
- Run `cd /home/user/VitalAI/backend && npm test` after the drizzle.config fix and ensure all tests pass
- Commit with message: "Fix Phase 8 final review: unused Combine imports, drizzle config validation, APIService error throwing"
- Push to `claude/vitalai-product-overview-o6hT1`
