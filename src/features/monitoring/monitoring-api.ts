/**
 * Hàm → endpoint backend; nguồn hiện chỉ có kho mẫu (`monitoring-mock.ts`), feature chưa nối backend.
 *   fetchMonitoringBoard    GET   /api/dispatcher/dashboard
 *   listTripMonitoring      GET   /api/trips/monitoring
 *   fetchLiveTrip           GET   /api/trips/monitoring (một chuyến; chuyến đã thôi chạy: chưa có ở BE)
 *   reportTripException     POST  /api/trips/{id}/exceptions
 *   resolveTripException    POST  /api/trips/{id}/exceptions/{eid}/resolve
 *   requestReroute          POST  /api/trips/{id}/reroute
 *   confirmReroute          POST  /api/trips/{id}/reroute/{routeIndex}/confirm
 *   renegotiateDeadline     PATCH /api/delivery-requirements/{id} (ghi "đã liên hệ khách": chưa có ở BE)
 *   createPickupRequest     POST  /api/trips/{id}/pickup-requests
 *   validatePickupRequest   GET   /api/trips/{id}/pickup-requests/{pid}/validate
 *   approvePickupRequest    POST  /api/trips/{id}/pickup-requests/{pid}/approve
 *   chưa có ở BE: escalateTripException, fetchTripRequirements, fetchPickupRows, rejectPickupRequest, fetchNotifications
 */
import { createAdapter } from '@/data/adapter'
import type { PickupApprovalResult, PickupRequestResult, PickupRow } from '@/features/pickups/pickup-model'
import type {
  DeadlineRenegotiationInput,
  PickupApproveInput,
  PickupRequest,
  PickupRequestInput,
  RerouteProposal,
  TripExceptionInput,
} from '@/lib/mock-db'

import { mockMonitoringApi } from './monitoring-mock'
import type {
  LiveMonitoring,
  LiveTrip,
  MonitoringBoard,
  MonitoringCapabilities,
  OfficeNotification,
  TripRequirementRow,
} from './monitoring-model'

/** Lớp dữ liệu của màn giám sát (điều phối viên, quản lý công ty), sự cố cấp chuyến, nhận hàng dọc đường và chuông của hai vai trò đó. */
export type {
  LiveMonitoring,
  LiveTrip,
  MonitoringBoard,
  MonitoringCapabilities,
  MonitoringStop,
  MonitoringTrip,
  OfficeNotification,
  TripRequirementRow,
} from './monitoring-model'

/**
 * Hợp đồng dữ liệu của màn giám sát. Màn và hook chỉ biết hợp đồng này, không biết nguồn. Việc nguồn chưa làm được thì `capabilities`
 * nói rõ để màn ẩn nút đó.
 */
export type MonitoringApi = {
  readonly capabilities: MonitoringCapabilities
  fetchMonitoringBoard(): Promise<MonitoringBoard>
  listTripMonitoring(): Promise<LiveMonitoring[]>
  fetchLiveTrip(tripId: string): Promise<LiveTrip>
  reportTripException(tripId: string, input: TripExceptionInput): Promise<{ readonly id: string }>
  escalateTripException(tripId: string, exceptionId: string): Promise<void>
  resolveTripException(tripId: string, exceptionId: string, note: string | undefined): Promise<void>
  requestReroute(tripId: string): Promise<RerouteProposal>
  confirmReroute(tripId: string, routeIndex: number): Promise<void>
  fetchTripRequirements(tripId: string): Promise<TripRequirementRow[]>
  renegotiateDeadline(tripId: string, exceptionId: string, input: DeadlineRenegotiationInput): Promise<void>
  fetchPickupRows(tripId: string): Promise<PickupRow[]>
  createPickupRequest(tripId: string, input: PickupRequestInput): Promise<PickupRequestResult>
  validatePickupRequest(tripId: string, pickupId: string): Promise<PickupRequest>
  approvePickupRequest(tripId: string, pickupId: string, input: PickupApproveInput): Promise<PickupApprovalResult>
  rejectPickupRequest(tripId: string, pickupId: string, reason: string): Promise<void>
  fetchNotifications(): Promise<OfficeNotification[]>
}

const adapter = createAdapter<MonitoringApi>('monitoring', { mock: mockMonitoringApi })

/** Việc của màn giám sát làm được với nguồn đang dùng. */
export function monitoringCapabilities(): MonitoringCapabilities {
  return adapter().capabilities
}

// GET /api/dispatcher/dashboard
export function fetchMonitoringBoard(): Promise<MonitoringBoard> {
  return adapter().fetchMonitoringBoard()
}

// GET /api/trips/monitoring
export function listTripMonitoring(): Promise<LiveMonitoring[]> {
  return adapter().listTripMonitoring()
}

// GET /api/trips/monitoring
export function fetchLiveTrip(tripId: string): Promise<LiveTrip> {
  return adapter().fetchLiveTrip(tripId)
}

// POST /api/trips/{id}/exceptions
export function reportTripException(tripId: string, input: TripExceptionInput): Promise<{ readonly id: string }> {
  return adapter().reportTripException(tripId, input)
}

// chưa có ở BE
export function escalateTripException(tripId: string, exceptionId: string): Promise<void> {
  return adapter().escalateTripException(tripId, exceptionId)
}

// POST /api/trips/{id}/exceptions/{eid}/resolve
export function resolveTripException(tripId: string, exceptionId: string, note: string | undefined): Promise<void> {
  return adapter().resolveTripException(tripId, exceptionId, note)
}

// POST /api/trips/{id}/reroute
export function requestReroute(tripId: string): Promise<RerouteProposal> {
  return adapter().requestReroute(tripId)
}

// POST /api/trips/{id}/reroute/{routeIndex}/confirm
export function confirmReroute(tripId: string, routeIndex: number): Promise<void> {
  return adapter().confirmReroute(tripId, routeIndex)
}

// chưa có ở BE
export function fetchTripRequirements(tripId: string): Promise<TripRequirementRow[]> {
  return adapter().fetchTripRequirements(tripId)
}

// PATCH /api/delivery-requirements/{id}
export function renegotiateDeadline(tripId: string, exceptionId: string, input: DeadlineRenegotiationInput): Promise<void> {
  return adapter().renegotiateDeadline(tripId, exceptionId, input)
}

// chưa có ở BE
export function fetchPickupRows(tripId: string): Promise<PickupRow[]> {
  return adapter().fetchPickupRows(tripId)
}

// POST /api/trips/{id}/pickup-requests
export function createPickupRequest(tripId: string, input: PickupRequestInput): Promise<PickupRequestResult> {
  return adapter().createPickupRequest(tripId, input)
}

// GET /api/trips/{id}/pickup-requests/{pid}/validate
export function validatePickupRequest(tripId: string, pickupId: string): Promise<PickupRequest> {
  return adapter().validatePickupRequest(tripId, pickupId)
}

// POST /api/trips/{id}/pickup-requests/{pid}/approve
export function approvePickupRequest(tripId: string, pickupId: string, input: PickupApproveInput): Promise<PickupApprovalResult> {
  return adapter().approvePickupRequest(tripId, pickupId, input)
}

// chưa có ở BE
export function rejectPickupRequest(tripId: string, pickupId: string, reason: string): Promise<void> {
  return adapter().rejectPickupRequest(tripId, pickupId, reason)
}

// chưa có ở BE
export function fetchNotifications(): Promise<OfficeNotification[]> {
  return adapter().fetchNotifications()
}
