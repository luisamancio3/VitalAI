import Foundation
import HealthKit

@MainActor
final class TriggerEngine: ObservableObject {
    private let healthStore = HKHealthStore()
    private var observerQueries: [HKObserverQuery] = []
    private var inactivityTimer: Timer?

    // Running averages stored in UserDefaults
    private let defaults = UserDefaults.standard

    private var avgRestingHR: Double {
        get { defaults.double(forKey: "triggerEngine.avgRestingHR") }
        set { defaults.set(newValue, forKey: "triggerEngine.avgRestingHR") }
    }

    private var avgHRV: Double {
        get { defaults.double(forKey: "triggerEngine.avgHRV") }
        set { defaults.set(newValue, forKey: "triggerEngine.avgHRV") }
    }

    private var lastStepUpdate: Date {
        get { defaults.object(forKey: "triggerEngine.lastStepUpdate") as? Date ?? Date() }
        set { defaults.set(newValue, forKey: "triggerEngine.lastStepUpdate") }
    }

    private var hasFiredMorningSleepToday: Bool {
        get {
            guard let date = defaults.object(forKey: "triggerEngine.morningSleepDate") as? Date else { return false }
            return Calendar.current.isDateInToday(date)
        }
        set {
            if newValue {
                defaults.set(Date(), forKey: "triggerEngine.morningSleepDate")
            }
        }
    }

    private var lastHydrationReminder: Date {
        get { defaults.object(forKey: "triggerEngine.lastHydrationReminder") as? Date ?? .distantPast }
        set { defaults.set(newValue, forKey: "triggerEngine.lastHydrationReminder") }
    }

    private var lastAveragesRefresh: Date {
        get { defaults.object(forKey: "triggerEngine.lastAvgRefresh") as? Date ?? .distantPast }
        set { defaults.set(newValue, forKey: "triggerEngine.lastAvgRefresh") }
    }

    // MARK: - Start Monitoring

    func startMonitoring() {
        guard HKHealthStore.isHealthDataAvailable() else { return }

        // Refresh 7-day averages if stale (> 24h)
        if Date().timeIntervalSince(lastAveragesRefresh) > 86400 {
            Task { await refreshAverages() }
        }

        registerObserver(for: HKQuantityType(.heartRate)) { [weak self] in
            await self?.handleHeartRateUpdate()
        }

        registerObserver(for: HKCategoryType(.sleepAnalysis)) { [weak self] in
            await self?.handleSleepUpdate()
        }

        registerObserver(for: HKQuantityType(.stepCount)) { [weak self] in
            self?.lastStepUpdate = Date()
        }

        registerObserver(for: HKWorkoutType.workoutType()) { [weak self] in
            await self?.handleWorkoutUpdate()
        }

        registerObserver(for: HKQuantityType(.heartRateVariabilitySDNN)) { [weak self] in
            await self?.handleHRVUpdate()
        }

        scheduleInactivityCheck()
    }

    func stopMonitoring() {
        for query in observerQueries {
            healthStore.stop(query)
        }
        observerQueries.removeAll()
        inactivityTimer?.invalidate()
        inactivityTimer = nil
    }

    // MARK: - Observer Registration

    private func registerObserver(for sampleType: HKSampleType, handler: @escaping @Sendable () async -> Void) {
        let query = HKObserverQuery(sampleType: sampleType, predicate: nil) { _, completionHandler, error in
            if let error {
                print("[TriggerEngine] Observer error for \(sampleType): \(error)")
                completionHandler()
                return
            }

            Task {
                await handler()
                completionHandler()
            }
        }

        healthStore.execute(query)
        observerQueries.append(query)
    }

    // MARK: - Trigger Handlers

