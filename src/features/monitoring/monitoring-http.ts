import { api, ApiError, type ApiClient } from '@/data/http'
import { readTripDetail } from '@/features/trips/trips-http'
import { serverDetailOf } from '@/features/trips/trips-http-mapping'
import type { ServerTripDetail } from '@/features/trips/trips-model'
import { backendLocalDateTime, notSupported, readAllPages, withStatusCode } from '@/lib/office-backend'

import type { MonitoringApi } from './monitoring-api'
import type {
  DeliveryRequirementDto,
  MonitoringBoardDto,
  RequirementStopDto,
  RerouteProposalDto,
  TripExceptionDto,
  TripMonitoringDto,
  TripRerouteDto,
} from './monitoring-http-dto'
import { boardOf, confirmedRerouteOf, exceptionOf, liveOf, proposalOf, renegotiableOf } from './monitoring-http-mapping'
import type { MonitoringTrip } from './monitoring-model'

/*
 * Nguồn backend của màn giám sát (điều phối viên, quản lý công ty), như `monitoring-backend-api.ts` của web. Mã chuyến (`tripCode`) là mã
 * trên đường dẫn; endpoint giám sát nhận cả mã chuyến lẫn mã số. Giờ đến máy chủ tính không mang MOCK RESULT. Máy chủ chưa có nhận hàng
 * dọc đường ở màn này và chưa có chuông cho văn phòng: `pickups`, `notifications` tắt, hàm của chúng từ chối `NOT_SUPPORTED`.
 */

const tripPath = (tripId: string) => `/api/trips/${encodeURIComponent(tripId)}`
const exceptionPath = (tripId: string, exceptionId: string) => `${tripPath(tripId)}/exceptions/${encodeURIComponent(exceptionId)}`

/** Đầu chuyến cho màn giám sát một chuyến đã thôi chạy (không còn trên bảng): đọc từ chi tiết chuyến. */
function headOf(detail: ServerTripDetail): MonitoringTrip {
  const { depot } = detail
  return {
    tripId: detail.id,
    // Như bảng giám sát: chuyến không có tên riêng thì không nhắc lại mã
    name: detail.name === detail.id ? '' : detail.name,
    vehicleName: detail.vehicleName,
    driverName: detail.driverName,
    ...(depot?.lat !== undefined && depot.lng !== undefined ? { depot: { name: depot.name, lat: depot.lat, lng: depot.lng } } : {}),
    stops: detail.stops.map((stop) => ({
      id: stop.id,
      number: stop.number,
      name: stop.name,
      ...(stop.kind === 'PICKUP' ? { kind: 'PICKUP' as const } : {}),
      ...(stop.lat !== undefined && stop.lng !== undefined ? { lat: stop.lat, lng: stop.lng } : {}),
      ...(stop.actualArrival !== undefined && stop.status !== 'PENDING' ? { arrivedAt: stop.actualArrival } : {}),
      ...(stop.actualArrival !== undefined && stop.status === 'COMPLETED' ? { completedAt: stop.actualArrival } : {}),
    })),
  }
}

