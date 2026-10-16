import { api, ApiError, currentUserId, isApiError, type ApiClient } from '@/data/http'

import type { DriverApi } from './driver-api'
import {
  packageOfCode,
  stopScreenOf,
  tripRowOf,
  type CompleteStopDto,
  type CurrentStopDto,
  type DriverTripDto,
  type LocationPointDto,
} from './driver-http-mapping'
import type { DriverTripRow, DriverTripScreen, TripHead, VerifyVia } from './driver-model'

/*
 * Nguồn backend của màn tài xế. Backend hiện có: chuyến đang vận chuyển của tài xế, điểm giao hiện tại kèm kiện cần dỡ, ghi dỡ một kiện,
 * hoàn tất điểm, gửi vị trí điện thoại. Chưa có (hoặc tài xế chưa có quyền): xuất phát, "Đã đến", xác nhận tay, sự cố theo kiện, sự cố
 * trên đường, thông báo — `capabilities` tắt để màn ẩn nút, gọi tới là `NOT_SUPPORTED`.
 *
 * Điều backend chưa trả thì adapter tự giữ trong lần mở app này, theo người đang đăng nhập: kiện nào của điểm hiện tại đã dỡ, chuyến nào
 * vừa giao xong (chuyến đã giao rời khỏi danh sách). Mở lại app thì quét lại kiện đã dỡ: backend báo trùng và adapter ghi nhận lại.
 *
 * Backend chưa gắn mã vào lỗi nghiệp vụ, nên lỗi của từng lệnh được đổi theo mã HTTP sang mã có câu ở nhánh `backendErrors`.
 */

type Memory = {
  /** Chuyến của lần đọc danh sách gần nhất, theo mã dùng trên route. */
  readonly trips: Map<string, DriverTripRow>
  /** Điểm hiện tại của lần đọc gần nhất theo chuyến: để đổi mã quét được thành mã kiện. */
  readonly stops: Map<string, CurrentStopDto>
  /** Kiện đã dỡ theo điểm (`stopId`). */
  readonly unloaded: Map<string, Map<string, VerifyVia | undefined>>
  /** Chuyến vừa giao xong: không còn trong danh sách nhưng vẫn mở được màn tổng kết. */
  readonly finished: Map<string, TripHead>
}

const emptyMemory = (): Memory => ({ trips: new Map(), stops: new Map(), unloaded: new Map(), finished: new Map() })

/** Lỗi backend trả kèm mã HTTP mà không kèm mã nghiệp vụ (client đặt mã chung `SERVER_ERROR`). */
const uncoded = (error: unknown, status: number) => isApiError(error) && error.status === status && error.code === 'SERVER_ERROR'

const unsupported = async (): Promise<never> => {
  throw new ApiError('NOT_SUPPORTED')
}

type HttpDriverDeps = {
  readonly client?: () => ApiClient
  readonly userId?: () => string | null
}