    /// morning_sleep: first sleep data after 5am, once per day
    private func handleSleepUpdate() async {
        let hour = Calendar.current.component(.hour, from: Date())
        guard hour >= 5 && hour <= 9 else { return }
        guard !hasFiredMorningSleepToday else { return }

        guard let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else { return }

        let calendar = Calendar.current
        let now = Date()
        guard let yesterday = calendar.date(byAdding: .day, value: -1, to: now),
              let yesterday8PM = calendar.date(bySettingHour: 20, minute: 0, second: 0, of: yesterday),
              let today12PM = calendar.date(bySettingHour: 12, minute: 0, second: 0, of: now)
        else { return }

        let predicate = HKQuery.predicateForSamples(withStart: yesterday8PM, end: today12PM, options: .strictStartDate)

        let sleepData: (hours: Double, quality: String)? = await withCheckedContinuation { continuation in
            let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(
                sampleType: sleepType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, _ in
                guard let categorySamples = samples as? [HKCategorySample] else {
                    continuation.resume(returning: nil)
                    return
                }

                let asleepSamples = categorySamples.filter { sample in
                    let value = HKCategoryValueSleepAnalysis(rawValue: sample.value)
                    return value == .asleepCore || value == .asleepDeep || value == .asleepREM
                }

                guard !asleepSamples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }

                let totalSeconds = asleepSamples.reduce(0.0) { sum, sample in
                    sum + sample.endDate.timeIntervalSince(sample.startDate)
                }
                let hours = totalSeconds / 3600.0
                let quality = hours >= 7 ? "Bom" : (hours >= 5 ? "Regular" : "Ruim")
                continuation.resume(returning: (hours: hours, quality: quality))
            }
            healthStore.execute(query)
        }

        guard let data = sleepData else { return }

