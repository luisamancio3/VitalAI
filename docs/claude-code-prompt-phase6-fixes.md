# Claude Code Prompt — Phase 6 Fixes

## Context

You are working on VitalAI at `/home/user/VitalAI/` on branch `claude/vitalai-product-overview-o6hT1`. Phase 5 fixes were applied. This is the Phase 6 review round — 6 issues.

---

## Fix 1 (High): WatchDashboardView uses hardcoded static values instead of real HealthKit data

**File:** `/home/user/VitalAI/ios/VitalAIWatch/Views/WatchDashboardView.swift`

The watch dashboard displays hardcoded values: "78" for health score, "72" for BPM, "7.5h" for sleep. This is static placeholder data — the view has no connection to HealthKit or any data source.

**Fix:** This is a UI shell that will be connected to real data later. For now, add a clear comment at the top of the view to flag it, and use a `@State` placeholder pattern so it's wired for future data binding:

```swift
import SwiftUI

// TODO: Connect to WatchConnectivity session to receive health data from the paired iPhone
// All values below are placeholders until the WatchConnectivity bridge is implemented

struct WatchDashboardView: View {
    @State private var healthScore: Int = 0
    @State private var heartRate: Int = 0
    @State private var sleepHours: Double = 0

    private var hasData: Bool {
        healthScore > 0 || heartRate > 0 || sleepHours > 0
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                if hasData {
                    // Health Score
                    Text("\(healthScore)")
                        .font(.system(size: 44, weight: .bold))
                        .foregroundStyle(Color(hex: "2bd4a7"))

                    Text("Health Score")
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    Divider()

                    // Quick stats
                    HStack {
                        VStack {
                            Image(systemName: "heart.fill")
                                .foregroundStyle(.red)
                            Text("\(heartRate)")
                                .font(.caption)
                                .bold()
                            Text("BPM")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }

                        VStack {
                            Image(systemName: "bed.double.fill")
                                .foregroundStyle(.indigo)
                            Text(String(format: "%.1fh", sleepHours))
                                .font(.caption)
                                .bold()
                            Text("Sono")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                } else {
                    Text("Conecte o iPhone para ver seus dados")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            .padding()
        }
    }
}
```

---

## Fix 2 (High): `HealthKitPermissionView` swallows auth errors silently with `try?`

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Features/Auth/HealthKitPermissionView.swift` (lines 58-61)

```swift
Task {
    try? await healthKitService.requestAuthorization()
    onComplete()
}
```

`try?` discards any errors from HealthKit authorization. If authorization fails (device restricted, parental controls, etc.), the user sees no feedback and just gets pushed forward. The user might think they granted permissions when they didn't.

**Fix:** Handle the error and show feedback:

```swift
                VitalButton(title: "Conectar Apple Health", variant: .primary) {
                    Task {
                        do {
                            try await healthKitService.requestAuthorization()
                        } catch {
                            print("[HealthKit] Authorization failed: \(error)")
                        }
                        onComplete()
                    }
                }
```

This still calls `onComplete()` (user shouldn't be blocked), but now logs the error for debugging. The `authorizationStatus` property on `healthKitService` is already updated inside `requestAuthorization()`, so downstream code can check if permissions were actually granted.

---

## Fix 3 (High): `HealthKitPermissionView` uses hardcoded `Color.white` background

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Features/Auth/HealthKitPermissionView.swift` (line 40)

```swift
.background(Color.white)
```

This breaks Dark Mode — the data types list card will always have a white background even on dark screens. The outer view uses `Color.vitalBackground`, but this inner card is hardcoded.

**Fix:** Replace with a semantic color:

```swift
.background(Color(.systemBackground))
```

This uses the system background color which adapts to light/dark mode automatically.

---

## Fix 4 (Medium): Test for cooldown rejection doesn't verify `reason` field

**File:** `/home/user/VitalAI/backend/tests/trigger-processor.test.ts` (lines 66-78)

The `ProcessResult` now has a `reason` field (Phase 5), but the "should reject event when on cooldown" test only checks `processed` and `message` — it never asserts that `reason` is `"cooldown"`.

**Fix:** Add reason assertions to both the cooldown test and add a new error test:

After line 77, add a reason assertion:
```typescript
    expect(result.reason).toBe("cooldown");
```

And add a new test case for the error path:
```typescript
  it("should return error reason when processing fails", async () => {
    const { generateMessage } = await import("../src/config/claude.js");
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue("OK");
    (generateMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("API timeout"));

    const result = await processEvent({
      userId: "user-error",
      triggerType: "inactivity",
      payload: {},
      timestamp: new Date().toISOString(),
    });

    expect(result.processed).toBe(false);
    expect(result.reason).toBe("error");
  });
```

Also, the success test (line 52) should verify there is no reason:

After line 63, add:
```typescript
    expect(result.reason).toBeUndefined();
```

---

## Fix 5 (Medium): `OnboardingFlow` accesses `onboardingSlides[currentSlide]` with no bounds check

**File:** `/home/user/VitalAI/ios/VitalAI/VitalAI/Features/Onboarding/OnboardingFlow.swift` (line 33)

```swift
title: onboardingSlides[currentSlide].buttonTitle,
```

If `currentSlide` gets out of bounds (e.g. from a race condition with the TabView gesture or animation), this will crash with an array index out of bounds. The `ForEach` uses `.tag(slide.id)` where `id` is `0, 1, 2`, and `TabView(selection:)` can transiently set values outside the valid range during swipe animations.

**Fix:** Use safe array access:

Replace line 33:
```swift
                    VitalButton(
                        title: currentSlide < onboardingSlides.count
                            ? onboardingSlides[currentSlide].buttonTitle
                            : "Começar",
                        variant: .primary
                    ) {
```

---

## Fix 6 (Low): `Combine` imported but unused in several files

**Files:**
- `/home/user/VitalAI/ios/VitalAI/VitalAI/Features/Onboarding/LoginView.swift` (line 2)
- `/home/user/VitalAI/ios/VitalAI/VitalAI/Features/Onboarding/SignUpView.swift` (line 2)
- `/home/user/VitalAI/ios/VitalAI/VitalAI/ContentView.swift` (line 2)
- `/home/user/VitalAI/ios/VitalAI/VitalAI/Features/Dashboard/DashboardView.swift` (line 2)

`Combine` was imported during early development but is now unused since `@Published` is part of SwiftUI's `ObservableObject` protocol (which is re-exported via SwiftUI). These files only use `@EnvironmentObject` and `@State` — they never import Combine types like `AnyCancellable`, `Publisher`, etc.

**Fix:** Remove `import Combine` from all four files. Just delete the line in each.

---

## Constraints

- Do NOT change anything else beyond these 6 fixes
- Run `cd /home/user/VitalAI/backend && npm test` after backend fixes and ensure all tests pass
- Commit with message: "Fix Phase 6 review issues: watch placeholder data, HealthKit auth error, dark mode, reason tests, bounds check, unused imports"
- Push to `claude/vitalai-product-overview-o6hT1`
