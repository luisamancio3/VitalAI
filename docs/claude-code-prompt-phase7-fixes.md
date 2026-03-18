# Claude Code Prompt — Phase 7 Fixes (Final Polish)

## Context

You are working on VitalAI at `/home/user/VitalAI/` on branch `claude/vitalai-product-overview-o6hT1`. Phase 6 fixes were applied. This is the Phase 7 review round — 6 final polish items. The codebase is now in good shape structurally; these are the remaining refinements.

---

## Fix 1 (Medium): `Color.vitalBackground` is hardcoded light-mode — no Dark Mode support

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Shared/DesignSystem/Colors.swift` (line 9)

The app defines both `vitalBackground` (light) and `vitalBackgroundDark` (dark) but `vitalBackground` is always the light hex. Every view that uses `Color.vitalBackground` will show a light background in Dark Mode. The dark variant exists but is never used automatically.

**Fix:** Make `vitalBackground` adaptive using UIColor:

Replace lines 9-10:
```swift
    static let vitalBackground = Color(hex: "f6f8f7")    // Light background
    static let vitalBackgroundDark = Color(hex: "12201c") // Dark mode background
```

With:
```swift
    static let vitalBackground = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(Color(hex: "12201c"))
            : UIColor(Color(hex: "f6f8f7"))
    })
    static let vitalBackgroundDark = Color(hex: "12201c") // Keep for explicit use
```

Now `Color.vitalBackground` automatically adapts to the system appearance.

---

## Fix 2 (Medium): `SocialLoginButton` uses hardcoded `Color.white` and `Color.black`

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Shared/Components/SocialLoginButton.swift` (lines 61-65)

```swift
case .apple: return .black
case .google: return .white
```

The Apple button is always black-on-white and Google button always white — these don't adapt to Dark Mode. In Dark Mode, the Google button will be invisible (white on dark background).

**Fix:** Use adaptive colors:

```swift
    private var foregroundColor: Color {
        switch provider {
        case .apple: return Color(.systemBackground)
        case .google: return .vitalSlate800
        }
    }

    private var backgroundColor: Color {
        switch provider {
        case .apple: return Color(.label)
        case .google: return Color(.systemBackground)
        }
    }
```

`Color(.label)` is black in light mode, white in dark mode. `Color(.systemBackground)` is the inverse. This follows Apple's Sign in with Apple HIG.

---

## Fix 3 (Medium): `DashboardView.healthScore` can exceed 100

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Features/Dashboard/DashboardView.swift` (lines 7-41)

The `hrvScore` calculation on line 24:
```swift
return min(max(hrv / 50.0, 0), 1.5) / 1.5
```

This caps at `1.5 / 1.5 = 1.0`, but if all four components (sleep, HRV, steps, HR) score at 1.0, the weighted sum is `0.4 + 0.3 + 0.2 + 0.1 = 1.0` and the final score is `100`. However, `hrvScore` uses `min(max(hrv / 50.0, 0), 1.5)` — an HRV of 75ms gives `1.5 / 1.5 = 1.0`, which is correct. But the real issue is there's no final clamp — if the weights are ever adjusted or a score component slightly exceeds 1.0 due to floating point, `healthScore` could be `101` or higher.

**Fix:** Add a final clamp on line 40:

Replace:
```swift
        let raw = (sleepScore * sleepWeight) + (hrvScore * hrvWeight) + (stepsScore * stepsWeight) + (hrScore * hrWeight)
        return Int(raw * 100)
```

With:
```swift
        let raw = (sleepScore * sleepWeight) + (hrvScore * hrvWeight) + (stepsScore * stepsWeight) + (hrScore * hrWeight)
        return min(Int(raw * 100), 100)
```

---

## Fix 4 (Medium): Rate limit is global, not per-user

**File:** `/home/user/VitalAI/backend/src/index.ts` (lines 18-21)

```typescript
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});
```

The default `@fastify/rate-limit` key generator uses the IP address, but with mobile clients behind carrier-grade NAT, many users can share the same IP. 100 requests/minute per IP is too restrictive for shared IPs and too permissive per user.

**Fix:** Add a custom key generator that uses the authenticated user ID when available, falling back to IP:

```typescript
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  keyGenerator: (request) => {
    return request.userId ?? request.ip;
  },
});
```

This applies rate limiting per-user for authenticated requests and per-IP for unauthenticated ones (like `/health`).

---

## Fix 5 (Low): `Dockerfile` doesn't copy `.env` or set `NODE_ENV`

**File:** `/home/user/VitalAI/backend/Dockerfile`

The Dockerfile doesn't set `NODE_ENV=production`, which means:
- Express/Fastify may run in development mode with verbose logging
- npm install behavior may differ
- Some libraries behave differently in production

**Fix:** Add `NODE_ENV` to both stages:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
```

---

## Fix 6 (Low): `ProfileView` notifications toggle is local-only, not synced to backend

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Features/Profile/ProfileView.swift` (line 8)

```swift
@AppStorage("notificationsEnabled") private var notificationsEnabled = true
```

This toggle is stored in UserDefaults only. The backend has `notificationPreferences` in the users table but the toggle never syncs to it. If a user toggles notifications off, the backend will still send push notifications because it doesn't know about the preference.

This is a design gap that can't be fully fixed in one prompt, but we should at least add a TODO comment and prevent the disconnect from being silently ignored.

**Fix:** Add a comment and a fire-and-forget sync stub:

```swift
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true

    // TODO: Sync notificationsEnabled to backend via PATCH /api/v1/users/preferences
    // Currently this only affects local UI; the backend still sends notifications
```

This documents the gap clearly for the next developer.

---

## Constraints

- Do NOT change anything else beyond these 6 fixes
- Run `cd /home/user/VitalAI/backend && npm test` after backend fixes and ensure all tests pass
- Commit with message: "Fix Phase 7 review issues: dark mode colors, health score clamp, per-user rate limit, NODE_ENV, notification sync TODO"
- Push to `claude/vitalai-product-overview-o6hT1`
