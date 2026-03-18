import SwiftUI
import Combine
import HealthKit

final class HealthKitService: ObservableObject {
    @Published var authorizationStatus: HKAuthorizationRequestStatus = .unknown
    @Published var latestHeartRate: Double?
    @Published var latestHRV: Double?
    @Published var todaySteps: Int?
    @Published var lastSleepHours: Double?
    @Published var lastSleepQuality: String?  // "Bom"/"Regular"/"Ruim"
    @Published var lastWorkoutEndDate: Date?

    var isAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    private let healthStore = HKHealthStore()

    private let readTypes: Set<HKObjectType> = {
        var types = Set<HKObjectType>()
        if let heartRate = HKQuantityType.quantityType(forIdentifier: .heartRate) {
            types.insert(heartRate)
        }
        if let hrv = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN) {
            types.insert(hrv)
        }
        if let steps = HKQuantityType.quantityType(forIdentifier: .stepCount) {
            types.insert(steps)
        }
        if let sleep = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) {
            types.insert(sleep)
        }
        types.insert(HKObjectType.workoutType())
        return types
    }()

    func requestAuthorization() async throws {
        guard isAvailable else { return }
        try await healthStore.requestAuthorization(toShare: [], read: readTypes)
        await checkAuthorizationStatus()
    }

    func checkAuthorizationStatus() async {
        guard isAvailable else { return }
        do {
            let status = try await healthStore.statusForAuthorizationRequest(toShare: [], read: readTypes)
            authorizationStatus = status
        } catch {
            authorizationStatus = .unknown
        }
    }

    // MARK: - Data Fetching

    func refreshAll() async {
        guard isAvailable else { return }
        async let hr: Void = fetchLatestHeartRate()
        async let hrv: Void = fetchLatestHRV()
        async let steps: Void = fetchTodaySteps()
        async let sleep: Void = fetchLastNightSleep()
        async let workout: Void = fetchLastWorkout()
        _ = await (hr, hrv, steps, sleep, workout)
    }

    func fetchLatestHeartRate() async {
        guard let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return }
        let result: Double? = await withCheckedContinuation { continuation in
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
        latestHeartRate = result
    }

    func fetchLatestHRV() async {
        guard let hrvType = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN) else { return }
        let result: Double? = await withCheckedContinuation { continuation in
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
        latestHRV = result
    }

    func fetchTodaySteps() async {
        guard let stepsType = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: Date(), options: .strictStartDate)

        let result: Int? = await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: stepsType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, statistics, _ in
                let value = statistics?.sumQuantity()?.doubleValue(for: .count())
                continuation.resume(returning: value.map { Int($0) })
            }
            healthStore.execute(query)
        }
        todaySteps = result
    }

    func fetchLastNightSleep() async {
        guard let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else { return }

        let calendar = Calendar.current
        let now = Date()
        guard let yesterday = calendar.date(byAdding: .day, value: -1, to: now),
              let yesterday8PM = calendar.date(bySettingHour: 20, minute: 0, second: 0, of: yesterday),
              let today12PM = calendar.date(bySettingHour: 12, minute: 0, second: 0, of: now)
        else { return }

        let predicate = HKQuery.predicateForSamples(withStart: yesterday8PM, end: today12PM, options: .strictStartDate)

        let result: (hours: Double, quality: String)? = await withCheckedContinuation { continuation in
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

                let quality: String
                if hours >= 7 {
                    quality = "Bom"
                } else if hours >= 5 {
                    quality = "Regular"
                } else {
                    quality = "Ruim"
                }

                continuation.resume(returning: (hours: hours, quality: quality))
            }
            healthStore.execute(query)
        }

        lastSleepHours = result?.hours
        lastSleepQuality = result?.quality
    }

    func fetchLastWorkout() async {
        let result: Date? = await withCheckedContinuation { continuation in
            let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(
                sampleType: HKObjectType.workoutType(),
                predicate: nil,
                limit: 1,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, _ in
                let endDate = (samples?.first as? HKWorkout)?.endDate
                continuation.resume(returning: endDate)
            }
            healthStore.execute(query)
        }
        lastWorkoutEndDate = result
    }

    // MARK: - Background Delivery

    func setupBackgroundDelivery() {
        guard isAvailable else { return }

        if let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) {
            healthStore.enableBackgroundDelivery(for: heartRateType, frequency: .immediate) { _, error in
                if let error {
                    print("[HealthKit] Background delivery error (heartRate): \(error)")
                }
            }
        }

        let workoutType = HKObjectType.workoutType()
        healthStore.enableBackgroundDelivery(for: workoutType, frequency: .immediate) { _, error in
            if let error {
                print("[HealthKit] Background delivery error (workout): \(error)")
            }
        }
    }
}