        hasFiredMorningSleepToday = true
        fireTrigger(type: "morning_sleep", payload: [
            "hours": data.hours,
            "quality": data.quality,
        ])
    }

    /// post_workout: workout ended within last 10 minutes
    private func handleWorkoutUpdate() async {
        let endDate: Date? = await withCheckedContinuation { continuation in
            let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(
                sampleType: HKWorkoutType.workoutType(),
                predicate: nil,
                limit: 1,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, _ in
                let date = (samples?.first as? HKWorkout)?.endDate
                continuation.resume(returning: date)
            }
            healthStore.execute(query)
        }

        guard let endDate, Date().timeIntervalSince(endDate) <= 600 else { return }

        // Also get workout details
        let workoutDetails: [String: Any] = await withCheckedContinuation { continuation in
            let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(
                sampleType: HKWorkoutType.workoutType(),
                predicate: nil,
                limit: 1,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, _ in
                guard let workout = samples?.first as? HKWorkout else {
                    continuation.resume(returning: [:])
                    return
                }
                let durationMin = Int(workout.duration / 60)
                let calories = workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()) ?? 0
                continuation.resume(returning: [
                    "durationMinutes": durationMin,
                    "calories": Int(calories),
                    "activityType": workout.workoutActivityType.rawValue,
                ])
            }
            healthStore.execute(query)
        }

        fireTrigger(type: "post_workout", payload: workoutDetails)
    }

    /// high_heart_rate: resting HR > 7-day average * 1.2
    private func handleHeartRateUpdate() async {
        guard avgRestingHR > 0 else { return }

        guard let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return }

        let latestHR: Double? = await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: heartRateType,
                quantitySamplePredicate: nil,
                options: .mostRecent
            ) { _, statistics, _ in
                let value = statistics?.mostRecentQuantity()?.doubleValue(
                    for: HKUnit.count().unitDivided(by: .minute())
                )
                continuation.resume(returning: value)
            }
            healthStore.execute(query)
        }

        guard let hr = latestHR else { return }
        let threshold = avgRestingHR * 1.2

        guard hr > threshold else { return }

        fireTrigger(type: "high_heart_rate", payload: [
            "currentBPM": Int(hr),
            "averageBPM": Int(avgRestingHR),
            "threshold": Int(threshold),
        ])
    }

    /// low_hrv: HRV < 7-day average * 0.7
    private func handleHRVUpdate() async {
        guard avgHRV > 0 else { return }

        guard let hrvType = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN) else { return }

        let latestHRV: Double? = await withCheckedContinuation { continuation in
            let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(
                sampleType: hrvType,
                predicate: nil,
                limit: 1,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, _ in
                let value = (samples?.first as? HKQuantitySample)?
                    .quantity.doubleValue(for: HKUnit.secondUnit(with: .milli))
                continuation.resume(returning: value)
            }
            healthStore.execute(query)
        }

        guard let hrv = latestHRV else { return }
        let threshold = avgHRV * 0.7

        guard hrv < threshold else { return }

        fireTrigger(type: "low_hrv", payload: [
            "currentHRV": Int(hrv),
            "averageHRV": Int(avgHRV),
            "threshold": Int(threshold),
        ])
    }

    /// inactivity: no step increase for 2h during 8am-10pm
    private func scheduleInactivityCheck() {
        inactivityTimer = Timer.scheduledTimer(withTimeInterval: 1800, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.checkInactivity()
            }
        }
    }

    private func checkInactivity() {
        let hour = Calendar.current.component(.hour, from: Date())
        guard hour >= 8 && hour < 22 else { return }

        let timeSinceLastStep = Date().timeIntervalSince(lastStepUpdate)
        if timeSinceLastStep >= 7200 { // 2 hours
            fireTrigger(type: "inactivity", payload: [
                "inactiveMinutes": Int(timeSinceLastStep / 60),
            ])
        }

        checkHydration(hour: hour)
    }

    private func checkHydration(hour: Int) {
        guard hour >= 7 && hour < 22 else { return }

        let timeSinceLastReminder = Date().timeIntervalSince(lastHydrationReminder)
        guard timeSinceLastReminder >= 5400 else { return } // 90 minutes

        lastHydrationReminder = Date()
        fireTrigger(type: "hydration_reminder", payload: [
            "minutesSinceLastReminder": Int(timeSinceLastReminder / 60),
        ])
    }

    // MARK: - Fire Trigger

    private func fireTrigger(type: String, payload: [String: Any]) {
        let notificationsEnabled = defaults.bool(forKey: "notificationsEnabled")
        guard notificationsEnabled else { return }

        Task {
            guard let token = await AuthService.shared?.getAccessToken() else {
                print("[TriggerEngine] No access token available, skipping trigger: \(type)")
                return
            }

            do {
                try await APIService.shared.sendHealthEvent(
                    triggerType: type,
                    payload: payload,
                    accessToken: token
                )
                print("[TriggerEngine] Fired trigger: \(type)")
            } catch {
                print("[TriggerEngine] Failed to send event \(type): \(error)")
            }
        }
    }

    // MARK: - Refresh 7-Day Averages

    func refreshAverages() async {
        await refreshAvgRestingHR()
        await refreshAvgHRV()
        lastAveragesRefresh = Date()
    }

    private func refreshAvgRestingHR() async {
        guard let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return }

        let calendar = Calendar.current
        guard let sevenDaysAgo = calendar.date(byAdding: .day, value: -7, to: Date()) else { return }
        let predicate = HKQuery.predicateForSamples(withStart: sevenDaysAgo, end: Date(), options: .strictStartDate)

        let avg: Double? = await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: heartRateType,
                quantitySamplePredicate: predicate,
                options: .discreteAverage
            ) { _, statistics, _ in
                let value = statistics?.averageQuantity()?.doubleValue(
                    for: HKUnit.count().unitDivided(by: .minute())
                )
                continuation.resume(returning: value)
            }
            healthStore.execute(query)
        }

        if let avg {
            avgRestingHR = avg
        }
    }

    private func refreshAvgHRV() async {
        guard let hrvType = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN) else { return }

        let calendar = Calendar.current
        guard let sevenDaysAgo = calendar.date(byAdding: .day, value: -7, to: Date()) else { return }
        let predicate = HKQuery.predicateForSamples(withStart: sevenDaysAgo, end: Date(), options: .strictStartDate)

        let avg: Double? = await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: hrvType,
                quantitySamplePredicate: predicate,
                options: .discreteAverage
            ) { _, statistics, _ in
                let value = statistics?.averageQuantity()?.doubleValue(
                    for: HKUnit.secondUnit(with: .milli)
                )
                continuation.resume(returning: value)
            }
            healthStore.execute(query)
        }

        if let avg {
            avgHRV = avg
        }
    }
}
