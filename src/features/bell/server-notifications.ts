import type { ApiClient } from '@/data/http'
import type { DriverNotice } from '@/features/notifications/notifications'
import type { DriverNotification } from '@/features/driver/driver-model'
import type { WarehouseNotification } from '@/features/warehouse/warehouse-model'
import { isoFromBackend } from '@/lib/office-backend'

/*
 * Chuông khi nguồn là máy chủ (như `notifications-api.ts` + `server-notifications.ts` của web): máy chủ chọn dòng nhật ký theo vai trò,
 * công ty và người xem, và giữ trạng thái đã đọc. Đây chỉ đổi dòng nhật ký sang thông báo của tài xế / kho — câu theo mã + tham số;
 * loại việc app chưa có câu thì bỏ, không hiện mã thô. Chỉ adapter `http` của tài xế và kho import file này.
 */

type Scalars = Readonly<Record<string, string | number | boolean>>

/** Một dòng của `NotificationListResponse` (DTO chỉ ở file này). */
type NotificationDto = {
  readonly id: number
  readonly actionType: string | null
  readonly tripId: number | null
  readonly tripCode: string | null
  readonly oldValues: Readonly<Record<string, unknown>> | null
  readonly newValues: Readonly<Record<string, unknown>> | null
  readonly createdAt: string | null
  readonly read: boolean
}

type NotificationListDto = { readonly items?: readonly NotificationDto[] | null }

/** Dòng nhật ký máy chủ đã đọc: chỉ phần chuông của điện thoại cần. */
export type ServerNotification = {
  readonly id: string
  /** ISO 8601 */
  readonly at: string
  readonly actionType: string
  /** Mã số chuyến của máy chủ — mã trên route của màn tài xế và kho; `null` khi việc không gắn chuyến. */
  readonly tripId: string | null
  readonly tripCode: string | null
  readonly before: Scalars
  readonly after: Scalars
  readonly read: boolean
}

function scalars(values: Readonly<Record<string, unknown>> | null): Scalars {
  const out: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(values ?? {})) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') out[key] = value
  }
  return out
}

function notificationOf(dto: NotificationDto): ServerNotification[] {
  if (dto.createdAt === null || dto.actionType === null) return []
  return [{
    id: String(dto.id),
    at: isoFromBackend(dto.createdAt),
    actionType: dto.actionType,
    tripId: dto.tripId === null ? null : String(dto.tripId),
    tripCode: dto.tripCode,
    before: scalars(dto.oldValues),
    after: scalars(dto.newValues),
    read: dto.read,
  }]
}

const listOf = (dto: NotificationListDto | null): ServerNotification[] => (dto?.items ?? []).flatMap(notificationOf)

/** Thông báo 7 ngày gần nhất của người đang đăng nhập (tối đa 20, mới nhất trước), kèm đã đọc. */
// GET /api/notifications
export async function fetchServerNotifications(client: ApiClient): Promise<ServerNotification[]> {
  return listOf(await client.get<NotificationListDto | null>('/api/notifications'))
}

/** Đánh dấu đã đọc theo mã dòng nhật ký; máy chủ trả lại danh sách mới. */
// POST /api/notifications/read
export async function markServerNotificationsRead(client: ApiClient, ids: readonly string[]): Promise<ServerNotification[]> {
  const body = { ids: ids.map(Number).filter((id) => Number.isInteger(id)) }
  return listOf(await client.post<NotificationListDto | null>('/api/notifications/read', { body }))
}

const same = (value: string | number | boolean | undefined, id: string | null) => id !== null && value !== undefined && String(value) === id

const numberOf = (value: string | number | boolean | undefined) => (typeof value === 'number' ? value : undefined)

const textOf = (value: string | number | boolean | undefined) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined)

/** Bỏ chi tiết vắng: màn chỉ hiện dòng có giá trị. */
function details(entries: Readonly<Record<string, string | number | undefined>>): Readonly<Record<string, string | number>> {
  return Object.fromEntries(Object.entries(entries).filter((entry): entry is [string, string | number] => entry[1] !== undefined))
}

/** Việc của chuyến mình nói bằng câu của tài xế (như `driverNotice` của web); máy chủ đã chỉ trả việc nêu đúng người này. */
function driverNotice(item: ServerNotification, viewerId: string | null): DriverNotice | null {
  switch (item.actionType) {
    case 'TRIP_STATUS_TRANSITION':
      return item.after.status === 'LOADING' ? 'loadingStarted' : null
    case 'LOADING_COMPLETED':
      return 'loadingCompleted'
    case 'TRIP_CANCELLED':
      return 'cancelled'
    case 'TRIP_UPDATED':
      if (same(item.after.driverId, viewerId)) return 'assigned'
      return same(item.before.driverId, viewerId) ? 'unassigned' : null
    case 'PICKUP_APPROVED':
      return 'pickupApproved'
    case 'PICKUP_REJECTED':
      return 'pickupRejected'
    case 'TRIP_STOPS_REORDERED':
      return 'stopsReordered'
    // Máy chủ chỉ báo tài xế khi chuyến quay về lập kế hoạch: kiện hỏng có kiện tựa lên, kiện thiếu bị bỏ khỏi chuyến
    case 'LOADING_DAMAGE_REPORTED':
      return item.after.outcome === 'REPLANNED' ? 'replanDamaged' : null
    case 'STAGING_SHORTAGE_RESOLVED':
      return item.after.decision === 'DROP' ? 'replanShortage' : null
    default:
      return null
  }
}

