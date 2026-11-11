/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`monitoring-mock.ts` kho mẫu, `monitoring-http.ts` backend).
 *   fetchMonitoringBoard    GET   /api/dispatcher/dashboard
 *   listTripMonitoring      GET   /api/trips/monitoring
 *   fetchLiveTrip           GET   /api/trips/{id}/monitoring · GET /api/dispatcher/dashboard (chuyến đã thôi chạy: GET /api/trips/{id}/detail)
 *   reportTripException     POST  /api/trips/{id}/exceptions
 *   escalateTripException   POST  /api/trips/{id}/exceptions/{eid}/escalate
 *   resolveTripException    POST  /api/trips/{id}/exceptions/{eid}/resolve
 *   requestReroute          POST  /api/trips/{id}/reroute
 *   confirmReroute          POST  /api/trips/{id}/reroute/{routeIndex}/confirm
 *   fetchTripRequirements   GET   /api/delivery-requirements · GET /api/trips/{id}/detail
 *   renegotiateDeadline     POST  /api/trips/{id}/exceptions/{eid}/renegotiate
 *   fetchPickupRows         GET   /api/trips/{id}/pickup-requests
 *   createPickupRequest     POST  /api/trips/{id}/pickup-requests
 *   validatePickupRequest   POST  /api/trips/{id}/pickup-requests/{pid}/validate
 *   approvePickupRequest    POST  /api/trips/{id}/pickup-requests/{pid}/approve
 *   rejectPickupRequest     POST  /api/trips/{id}/pickup-requests/{pid}/reject
 *   chưa có ở BE: fetchNotifications (chuông của văn phòng)
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

import { httpMonitoringApi } from './monitoring-http'
import { mockMonitoringApi } from './monitoring-mock'
import type {
  LiveMonitoring,
  LiveTrip,
  MonitoringBoard,
  MonitoringCapabilities,
  OfficeNotification,
  RenegotiableRequirement,
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
  RenegotiableRequirement,
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
  fetchTripRequirements(tripId: string): Promise<RenegotiableRequirement[]>
  renegotiateDeadline(tripId: string, exceptionId: string, input: DeadlineRenegotiationInput): Promise<void>
  fetchPickupRows(tripId: string): Promise<PickupRow[]>
  createPickupRequest(tripId: string, input: PickupRequestInput): Promise<PickupRequestResult>
  validatePickupRequest(tripId: string, pickupId: string): Promise<PickupRequest>
  approvePickupRequest(tripId: string, pickupId: string, input: PickupApproveInput): Promise<PickupApprovalResult>
  rejectPickupRequest(tripId: string, pickupId: string, reason: string): Promise<void>
  fetchNotifications(): Promise<OfficeNotification[]>
}

const adapter = createAdapter<MonitoringApi>('monitoring', { mock: mockMonitoringApi, http: () => httpMonitoringApi() })

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

// GET /api/trips/{id}/monitoring
export function fetchLiveTrip(tripId: string): Promise<LiveTrip> {
  return adapter().fetchLiveTrip(tripId)
}

// POST /api/trips/{id}/exceptions
export function reportTripException(tripId: string, input: TripExceptionInput): Promise<{ readonly id: string }> {
  return adapter().reportTripException(tripId, input)
}

// POST /api/trips/{id}/exceptions/{eid}/escalate
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

// GET /api/delivery-requirements · GET /api/trips/{id}/detail
export function fetchTripRequirements(tripId: string): Promise<RenegotiableRequirement[]> {
  return adapter().fetchTripRequirements(tripId)
}

// POST /api/trips/{id}/exceptions/{eid}/renegotiate
export function renegotiateDeadline(tripId: string, exceptionId: string, input: DeadlineRenegotiationInput): Promise<void> {
  return adapter().renegotiateDeadline(tripId, exceptionId, input)
}

// GET /api/trips/{id}/pickup-requests
export function fetchPickupRows(tripId: string): Promise<PickupRow[]> {
  return adapter().fetchPickupRows(tripId)
}

// POST /api/trips/{id}/pickup-requests
export function createPickupRequest(tripId: string, input: PickupRequestInput): Promise<PickupRequestResult> {
  return adapter().createPickupRequest(tripId, input)
}

// POST /api/trips/{id}/pickup-requests/{pid}/validate
export function validatePickupRequest(tripId: string, pickupId: string): Promise<PickupRequest> {
  return adapter().validatePickupRequest(tripId, pickupId)
}

// POST /api/trips/{id}/pickup-requests/{pid}/approve
export function approvePickupRequest(tripId: string, pickupId: string, input: PickupApproveInput): Promise<PickupApprovalResult> {
  return adapter().approvePickupRequest(tripId, pickupId, input)
}

// POST /api/trips/{id}/pickup-requests/{pid}/reject
export function rejectPickupRequest(tripId: string, pickupId: string, reason: string): Promise<void> {
  return adapter().rejectPickupRequest(tripId, pickupId, reason)
}

// chưa có ở BE
export function fetchNotifications(): Promise<OfficeNotification[]> {
  return adapter().fetchNotifications()
}
