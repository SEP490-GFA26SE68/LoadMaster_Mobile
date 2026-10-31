import { getMockDb } from '@/data/mock-db'
import { notificationWindowStart, operationHrefs, selectNotifications } from '@/features/notifications/notifications'
import {
  loadingRemaining,
  MockDbError,
  pendingManualConfirms,
  stagingRemaining,
  vnDate,
  type AuditAction,
  type AuditEvent,
  type MockDb,
  type Trip,
} from '@/lib/mock-db'
import type { User } from '@/types/user'

import type { WarehouseApi } from './warehouse-api'
import type { WarehouseNotification, WarehouseNotificationKind } from './warehouse-model'
import { warehouseTripRows, type WarehouseTripRow } from './warehouse-trips'

/*
 * Nguồn kho mẫu của màn kho, như bản web: kho biết người đang đăng nhập và chỉ trả chuyến của công ty người đó. Không có phiên thì kho
 * mẫu không lọc gì, nên mọi lệnh — đọc lẫn ghi — đòi phiên trước (`NOT_SIGNED_IN`).
 */

function signedIn(db: MockDb): User {
  const viewer = db.sessionUser()
  if (!viewer) throw new MockDbError('NOT_SIGNED_IN', {})
  return viewer
}

/** Kho mẫu của phiên đang đăng nhập. */
function sessionDb(): MockDb {
  const db = getMockDb()
  signedIn(db)
  return db
}

/** Danh sách kho chỉ cần chuyến còn lập kế hoạch, đang xếp, hoặc xếp xong chờ xuất phát: chuyến khác không phải đọc revision. */
async function fetchWarehouseTrips(): Promise<WarehouseTripRow[]> {
  const db = sessionDb()
  const [trips, vehicles] = await Promise.all([db.listTrips(), db.listVehicles()])
  const candidates = trips.filter((trip) => trip.phase === 'planning' || trip.phase === 'loading' || trip.phase === 'loaded')
  const entries = await Promise.all(candidates.map(async (trip) => ({ trip, revisions: await db.listRevisions(trip.id) })))
  return warehouseTripRows(entries, new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.name])))
}

/**
 * Chuyến sau khi ghi một kiện: không còn kiện nào chưa soạn hay chưa có kết quả xếp thì hoàn tất xếp luôn (Đang xếp → xếp xong) — trừ
 * khi còn xác nhận tay (lúc soạn hoặc lúc xếp) chờ điều phối viên duyệt: kho từ chối xong xếp, nên chuyến ở lại "đang xếp".
 */
async function finishWhenReady(db: MockDb, trip: Trip): Promise<Trip> {
  const plan = await db.getRevision(trip.loading?.revisionId ?? '')
  const pending = pendingManualConfirms(trip, 'STAGING').length + pendingManualConfirms(trip, 'LOADING').length
  const ready = stagingRemaining(trip, plan).length === 0 && loadingRemaining(trip, plan) === 0 && pending === 0
  return ready ? db.completeLoading(trip.id) : trip
}

/** Câu của từng loại sự kiện kho được báo (`NOTIFICATION_ACTIONS.warehouse`). */
const KIND_OF: Partial<Record<AuditAction, WarehouseNotificationKind>> = {
  'manualConfirm.rejected': 'manualRejected',
  'loading.shortageKept': 'shortageKept',
  'loading.shortageDropped': 'shortageDropped',
  'trip.cancelled': 'cancelled',
  'ticket.replied': 'ticketReplied',
}

/** Tham số câu của từng loại: kiện và lý do bị từ chối, kiện điều phối viên đã quyết, lý do huỷ và số kiện đã lên xe phải dỡ ra. */
const DETAIL_PARAMS: Readonly<Record<WarehouseNotificationKind, readonly string[]>> = {
  manualRejected: ['packageInstanceId', 'reason'],
  shortageKept: ['packageInstanceId', 'packageCode'],
  shortageDropped: ['packageInstanceId', 'packageCode'],
  cancelled: ['reason', 'loaded'],
  ticketReplied: [],
}

function detailsOf(event: AuditEvent, kind: WarehouseNotificationKind): Readonly<Record<string, string | number>> {
  return Object.fromEntries(
    DETAIL_PARAMS[kind].flatMap((name) => {
      const value = event.params[name]
      return value === undefined ? [] : [[name, value] as const]
    }),
  )
}

async function fetchNotifications(): Promise<WarehouseNotification[]> {
  const db = getMockDb()
  const viewer = signedIn(db)
  const now = new Date()
  const [events, names] = await Promise.all([db.listEvents({ from: vnDate(notificationWindowStart(now)) }), db.listAuditNames()])
  const me = { id: viewer.id, role: viewer.role }
  const selected = selectNotifications(events, me, now)
  const hrefs = operationHrefs(selected, me)
  const tripNames = new Map(names.trips.map((trip) => [trip.id, trip.name]))
  return selected.flatMap((event, index): WarehouseNotification[] => {
    const kind = KIND_OF[event.action]
    if (kind === undefined) return []
    const isTrip = event.target.type === 'trip'
    return [{
      id: event.id,
      at: event.at,
      kind,
      target: { id: event.target.id, label: isTrip ? tripNames.get(event.target.id) : undefined },
      tripId: isTrip && hrefs[index] !== null ? event.target.id : undefined,
      details: detailsOf(event, kind),
    }]
  })
}

/** Kho mẫu làm được mọi việc của kho. */
export function mockWarehouseApi(): WarehouseApi {
  return {
    capabilities: { manualConfirm: true, shortages: true, seal: true, notifications: true },
    fetchWarehouseTrips,
    async fetchWarehouseTrip(tripId) {
      const db = sessionDb()
      const [trip, revisions] = await Promise.all([db.getTrip(tripId), db.listRevisions(tripId)])
      return { trip, revisions }
    },
    async startLoading(tripId) {
      return sessionDb().startLoading(tripId)
    },
    async confirmStagingByQr(tripId, { method, code }) {
      return sessionDb().confirmStagingByQr(tripId, code, method)
    },
    async confirmStagingManually(tripId, input) {
      return sessionDb().confirmStagingManually(tripId, input)
    },
    async reportStagingShortage(tripId, packageInstanceId) {
      return sessionDb().reportStagingShortage(tripId, packageInstanceId)
    },
    async confirmLoadingByQr(tripId, { method, code }) {
      const db = sessionDb()
      const result = await db.confirmLoadingByQr(tripId, code, method)
      return { ...result, trip: await finishWhenReady(db, result.trip) }
    },
    async confirmLoadingManually(tripId, input) {
      return sessionDb().confirmLoadingManually(tripId, input)
    },
    async reportDamagedPackage(tripId, packageInstanceId) {
      const db = sessionDb()
      const trip = await db.reportDamagedPackage(tripId, packageInstanceId)
      return trip.phase === 'loading' ? finishWhenReady(db, trip) : trip
    },
    async completeLoading(tripId) {
      return sessionDb().completeLoading(tripId)
    },
    async recordSeal(tripId, sealNumber) {
      return sessionDb().recordSeal(tripId, sealNumber)
    },
    async fetchTripLabels(tripId) {
      return sessionDb().listTripLabels(tripId)
    },
    fetchNotifications,
  }
}
