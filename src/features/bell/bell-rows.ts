import type { Href } from 'expo-router'

import type { DriverNotification } from '@/features/driver/driver-model'
import { tripPath } from '@/features/driver/TripCard'
import type { WarehouseNotification } from '@/features/warehouse/warehouse-model'
import type { Formatter } from '@/lib/format'
import type { TFunction } from '@/lib/i18n'

/**
 * Một dòng của màn Thông báo, đã dịch theo vai trò người đọc: câu nói việc gì xảy ra, đối tượng (chuyến hoặc yêu cầu hỗ trợ), chi tiết
 * người đọc cần (việc phải làm khi câu chưa nói, lý do…). `open` là chuyến mở được từ dòng và route mở nó ở màn của vai trò; vắng thì
 * dòng không bấm được.
 */
export type BellRow = {
  readonly id: string
  /** ISO 8601 */
  readonly at: string
  readonly sentence: string
  readonly target: string
  readonly details: readonly string[]
  readonly open: { readonly tripId: string; readonly href: Href } | undefined
}

/** Route của phiên soạn → xếp một chuyến ở màn kho (`app/(app)/loading/[tripId]`), như `operationHrefs` của web mở `/kho?chuyen=`. */
function loadingSessionRoute(tripId: string) {
  return { pathname: '/loading/[tripId]', params: { tripId } } as const
}

type Entry = DriverNotification | WarehouseNotification

/** Nhãn chi tiết có ở nhánh `notifications.params`. */
const DRIVER_PARAMS = ['reason', 'loaded', 'returned', 'packageInstanceId', 'count', 'lateStops'] as const
type ParamKey = (typeof DRIVER_PARAMS)[number] | 'packageCode'

const isDriverParam = (key: string): key is (typeof DRIVER_PARAMS)[number] => DRIVER_PARAMS.some((item) => item === key)

function detailLine(key: ParamKey, value: string | number, t: TFunction, format: Formatter): string {
  return t('notifications.detail', { label: t(`notifications.params.${key}`), value: typeof value === 'number' ? format.integer(value) : value })
}

function targetLabel(entry: Entry, t: TFunction): string {
  if (entry.kind === 'ticketReplied') return t('notifications.target.ticket', { id: entry.target.id })
  return entry.target.label === undefined
    ? t('notifications.target.trip', { id: entry.target.id })
    : t('notifications.target.tripNamed', { id: entry.target.id, name: entry.target.label })
}

/** Câu của tài xế theo loại: việc của chuyến mình, xác nhận tay bị từ chối, trả lời yêu cầu hỗ trợ. */
function driverSentence(entry: DriverNotification, t: TFunction): string {
  if (entry.kind === 'manualRejected') return t('notifications.manualRejected')
  if (entry.kind === 'ticketReplied') return t('notifications.ticketReplied')
  return t(`notifications.driver.${entry.kind}`)
}

/** Dòng của tài xế: mọi chi tiết nguồn trả, theo thứ tự nguồn trả; thông báo về một chuyến mở chuyến đó ở màn của tài xế. */
export function driverRow(entry: DriverNotification, t: TFunction, format: Formatter): BellRow {
  return {
    id: entry.id,
    at: entry.at,
    sentence: driverSentence(entry, t),
    target: targetLabel(entry, t),
    details: Object.entries(entry.details).flatMap(([key, value]) => (isDriverParam(key) ? [detailLine(key, value, t, format)] : [])),
    open: entry.tripId === undefined ? undefined : { tripId: entry.tripId, href: tripPath(entry.tripId) },
  }
}

/**
 * Câu của kho theo loại; mã kiện là mã ở danh sách soạn hàng. Xác nhận tay bị từ chối và chuyến đã huỷ nói đúng câu của màn phiên xếp
 * (nhánh `notifications.warehouse` lấy chúng từ nhánh `warehouse` chép từ web).
 */
function warehouseSentence(entry: WarehouseNotification, t: TFunction): string {
  const id = entry.details.packageInstanceId ?? ''
  if (entry.kind === 'shortageKept') return t('notifications.warehouse.shortageKept', { id })
  if (entry.kind === 'shortageDropped') return t('notifications.warehouse.shortageDropped', { id })
  if (entry.kind === 'manualRejected') return t('notifications.warehouse.manualRejected', { id })
  if (entry.kind === 'ticketReplied') return t('notifications.ticketReplied')
  return t('notifications.warehouse.cancelled')
}

/**
 * Việc kho làm với chuyến vừa huỷ: dỡ số kiện đã lên xe, hoặc — huỷ lúc còn soạn hàng — không có gì phải dỡ. Nguồn không nói số kiện đã
 * lên xe thì không đoán.
 */
function unloadLines(loaded: string | number | undefined, t: TFunction): string[] {
  if (typeof loaded !== 'number') return []
  return [loaded > 0 ? t('notifications.warehouse.cancelledUnload', { count: loaded }) : t('notifications.warehouse.nothingLoaded')]
}

/**
 * Chi tiết kho cần: chuyến huỷ thì việc phải làm với kiện đã lên xe; mã của bên gửi in trên nhãn khi nó khác mã kiện của câu (để tìm
 * đúng kiện báo thiếu); lý do (xác nhận tay bị từ chối, chuyến huỷ). Mã kiện nằm sẵn trong câu, không lặp.
 */
function warehouseDetails(entry: WarehouseNotification, t: TFunction, format: Formatter): string[] {
  const { packageInstanceId, packageCode, loaded, reason } = entry.details
  return [
    ...(entry.kind === 'cancelled' ? unloadLines(loaded, t) : []),
    ...(packageCode === undefined || packageCode === packageInstanceId ? [] : [detailLine('packageCode', packageCode, t, format)]),
    ...(reason === undefined ? [] : [detailLine('reason', reason, t, format)]),
  ]
}

/** Dòng của kho: thông báo về một chuyến mở phiên của chuyến đó ở màn kho; trả lời yêu cầu hỗ trợ không mở gì, như của tài xế. */
export function warehouseRow(entry: WarehouseNotification, t: TFunction, format: Formatter): BellRow {
  return {
    id: entry.id,
    at: entry.at,
    sentence: warehouseSentence(entry, t),
    target: targetLabel(entry, t),
    details: warehouseDetails(entry, t, format),
    open: entry.tripId === undefined ? undefined : { tripId: entry.tripId, href: loadingSessionRoute(entry.tripId) },
  }
}