export function httpMonitoringApi({ client = api }: { readonly client?: () => ApiClient } = {}): MonitoringApi {
  const fetchMonitoringBoard = async () => boardOf(await client().get<MonitoringBoardDto | null>('/api/dispatcher/dashboard'))
  return {
    capabilities: { exceptions: true, reroute: true, escalation: true, pickups: false, notifications: false },
    fetchMonitoringBoard,
    async listTripMonitoring() {
      return ((await client().get<readonly TripMonitoringDto[] | null>('/api/trips/monitoring')) ?? []).map(liveOf)
    },
    async fetchLiveTrip(tripId) {
      const [board, live] = await Promise.all([
        fetchMonitoringBoard(),
        withStatusCode(client().get<TripMonitoringDto>(`${tripPath(tripId)}/monitoring`), { 404: 'TRIP_NOT_FOUND' }),
      ])
      const wanted = tripId.toLowerCase()
      const onBoard = board.trips.find((trip) => trip.tripId.toLowerCase() === wanted)
      const trip = onBoard ?? headOf(serverDetailOf(await readTripDetail(client(), tripId)))
      return { trip, running: onBoard !== undefined, userNames: board.userNames, live: liveOf(live) }
    },
    async reportTripException(tripId, input) {
      const body = { type: input.type, description: input.description, delayMinutes: input.delayMinutes }
      // Form đã kiểm như backend: 400 ở đây là chuyến không còn đang vận chuyển
      const dto = await withStatusCode(client().post<TripExceptionDto>(`${tripPath(tripId)}/exceptions`, { body }), { 400: 'GPS_TRIP_NOT_IN_TRANSIT' })
      return { id: exceptionOf(dto).id }
    },
    async escalateTripException(tripId, exceptionId) {
      await withStatusCode(client().post<TripExceptionDto>(`${exceptionPath(tripId, exceptionId)}/escalate`), { 404: 'TRIP_EXCEPTION_NOT_FOUND' })
    },
    async resolveTripException(tripId, exceptionId, note) {
      const body = note === undefined ? {} : { note }
      await withStatusCode(client().post<TripExceptionDto>(`${exceptionPath(tripId, exceptionId)}/resolve`, { body }), { 404: 'TRIP_EXCEPTION_NOT_FOUND' })
    },
    async requestReroute(tripId) {
      // 400 có hai nghĩa (chuyến không còn chạy, xe chưa có vị trí): giữ lỗi chung
      return proposalOf(await withStatusCode(client().post<RerouteProposalDto>(`${tripPath(tripId)}/reroute`), { 404: 'NO_PENDING_DELIVERY_STOP' }))
    },
    async confirmReroute(tripId, routeIndex) {
      const request = client().post<TripRerouteDto>(`${tripPath(tripId)}/reroute/${routeIndex}/confirm`)
      confirmedRerouteOf(await withStatusCode(request, { 400: 'INVALID_REROUTE_INDEX' }))
    },
    async fetchTripRequirements(tripId) {
      // Máy chủ chưa lọc yêu cầu giao theo chuyến: đọc đủ rồi giữ dòng của chuyến; mã số của chuyến lấy từ chính các dòng đó
      const wanted = tripId.toLowerCase()
      const rows = (await readAllPages<DeliveryRequirementDto>(client(), '/api/delivery-requirements')).filter(
        (dto) => dto.tripCode?.toLowerCase() === wanted || (dto.tripId !== null && dto.tripId !== undefined && String(dto.tripId) === tripId),
      )
      const numericId = rows.find((dto) => dto.tripId !== null && dto.tripId !== undefined)?.tripId
      if (numericId === null || numericId === undefined) return []
      const detail = await client().get<{ readonly stops?: readonly RequirementStopDto[] | null } | null>(
        `/api/trips/${encodeURIComponent(String(numericId))}/detail`,
      )
      return renegotiableOf(rows, detail?.stops ?? [])
    },
    async renegotiateDeadline(tripId, exceptionId, input) {
      const requirementId = Number(input.requirementId)
      if (!Number.isInteger(requirementId)) throw new ApiError('DELIVERY_REQUIREMENT_NOT_FOUND')
      const body = { requirementId, newDeadline: backendLocalDateTime(input.deadline), contactNote: input.contactNote }
      await withStatusCode(client().post<TripExceptionDto>(`${exceptionPath(tripId, exceptionId)}/renegotiate`, { body }), { 404: 'TRIP_EXCEPTION_NOT_FOUND' })
    },
    fetchPickupRows: notSupported,
    createPickupRequest: notSupported,
    validatePickupRequest: notSupported,
    approvePickupRequest: notSupported,
    rejectPickupRequest: notSupported,
    fetchNotifications: notSupported,
  }
}
