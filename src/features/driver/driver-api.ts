/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`driver-mock.ts` kho mẫu, `driver-http.ts` backend).
 *   fetchMyTrips            GET  /api/driver/trips
 *   fetchTripScreen         GET  /api/driver/trips/{id}/current-stop (+ GET /api/trips/{id}/route-plans/active)
 *   startDelivery           POST /api/driver/trips/{id}/start
 *   arriveAtStop            POST /api/driver/stops/{id}/arrive
 *   confirmUnload           POST /api/driver/packages/{id}/unload
 *   confirmUnloadManually   POST /api/driver/packages/{id}/manual-unload
 *   reportDeliveryIssue     POST /api/driver/packages/{id}/issues
 *   completeStop            POST /api/driver/stops/{id}/complete
 *   postLocation            POST /api/driver/location
 *   reportTripException     POST /api/driver/trips/{id}/exceptions
 *   fetchNotifications      GET  /api/notifications
 *   markNotificationsRead   POST /api/notifications/read
 *   fetchOpenTrips          GET  /api/driver/open-trips
 *   claimTrip               POST /api/driver/trips/{id}/claim
 *   cancelClaim             POST /api/driver/trips/{id}/claim/cancel
 *   chưa có ở BE: setDriverGps
 */
import { createAdapter } from '@/data/adapter'

import type {
  DeliveryIssueRequest,
  DriverCapabilities,
  DriverNotification,
  DriverPayrollStatement,
  DriverTripDetail,
  DriverTripException,
  DriverTrips,
  CompleteStopResult,
  DriverTripScreen,
  LocationRequest,
  ManualConfirmRequest,
  RecordedItem,
  StopKey,
  TripExceptionRequest,
  VerifyCodeInput,
} from './driver-model'
import { httpDriverApi } from './driver-http'
import { mockDriverApi } from './driver-mock'

/**
 * Hợp đồng dữ liệu của màn tài xế. Màn và hook chỉ biết hợp đồng này, không biết nguồn. Việc nguồn chưa làm được thì `capabilities` nói
 * rõ để màn ẩn nút đó; gọi một hàm mà nguồn không có là lỗi `NOT_SUPPORTED`, không âm thầm bỏ qua.
 */
export type DriverApi = {
  readonly capabilities: DriverCapabilities
  fetchMyTrips(): Promise<DriverTrips>
  fetchPayroll(period: string): Promise<DriverPayrollStatement>
  fetchTripDetail(tripId: string): Promise<DriverTripDetail>
  fetchTripScreen(tripId: string): Promise<DriverTripScreen>
  startDelivery(tripId: string): Promise<void>
  arriveAtStop(tripId: string, stop: StopKey): Promise<void>
  confirmUnload(tripId: string, input: VerifyCodeInput): Promise<RecordedItem>
  confirmUnloadManually(tripId: string, input: ManualConfirmRequest): Promise<RecordedItem>
  reportDeliveryIssue(tripId: string, input: DeliveryIssueRequest): Promise<void>
  completeStop(tripId: string, stop: StopKey): Promise<CompleteStopResult>
  fetchTripExceptions(tripId: string): Promise<DriverTripException[]>
  reportTripException(tripId: string, input: TripExceptionRequest): Promise<{ readonly id: string }>
  setDriverGps(tripId: string, enabled: boolean): Promise<void>
  postLocation(tripId: string, location: LocationRequest): Promise<{ readonly recordedAt: string }>
  fetchNotifications(): Promise<DriverNotification[]>
  /** Đánh dấu đã đọc ở nguồn giữ "đã đọc" (máy chủ: thông báo mang `read`); trả danh sách mới. Kho mẫu không giữ: `NOT_SUPPORTED`. */
  markNotificationsRead(ids: readonly string[]): Promise<DriverNotification[]>
  fetchOpenTrips(): Promise<import('./driver-model').OpenTrip[]>
  claimTrip(tripId: string, note?: string): Promise<import('./driver-model').DriverTripClaim>
  cancelClaim(tripId: string): Promise<import('./driver-model').DriverTripClaim>
}

