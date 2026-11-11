import { api, ApiError, currentUserId, type ApiClient } from '@/data/http'

import type { DriverApi } from './driver-api'
import type { CompleteStopDto, CurrentStopDto, DriverTripDto, LocationPointDto, RoutePlanDetailDto } from './driver-http-dto'
import { myTripsOf, shownStatusOf, tripRowOf } from './driver-http-mapping'
import { deliveryPackageOf, isUnloaded, packageOfCode, stopScreenOf, withUnloaded } from './driver-http-stop'
import { coded, HTTP_DRIVER_CAPABILITIES, refused, unsupported } from './driver-http-support'
import type { DriverTripRow, DriverTripScreen, StopKey, TripHead } from './driver-model'

/*
 * Nguồn backend của màn tài xế (như `driver-backend-api.ts` của web): "Chuyến của tôi", xuất phát ở thẻ chuyến, "Đã đến", dỡ (quét / gõ mã
 * hoặc xác nhận tay), nhận kiện ở điểm nhận dọc đường, sự cố theo kiện, sự cố trên đường, hoàn tất điểm, vị trí điện thoại. Giờ đến và tiến
 * độ từng kiện đọc lại từ `current-stop` sau mỗi lệnh ghi; adapter chỉ giữ lần đọc gần nhất (để đổi mã quét được thành mã kiện), theo người
 * đang đăng nhập. Chưa có ở backend: yêu cầu nhận hàng của tài xế, xác nhận tay ở điểm nhận, thông báo — `capabilities` tắt, gọi tới là
 * `NOT_SUPPORTED`.
 *
 * Lỗi ném bằng `AppException` mang tên `ErrorCode` trong phong bì: mã có câu ở `backendErrors` thì giữ nguyên; vài mã đổi sang câu nêu mã
 * kiện hay tên điểm. Backend cũ trả lỗi không kèm mã: mỗi lệnh đọc theo mã HTTP.
 */

type Memory = {
  /** Chuyến của lần đọc danh sách gần nhất, theo mã dùng trên route. */
  readonly trips: Map<string, DriverTripRow>
  /** Điểm hiện tại của lần đọc gần nhất theo chuyến: để đổi mã quét được thành mã kiện. */
  readonly stops: Map<string, CurrentStopDto>
}

const emptyMemory = (): Memory => ({ trips: new Map(), stops: new Map() })

type HttpDriverDeps = {
  readonly client?: () => ApiClient
  readonly userId?: () => string | null
}

