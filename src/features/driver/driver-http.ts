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
 * Lỗi của từng lệnh đổi sang mã có câu ở nhánh `backendErrors`. Lỗi ném bằng `AppException` kèm tên `ErrorCode` trong phong bì; lỗi
 * có handler riêng (dỡ trùng 409, sai điểm 400, điểm chưa xong 400) — và mọi lỗi của backend trước khi gắn mã — chỉ có mã HTTP. Mỗi lệnh
 * nhận cả hai dạng.
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

/**
 * Backend từ chối với mã HTTP `status`: phản hồi không kèm mã nghiệp vụ (client đặt mã chung `SERVER_ERROR`), hoặc kèm đúng mã `code`
 * của `ErrorCode` gây ra nó.
 */
const refused = (error: unknown, status: number, code?: string): error is ApiError =>
  isApiError(error) && error.status === status && (error.code === 'SERVER_ERROR' || error.code === code)

/** Backend báo mã nghiệp vụ `code` (`AppException`). */
const coded = (error: unknown, code: string): error is ApiError => isApiError(error) && error.code === code

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
      // Chuyến vừa bị xoá ở máy chủ giữa hai lượt đọc
      if (coded(current.error, 'TRIP_NOT_FOUND')) throw new ApiError('TRIP_NOT_IN_TRANSIT', { status: 404, params: { tripId: trip.code } })
      // Chuyến đang vận chuyển mà không còn điểm nào chưa hoàn tất: chuyến không có điểm giao
      if (refused(current.error, 404, 'NO_PENDING_DELIVERY_STOP')) return { kind: 'noStops', trip }
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
      pickups: false,
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
        // DuplicateUnloadException
        if (refused(error, 409)) {
          // Đã dỡ từ trước (lần mở app trước, hoặc máy khác): ghi nhận để danh sách kiện đúng trở lại
          unloaded.set(id, unloaded.get(id))
          throw new ApiError('PACKAGE_ALREADY_UNLOADED', { status: 409, params: { code: label } })
        }
        // WrongStopException
        if (refused(error, 400)) throw new ApiError('PACKAGE_NOT_AT_STOP', { status: 400, params: { code: label } })
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
        // IncompleteStopException
        if (refused(error, 400)) {
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
        // Chuyến không còn chạy, hoặc vừa bị xoá ở máy chủ
        if (refused(error, 400, 'GPS_TRIP_NOT_IN_TRANSIT') || coded(error, 'TRIP_NOT_FOUND')) {
          throw new ApiError('TRIP_NOT_IN_TRANSIT', { status: error.status, params: { tripId: headOf(tripId).code } })
        }
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
    createPickupRequest: unsupported,
    fetchNotifications: unsupported,
  }
}