const adapter = createAdapter<DriverApi>('driver', { mock: mockDriverApi, http: () => httpDriverApi() })

/** Việc tài xế làm được với nguồn đang dùng. */
export function driverCapabilities(): DriverCapabilities {
  return adapter().capabilities
}

// GET /api/driver/trips
export function fetchMyTrips(): Promise<DriverTrips> {
  return adapter().fetchMyTrips()
}

// GET /api/driver/payroll?period=YYYY-MM
export function fetchPayroll(period: string): Promise<DriverPayrollStatement> {
  return adapter().fetchPayroll(period)
}

// GET /api/driver/trips/{id}/detail
export function fetchTripDetail(tripId: string): Promise<DriverTripDetail> {
  return adapter().fetchTripDetail(tripId)
}

// GET /api/driver/trips/{id}/current-stop
export function fetchTripScreen(tripId: string): Promise<DriverTripScreen> {
  return adapter().fetchTripScreen(tripId)
}

// POST /api/driver/trips/{id}/start
export function startDelivery(tripId: string): Promise<void> {
  return adapter().startDelivery(tripId)
}

// POST /api/driver/stops/{id}/arrive
export function arriveAtStop(tripId: string, stop: StopKey): Promise<void> {
  return adapter().arriveAtStop(tripId, stop)
}

// POST /api/driver/packages/{id}/unload
export function confirmUnload(tripId: string, input: VerifyCodeInput): Promise<RecordedItem> {
  return adapter().confirmUnload(tripId, input)
}

// POST /api/driver/packages/{id}/manual-unload
export function confirmUnloadManually(tripId: string, input: ManualConfirmRequest): Promise<RecordedItem> {
  return adapter().confirmUnloadManually(tripId, input)
}

// POST /api/driver/packages/{id}/issues
export function reportDeliveryIssue(tripId: string, input: DeliveryIssueRequest): Promise<void> {
  return adapter().reportDeliveryIssue(tripId, input)
}

// POST /api/driver/stops/{id}/complete
export function completeStop(tripId: string, stop: StopKey): Promise<CompleteStopResult> {
  return adapter().completeStop(tripId, stop)
}

// GET /api/driver/trips/{id}/exceptions
export function fetchTripExceptions(tripId: string): Promise<DriverTripException[]> {
  return adapter().fetchTripExceptions(tripId)
}

// POST /api/driver/trips/{id}/exceptions
export function reportTripException(tripId: string, input: TripExceptionRequest): Promise<{ readonly id: string }> {
  return adapter().reportTripException(tripId, input)
}

// chưa có ở BE
export function setDriverGps(tripId: string, enabled: boolean): Promise<void> {
  return adapter().setDriverGps(tripId, enabled)
}

// POST /api/driver/location
export function postLocation(tripId: string, location: LocationRequest): Promise<{ readonly recordedAt: string }> {
  return adapter().postLocation(tripId, location)
}

// GET /api/notifications
export function fetchNotifications(): Promise<DriverNotification[]> {
  return adapter().fetchNotifications()
}

// POST /api/notifications/read
export function markNotificationsRead(ids: readonly string[]): Promise<DriverNotification[]> {
  return adapter().markNotificationsRead(ids)
}

// GET /api/driver/open-trips
export function fetchOpenTrips(): Promise<import('./driver-model').OpenTrip[]> {
  return adapter().fetchOpenTrips()
}

// POST /api/driver/trips/{id}/claim
export function claimTrip(tripId: string, note?: string): Promise<import('./driver-model').DriverTripClaim> {
  return adapter().claimTrip(tripId, note)
}

// POST /api/driver/trips/{id}/claim/cancel
export function cancelClaim(tripId: string): Promise<import('./driver-model').DriverTripClaim> {
  return adapter().cancelClaim(tripId)
}