export function httpDriverApi({ client = api, userId = currentUserId }: HttpDriverDeps = {}): DriverApi {
  let owner: string | null = null
  let memory = emptyMemory()

  /** Dữ liệu tự giữ thuộc về người đang đăng nhập: đổi người là quên hết. */
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

  // GET /api/driver/trips
  async function listTrips(): Promise<DriverTripRow[]> {
    const dtos = await client().get<readonly DriverTripDto[] | null>('/api/driver/trips', { query: { driverId: driverId() } })
    const rows = (dtos ?? []).map(tripRowOf).filter((row) => row.status === 'IN_TRANSIT')
    const { trips } = mine()
    trips.clear()
    for (const row of rows) trips.set(row.id, row)
    return rows
  }

  // GET /api/driver/trips/{id}/current-stop
  async function currentStop(tripId: string): Promise<CurrentStopDto> {
    const dto = await client().get<CurrentStopDto>(`/api/driver/trips/${encodeURIComponent(tripId)}/current-stop`)
    mine().stops.set(tripId, dto)
    return dto
  }

  function unloadedAt(stopId: string): Map<string, VerifyVia | undefined> {
    const { unloaded } = mine()
    const entries = unloaded.get(stopId) ?? new Map<string, VerifyVia | undefined>()
    unloaded.set(stopId, entries)
    return entries
  }

  /**
   * Chỉ chuyến đang vận chuyển của chính tài xế mới mở được (backend đọc điểm hiện tại của chuyến nào cũng được, kể cả chuyến đã huỷ).
   * Chuyến vừa giao xong trong lần mở app này thì mở màn tổng kết — backend chưa có số liệu tổng kết.
   */
  async function fetchTripScreen(tripId: string): Promise<DriverTripScreen> {
    const settled = currentStop(tripId).then(
      (dto) => ({ dto }),
      (error: unknown) => ({ error }),
    )
    const [rows, current] = await Promise.all([listTrips(), settled])
    const row = rows.find((entry) => entry.id === tripId)
    if (row === undefined) {
      const finished = mine().finished.get(tripId)
      if (finished !== undefined) return { kind: 'completed', trip: finished, summary: undefined }
      throw new ApiError('TRIP_NOT_IN_TRANSIT', { params: { tripId: headOf(tripId).code } })
    }
    const trip = headOf(tripId)
    if ('error' in current) {
      // Chuyến đang vận chuyển mà không còn điểm nào chưa hoàn tất: chuyến không có điểm giao
      if (uncoded(current.error, 404) || (isApiError(current.error) && current.error.code === 'NO_PENDING_DELIVERY_STOP')) {
        return { kind: 'noStops', trip }
      }
      throw current.error
    }
    const { dto } = current
    return { kind: 'stop', trip, screen: stopScreenOf(dto, row.stopCount, unloadedAt(String(dto.stopId))) }
  }

  return {
    capabilities: {
      depart: false,
      arrive: false,
      manualConfirm: false,
      deliveryIssues: false,
      tripExceptions: false,
      gps: true,
      notifications: false,
      gpsLocalOnly: false,
    },

    async fetchMyTrips() {
      const rows = await listTrips()
      return { groups: { inTransit: rows, loaded: [], preparing: [], recent: [] }, refreshMs: null }
    },

    fetchTripScreen,

    // POST /api/driver/packages/{id}/unload
    async confirmUnload(tripId, { stop, method, code }) {
      const cached = mine().stops.get(tripId)
      const dto = cached !== undefined && String(cached.stopId) === stop.ref ? cached : await currentStop(tripId)
      const pkg = packageOfCode(dto, code)
      if (pkg === undefined) throw new ApiError('PACKAGE_CODE_UNKNOWN', { params: { code: code.trim() } })
      const id = String(pkg.packageId)
      const { label } = pkg
      const unloaded = unloadedAt(String(dto.stopId))
      if (unloaded.has(id)) throw new ApiError('PACKAGE_ALREADY_UNLOADED', { params: { code: label } })
      try {
        await client().post(`/api/driver/packages/${pkg.packageId}/unload`, { query: { driverId: driverId() } })
      } catch (error) {
        if (uncoded(error, 409)) {
          // Đã dỡ từ trước (lần mở app trước, hoặc máy khác): ghi nhận để danh sách kiện đúng trở lại
          unloaded.set(id, unloaded.get(id))
          throw new ApiError('PACKAGE_ALREADY_UNLOADED', { status: 409, params: { code: label } })
        }
        if (uncoded(error, 400)) throw new ApiError('PACKAGE_NOT_AT_STOP', { status: 400, params: { code: label } })
        throw error
      }
      unloaded.set(id, method)
      return { id }
    },

    // POST /api/driver/stops/{id}/complete
    async completeStop(tripId, stop) {
      let result: CompleteStopDto
      try {
        result = await client().post<CompleteStopDto>(`/api/driver/stops/${encodeURIComponent(stop.ref)}/complete`, {
          query: { driverId: driverId() },
        })
      } catch (error) {
        if (uncoded(error, 400)) {
          const name = mine().stops.get(tripId)?.stopName ?? String(stop.number)
          throw new ApiError('STOP_NOT_COMPLETABLE', { status: 400, params: { name } })
        }
        throw error
      }
      const { stops, unloaded, finished } = mine()
      if (result.tripCompleted) finished.set(tripId, headOf(tripId))
      stops.delete(tripId)
      unloaded.delete(stop.ref)
    },

    // POST /api/driver/location
    async postLocation(tripId, { lat, lng, speedKmh, heading }) {
      try {
        const point = await client().post<LocationPointDto>('/api/driver/location', { body: { tripId, lat, lng, speedKmh, heading } })
        return { recordedAt: point.recordedAt }
      } catch (error) {
        if (uncoded(error, 400)) throw new ApiError('TRIP_NOT_IN_TRANSIT', { status: 400, params: { tripId: headOf(tripId).code } })
        throw error
      }
    },

    // Điện thoại gửi thẳng vị trí lên backend: không có công tắc nào ở máy chủ để bật / tắt
    async setDriverGps() {},

    startDelivery: unsupported,
    arriveAtStop: unsupported,
    confirmUnloadManually: unsupported,
    reportDeliveryIssue: unsupported,
    reportTripException: unsupported,
    fetchNotifications: unsupported,
  }
}