export function httpDriverApi({ client = api, userId = currentUserId }: HttpDriverDeps = {}): DriverApi {
  let owner: string | null = null
  let memory = emptyMemory()

  /** Lần đọc gần nhất thuộc về người đang đăng nhập: đổi người là quên hết. */
  function mine(): Memory {
    const id = userId()
    if (id !== owner) {
      owner = id
      memory = emptyMemory()
    }
    return memory
  }

  /** Endpoint của tài xế lọc theo mã tài xế ở tham số; không có thì backend trả chuyến của mọi tài xế — không bao giờ gọi thiếu. */
  function driverId(): string {
    const id = userId()
    if (id === null) throw new ApiError('UNAUTHENTICATED')
    return id
  }

  function headOf(tripId: string): TripHead {
    return { id: tripId, code: mine().trips.get(tripId)?.code ?? tripId, name: undefined }
  }

  const notInTransit = (tripId: string, status?: number) => new ApiError('TRIP_NOT_IN_TRANSIT', { status, params: { tripId: headOf(tripId).code } })

  // GET /api/driver/trips
  async function listTrips(): Promise<DriverTripDto[]> {
    const dtos = (await client().get<readonly DriverTripDto[] | null>('/api/driver/trips', { query: { driverId: driverId() } })) ?? []
    const { trips } = mine()
    trips.clear()
    for (const dto of dtos) {
      const status = shownStatusOf(dto)
      if (status !== undefined) trips.set(String(dto.tripId), tripRowOf(dto, status))
    }
    return [...dtos]
  }

  // GET /api/driver/trips/{id}/current-stop
  async function currentStop(tripId: string): Promise<CurrentStopDto> {
    const dto = await client().get<CurrentStopDto>(`/api/driver/trips/${encodeURIComponent(tripId)}/current-stop`)
    mine().stops.set(tripId, dto)
    return dto
  }

  /** Điểm `stop` theo lần đọc gần nhất; đọc lại khi chưa có hoặc điểm hiện tại đã khác. */
  async function stopOf(tripId: string, stop: StopKey): Promise<CurrentStopDto> {
    const cached = mine().stops.get(tripId)
    return cached !== undefined && String(cached.stopId) === stop.ref ? cached : currentStop(tripId)
  }

  // GET /api/trips/{id}/route-plans/active — bản đồ / chỉ dẫn; không có thì màn điểm giao vẫn mở, không vẽ tuyến
  async function activePlan(tripId: string): Promise<RoutePlanDetailDto | null> {
    try {
      return await client().get<RoutePlanDetailDto>(`/api/trips/${encodeURIComponent(tripId)}/route-plans/active`)
    } catch {
      return null
    }
  }

  /**
   * Chỉ mở chuyến có trong danh sách của chính tài xế (backend đọc điểm hiện tại của chuyến nào cũng được), nên đọc danh sách trước: chuyến
   * đã giao mở màn tổng kết (backend chưa có số liệu tổng kết); chuyến chưa rời kho, đã huỷ hay không còn của mình thì không mở.
   */
  async function fetchTripScreen(tripId: string): Promise<DriverTripScreen> {
    const dto = (await listTrips()).find((entry) => String(entry.tripId) === tripId)
    const trip = headOf(tripId)
    if (dto?.status === 'DELIVERED') return { kind: 'completed', trip, summary: undefined }
    if (dto?.status !== 'IN_TRANSIT') throw notInTransit(tripId)
    const plan = activePlan(tripId)
    let stop: CurrentStopDto
    try {
      stop = await currentStop(tripId)
    } catch (error) {
      // Chuyến vừa bị xoá ở máy chủ giữa hai lượt đọc
      if (coded(error, 'TRIP_NOT_FOUND')) throw notInTransit(tripId, 404)
      // Chuyến đang vận chuyển mà không còn điểm nào chưa hoàn tất: chuyến không có điểm giao
      if (refused(error, 404, 'NO_PENDING_DELIVERY_STOP')) return { kind: 'noStops', trip }
      throw error
    }
    return { kind: 'stop', trip, screen: stopScreenOf(stop, dto.stopCount ?? 0, await plan) }
  }

  return {
    capabilities: HTTP_DRIVER_CAPABILITIES,

    async fetchMyTrips() {
      return { groups: myTripsOf(await listTrips()), refreshMs: null }
    },

    fetchTripScreen,

    // POST /api/driver/trips/{id}/start
    async startDelivery(tripId) {
      try {
        await client().post(`/api/driver/trips/${encodeURIComponent(tripId)}/start`)
      } catch (error) {
        // Kho chưa xếp xong (thẻ đã mờ nút, nhưng kho có thể vừa mở lại phiên xếp)
        if (refused(error, 409, 'LOADING_NOT_COMPLETED')) throw new ApiError('LOADING_NOT_COMPLETED', { status: 409 })
        throw error
      }
    },

    // POST /api/driver/stops/{id}/arrive
    async arriveAtStop(tripId, stop) {
      try {
        await client().post(`/api/driver/stops/${encodeURIComponent(stop.ref)}/arrive`)
      } catch (error) {
        // Đã báo đến từ trước (máy khác, hoặc lượt bấm trước mất phản hồi): lần đọc lại mang giờ đến của máy chủ
        if (coded(error, 'DELIVERY_STOP_ALREADY_ARRIVED')) return
        if (refused(error, 400, 'GPS_TRIP_NOT_IN_TRANSIT') || coded(error, 'TRIP_NOT_FOUND')) throw notInTransit(tripId, error.status)
        throw error
      }
    },

    // POST /api/driver/packages/{id}/unload — điểm nhận: POST /api/driver/pickup-packages/{id}/pick
    async confirmUnload(tripId, { stop, code }) {
      const dto = await stopOf(tripId, stop)
      const pkg = packageOfCode(dto, code)
      if (pkg.kind === 'unknown') throw new ApiError('PACKAGE_CODE_UNKNOWN', { params: { code: code.trim() } })
      if (pkg.kind === 'ambiguous') throw new ApiError('UNLOAD_CODE_AMBIGUOUS', { params: { code: code.trim(), count: pkg.count } })
      const { packageId, label } = pkg
      if (pkg.pickup) {
        if (isUnloaded(dto, packageId)) throw new ApiError('PICKUP_PACKAGE_ALREADY_PICKED', { status: 409 })
        await client().post(`/api/driver/pickup-packages/${packageId}/pick`)
      } else {
        if (isUnloaded(dto, packageId)) throw new ApiError('PACKAGE_ALREADY_UNLOADED', { params: { code: label } })
        try {
          await client().post(`/api/driver/packages/${packageId}/unload`, { query: { driverId: driverId() } })
        } catch (error) {
          // Đã dỡ ở máy khác sau lần đọc gần nhất: lần đọc lại (sau mỗi lệnh ghi) cho thấy kiện đã dỡ
          if (refused(error, 409, 'DUPLICATE_UNLOAD')) throw new ApiError('PACKAGE_ALREADY_UNLOADED', { status: 409, params: { code: label } })
          if (refused(error, 400, 'WRONG_DELIVERY_STOP')) throw new ApiError('PACKAGE_NOT_AT_STOP', { status: 400, params: { code: label } })
          throw error
        }
      }
      // Lần gõ kế tiếp trước khi màn đọc lại điểm cũng thấy kiện này đã xong
      mine().stops.set(tripId, withUnloaded(dto, packageId))
      return { id: String(packageId) }
    },

    // POST /api/driver/packages/{id}/manual-unload
    async confirmUnloadManually(tripId, { stop, itemId, reason, note }) {
      const pkg = deliveryPackageOf(await stopOf(tripId, stop), itemId)
      // Kiện nhận ở điểm nhận: backend chưa có xác nhận tay
      if (pkg === undefined) throw new ApiError('NOT_SUPPORTED')
      try {
        await client().post(`/api/driver/packages/${pkg.packageId}/manual-unload`, { body: { reason, note: note ?? null } })
      } catch (error) {
        if (coded(error, 'DUPLICATE_UNLOAD')) throw new ApiError('PACKAGE_ALREADY_UNLOADED', { status: error.status, params: { code: pkg.label } })
        if (coded(error, 'WRONG_DELIVERY_STOP')) throw new ApiError('PACKAGE_NOT_AT_STOP', { status: error.status, params: { code: pkg.label } })
        throw error
      }
      mine().stops.delete(tripId)
      return { id: String(pkg.packageId) }
    },

    // POST /api/driver/packages/{id}/issues
    async reportDeliveryIssue(tripId, { stop, itemId, kind, note }) {
      const pkg = deliveryPackageOf(await stopOf(tripId, stop), itemId)
      if (pkg === undefined) throw new ApiError('PACKAGE_NOT_AT_STOP', { params: { code: itemId } })
      try {
        await client().post(`/api/driver/packages/${pkg.packageId}/issues`, { body: { kind: kind.toUpperCase(), note: note ?? null } })
      } catch (error) {
        if (coded(error, 'WRONG_DELIVERY_STOP')) throw new ApiError('PACKAGE_NOT_AT_STOP', { status: error.status, params: { code: pkg.label } })
        throw error
      }
      // Khách từ chối: máy chủ bỏ dấu đã dỡ của kiện — lần đọc lại cho thấy
      mine().stops.delete(tripId)
    },

    // POST /api/driver/stops/{id}/complete
    async completeStop(tripId, stop) {
      try {
        await client().post<CompleteStopDto>(`/api/driver/stops/${encodeURIComponent(stop.ref)}/complete`, { query: { driverId: driverId() } })
      } catch (error) {
        if (coded(error, 'MANUAL_CONFIRM_PENDING')) throw new ApiError('STOP_MANUAL_CONFIRM_PENDING', { status: error.status })
        if (refused(error, 400, 'INCOMPLETE_STOP_UNLOAD')) {
          const name = mine().stops.get(tripId)?.stopName ?? String(stop.number)
          throw new ApiError('STOP_NOT_COMPLETABLE', { status: 400, params: { name } })
        }
        throw error
      }
      mine().stops.delete(tripId)
    },

    // POST /api/driver/location
    async postLocation(tripId, { lat, lng, speedKmh, heading }) {
      try {
        const point = await client().post<LocationPointDto>('/api/driver/location', { body: { tripId, lat, lng, speedKmh, heading } })
        return { recordedAt: point.recordedAt }
      } catch (error) {
        // Chuyến không còn chạy, hoặc vừa bị xoá ở máy chủ
        if (refused(error, 400, 'GPS_TRIP_NOT_IN_TRANSIT') || coded(error, 'TRIP_NOT_FOUND')) throw notInTransit(tripId, error.status)
        throw error
      }
    },

    // Điện thoại gửi thẳng vị trí lên backend: không có công tắc nào ở máy chủ để bật / tắt
    async setDriverGps() {},

    // POST /api/driver/trips/{id}/exceptions
    async reportTripException(tripId, input) {
      const result = await client().post<{ id?: string }>(`/api/driver/trips/${encodeURIComponent(tripId)}/exceptions`, {
        body: input,
        query: { driverId: driverId() },
      })
      return { id: result.id ?? 'EXC-0' }
    },
    createPickupRequest: unsupported,
    fetchNotifications: unsupported,
  }
}
