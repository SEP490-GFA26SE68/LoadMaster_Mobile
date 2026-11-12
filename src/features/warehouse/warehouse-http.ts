import { api, ApiError, isApiError, type ApiClient } from '@/data/http'
import { withStatusCode } from '@/lib/office-backend'

import type { DamageDto, StagingDto, StartLoadingDto, WarehouseTaskDto } from './warehouse-http-dto'
import { sessionOf, taskOf } from './warehouse-http-mapping'
import type { ServerWarehouseApi } from './warehouse-server-api'
import type { ServerLoadingSession, ServerManualInput, ServerWarehouseTrip } from './warehouse-server-model'

/*
 * Nguồn backend của màn kho (như `createWarehouseBackend` của web). Máy chủ giữ phiên xếp: danh sách chuyến có cả chuyến Đang xếp hàng kèm
 * trạng thái phiên, và phiên đọc lại được ở mọi thiết bị kèm kết quả từng kiện. Sau mỗi lần ghi adapter đọc lại phiên, nên màn luôn vẽ đúng
 * điều máy chủ đã ghi — không giữ tiến độ ở máy.
 *
 * Lỗi mang tên `ErrorCode` của backend đi thẳng (câu ở `backendErrors`); vài mã đổi sang mã của app: `STAGING_INCOMPLETE` (máy chủ không
 * kèm số kiện còn thiếu) → `STAGING_NOT_READY`, `SEAL_INVALID` kèm độ dài tối đa. Máy chủ cũ trả lỗi không kèm mã: lệnh hoàn tất xếp đọc
 * 400 là còn kiện chưa xử lý.
 */

/** Số seal của máy chủ: 1 → 32 ký tự (`SEAL_INVALID`). */
const SERVER_SEAL_MAX = 32

const hasCode = (error: unknown, code: string) => isApiError(error) && error.code === code

const tripPath = (tripId: string) => `/api/warehouse/tasks/${encodeURIComponent(tripId)}`
const placementPath = (placementId: string) => `/api/warehouse/placements/${encodeURIComponent(placementId)}`
const stagingPath = (tripId: string, packageId: string) => `${tripPath(tripId)}/staging/packages/${encodeURIComponent(packageId)}`

const manualBody = (input: ServerManualInput) => ({ reason: input.reason, note: input.note?.trim() || undefined })

const byDeparture = (a: ServerWarehouseTrip, b: ServerWarehouseTrip) =>
  (a.departureAt ?? '').localeCompare(b.departureAt ?? '') || a.code.localeCompare(b.code)

/** Đổi mã của máy chủ sang mã của app ở các chỗ câu của app cần thêm tham số. */
async function translated<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    if (!isApiError(error)) throw error
    if (error.code === 'STAGING_INCOMPLETE') throw new ApiError('STAGING_NOT_READY', { status: error.status })
    if (error.code === 'SEAL_INVALID') throw new ApiError('SEAL_INVALID', { status: error.status, params: { max: SERVER_SEAL_MAX } })
    throw error
  }
}

export function httpWarehouseApi({ client = api }: { readonly client?: () => ApiClient } = {}): ServerWarehouseApi {
  async function fetchSession(tripId: string): Promise<ServerLoadingSession> {
    return sessionOf(await client().get<StartLoadingDto>(tripPath(tripId)))
  }

  /** Ghi một lệnh rồi đọc lại phiên; `ignore` là mã nói việc đã được ghi từ trước (lượt gọi trước mất phản hồi) — không báo lỗi. */
  async function writeThenRead(tripId: string, write: () => Promise<unknown>, ignore?: string): Promise<ServerLoadingSession> {
    try {
      await translated(write())
    } catch (error) {
      if (ignore === undefined || !hasCode(error, ignore)) throw error
    }
    return fetchSession(tripId)
  }

  return {
    async fetchTasks() {
      // Thêm chuyến chờ điều phối tối ưu lại (`awaitingReplan`) như màn web
      const tasks = await client().get<readonly WarehouseTaskDto[] | null>('/api/warehouse/tasks', { query: { includeAwaitingReplan: true } })
      return (tasks ?? []).map(taskOf).sort(byDeparture)
    },

    fetchSession,

    async start(tripId) {
      try {
        // Phiên luôn có bước soạn hàng, như màn web: kho đối chiếu từng kiện vào khu chờ trước khi xếp
        return sessionOf(await client().post<StartLoadingDto>(`${tripPath(tripId)}/start`, { body: { staging: true } }))
      } catch (error) {
        // Đã bắt đầu ở thiết bị khác (hoặc lượt gọi trước mất phản hồi): mở lại phiên đó
        if (hasCode(error, 'TRIP_ALREADY_LOADING')) return fetchSession(tripId)
        throw error
      }
    },

    async stage(tripId, packageId, method) {
      const result = await translated(client().post<StagingDto | null>(`${stagingPath(tripId, packageId)}/confirm`, { body: { method } }))
      return { session: await fetchSession(tripId), alreadyStaged: result?.alreadyStaged === true }
    },

    stageManually: (tripId, packageId, input) =>
      writeThenRead(tripId, () => client().post(`${stagingPath(tripId, packageId)}/manual`, { body: manualBody(input) })),

    reportShortage: (tripId, packageId) => writeThenRead(tripId, () => client().post(`${stagingPath(tripId, packageId)}/shortage`)),

    confirm: (tripId, placementId, method) =>
      writeThenRead(tripId, () => client().post(`${placementPath(placementId)}/confirm`, { body: { method } }), 'PLACEMENT_ALREADY_CONFIRMED'),

    confirmManually: (tripId, placementId, input) =>
      writeThenRead(tripId, () => client().post(`${placementPath(placementId)}/manual`, { body: manualBody(input) })),

    deviation: (tripId, placementId, input) =>
      writeThenRead(
        tripId,
        () =>
          client().post(`${placementPath(placementId)}/deviation`, {
            body: {
              actualPosX: Math.round(input.x),
              actualPosY: Math.round(input.y),
              actualPosZ: Math.round(input.z),
              reason: input.reason.trim(),
            },
          }),
        'DEVIATION_ALREADY_RECORDED',
      ),

    async damaged(tripId, placementId) {
      const result = await translated(client().post<DamageDto>(`${placementPath(placementId)}/damaged`))
      if (result.outcome === 'REPLANNED') return { outcome: 'replanned', resting: result.restingCount ?? 0 }
      return { outcome: 'leftOut', session: await fetchSession(tripId) }
    },

    // Máy chủ cũ báo còn kiện chưa xử lý bằng 400 không kèm mã
    complete: (tripId) =>
      writeThenRead(tripId, () => withStatusCode(client().post(`${tripPath(tripId)}/complete`), { 400: 'INCOMPLETE_LOADING' })),

    seal: (tripId, sealNumber) =>
      writeThenRead(tripId, () => client().post(`${tripPath(tripId)}/seal`, { body: { sealNumber: sealNumber.trim() } })),
  }
}
