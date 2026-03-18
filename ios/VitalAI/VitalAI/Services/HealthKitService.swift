import SwiftUI
import Combine
import HealthKit

final class HealthKitService: ObservableObject {
    @Published var authorizationStatus: HKAuthorizationRequestStatus = .unknown

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
        types.insert(HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)!)
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
}