/** Chi tiết tài xế cần ở từng câu (như `DRIVER_NOTICE_PARAMS`), theo tên tham số của chuông. */
function driverDetails(notice: DriverNotice, after: Scalars): Readonly<Record<string, string | number>> {
  switch (notice) {
    case 'loadingCompleted':
      return details({ loaded: numberOf(after.loadedPackages) })
    case 'cancelled':
      return details({ reason: textOf(after.reason), loaded: numberOf(after.loadedPackages), returned: numberOf(after.returned) })
    case 'pickupApproved': {
      const count = (numberOf(after.placed) ?? 0) + (numberOf(after.unplaced) ?? 0)
      return details({ count: count > 0 ? count : undefined })
    }
    case 'pickupRejected':
      return details({ reason: textOf(after.reason) })
    default:
      return {}
  }
}

/** Chuyến tài xế đã thôi chạy: lần đổi tài xế mới nhất của chuyến (danh sách mới nhất trước) đưa người khác vào. */
function releasedTrips(items: readonly ServerNotification[], viewerId: string | null): Set<string> {
  const decided = new Set<string>()
  const released = new Set<string>()
  for (const item of items) {
    if (item.actionType !== 'TRIP_UPDATED' || item.tripId === null || decided.has(item.tripId) || !('driverId' in item.after)) continue
    decided.add(item.tripId)
    if (!same(item.after.driverId, viewerId)) released.add(item.tripId)
  }
  return released
}

/** Yêu cầu hỗ trợ của chính người đọc vừa được trả lời, hoặc chỉ đổi trạng thái. */
function ticketNotification(item: ServerNotification) {
  return {
    kind: item.after.replied === true ? ('ticketReplied' as const) : ('ticketUpdated' as const),
    target: { id: textOf(item.after.ticketCode) ?? item.id, label: undefined },
    tripId: undefined,
    details: {},
  }
}

function tripTarget(item: ServerNotification) {
  return { id: item.tripCode ?? item.tripId ?? item.id, label: undefined }
}

/** Thông báo của tài xế `viewerId` (mã người dùng ở máy chủ): câu của tài xế, chuyến mở được trừ chuyến đã thôi chạy. */
export function driverNotificationsOf(items: readonly ServerNotification[], viewerId: string | null): DriverNotification[] {
  const released = releasedTrips(items, viewerId)
  return items.flatMap((item): DriverNotification[] => {
    const base = { id: item.id, at: item.at, read: item.read }
    if (item.actionType === 'SUPPORT_TICKET_UPDATED') return [{ ...base, ...ticketNotification(item) }]
    const tripId = item.tripId !== null && !released.has(item.tripId) ? item.tripId : undefined
    if (item.actionType === 'MANUAL_CONFIRM_REJECTED') {
      return [{ ...base, kind: 'manualRejected', target: tripTarget(item), tripId, details: details({ reason: textOf(item.after.reason) }) }]
    }
    const notice = driverNotice(item, viewerId)
    if (notice === null) return []
    return [{ ...base, kind: notice, target: tripTarget(item), tripId, details: driverDetails(notice, item.after) }]
  })
}

/**
 * Thông báo của kho: chuyến bị huỷ lúc đang xếp (số kiện đã lên xe, lý do), quyết định của điều phối viên với kiện mình báo thiếu, yêu
 * cầu hỗ trợ của mình. Máy chủ không ghi mã kiện báo thiếu vào nhật ký nên câu không nêu kiện.
 */
export function warehouseNotificationsOf(items: readonly ServerNotification[]): WarehouseNotification[] {
  return items.flatMap((item): WarehouseNotification[] => {
    const base = { id: item.id, at: item.at, read: item.read }
    const trip = { target: tripTarget(item), tripId: item.tripId ?? undefined }
    switch (item.actionType) {
      case 'SUPPORT_TICKET_UPDATED':
        return [{ ...base, ...ticketNotification(item) }]
      case 'TRIP_CANCELLED':
        return [{ ...base, ...trip, kind: 'cancelled', details: details({ loaded: numberOf(item.after.loadedPackages), reason: textOf(item.after.reason) }) }]
      case 'STAGING_SHORTAGE_RESOLVED':
        if (item.after.decision === 'KEEP_SEARCHING') return [{ ...base, ...trip, kind: 'shortageKept', details: {} }]
        return item.after.decision === 'DROP' ? [{ ...base, ...trip, kind: 'shortageDropped', details: {} }] : []
      default:
        return []
    }
  })
}
