/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`driver-mock.ts` kho mẫu, `driver-http.ts` backend).
 *   fetchMyTrips          GET  /api/driver/trips
 *   fetchTripScreen       GET  /api/driver/trips/{id}/current-stop
 *   confirmUnload         POST /api/driver/packages/{id}/unload
 *   completeStop          POST /api/driver/stops/{id}/complete
 *   postLocation          POST /api/driver/location
 *   reportTripException   POST /api/trips/{id}/exceptions (tài xế chưa có quyền ở BE)
 *   chưa có ở BE: startDelivery, arriveAtStop, confirmUnloadManually, reportDeliveryIssue, setDriverGps, fetchNotifications
 */
import { createAdapter } from '@/data/adapter'

import type {
  DeliveryIssueRequest,
  DriverCapabilities,
  DriverNotification,
  DriverTrips,
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
  fetchTripScreen(tripId: string): Promise<DriverTripScreen>
  startDelivery(tripId: string): Promise<void>
  arriveAtStop(tripId: string, stop: StopKey): Promise<void>
  confirmUnload(tripId: string, input: VerifyCodeInput): Promise<RecordedItem>
  confirmUnloadManually(tripId: string, input: ManualConfirmRequest): Promise<RecordedItem>
  reportDeliveryIssue(tripId: string, input: DeliveryIssueRequest): Promise<void>
  completeStop(tripId: string, stop: StopKey): Promise<void>
  reportTripException(tripId: string, input: TripExceptionRequest): Promise<{ readonly id: string }>
  setDriverGps(tripId: string, enabled: boolean): Promise<void>
  postLocation(tripId: string, location: LocationRequest): Promise<{ readonly recordedAt: string }>
  fetchNotifications(): Promise<DriverNotification[]>
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

// GET /api/driver/trips/{id}/current-stop
export function fetchTripScreen(tripId: string): Promise<DriverTripScreen> {
  return adapter().fetchTripScreen(tripId)
}

// chưa có ở BE
export function startDelivery(tripId: string): Promise<void> {
  return adapter().startDelivery(tripId)
}

// chưa có ở BE
export function arriveAtStop(tripId: string, stop: StopKey): Promise<void> {
  return adapter().arriveAtStop(tripId, stop)
}

// POST /api/driver/packages/{id}/unload
export function confirmUnload(tripId: string, input: VerifyCodeInput): Promise<RecordedItem> {
  return adapter().confirmUnload(tripId, input)
}

// chưa có ở BE
export function confirmUnloadManually(tripId: string, input: ManualConfirmRequest): Promise<RecordedItem> {
  return adapter().confirmUnloadManually(tripId, input)
}

// chưa có ở BE
export function reportDeliveryIssue(tripId: string, input: DeliveryIssueRequest): Promise<void> {
  return adapter().reportDeliveryIssue(tripId, input)
}

// POST /api/driver/stops/{id}/complete
export function completeStop(tripId: string, stop: StopKey): Promise<void> {
  return adapter().completeStop(tripId, stop)
}

// POST /api/trips/{id}/exceptions
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

// chưa có ở BE
export function fetchNotifications(): Promise<DriverNotification[]> {
  return adapter().fetchNotifications()
}
