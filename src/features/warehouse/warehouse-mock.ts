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
import { ApiError } from '@/data/http'
import { isStale, latestApproved, tripStatus, type MockDb } from '@/lib/mock-db'

import type { WarehouseApi } from './warehouse-api'
import type { LoadingSession, PackageLookup, WarehousePlacement, WarehouseTask } from './warehouse-model'
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

export function mockWarehouseApi(db: () => MockDb = getMockDb): WarehouseApi {
  async function sessionOf(tripId: string): Promise<LoadingSession> {
    const trip = await db().getTrip(tripId)
    const plan = latestApproved(await db().listRevisions(tripId))
    const labels = await db().listTripLabels(tripId)
    const recorded = new Set(trip.loading?.steps.map((step) => step.packageInstanceId) ?? [])
    const placements: WarehousePlacement[] = (plan?.result.placements ?? [])
      .toSorted((a, b) => a.loadingOrder - b.loadingOrder)
      .map((item) => {
        const label = labels.find((entry) => entry.packageInstanceId === item.packageInstanceId)
        return {
          id: item.packageInstanceId,
          packageName: label?.name ?? item.packageInstanceId,
          barcode: label?.packageCode ?? label?.qrToken,
          sequence: item.loadingOrder,
          posX: Math.round(item.xCm),
          posY: Math.round(item.yCm),
          posZ: Math.round(item.zCm),
          confirmed: recorded.has(item.packageInstanceId),
        }
      })
    const vehicle = await db().getVehicle(trip.vehicleId)
    const next = placements.find((item) => !item.confirmed)
    return {
      tripId: trip.id,
      tripCode: trip.id,
      vehicleInfo: vehicle.name,
      status: trip.phase,
      totalPackages: placements.length,
      placements,
      nextId: next?.id ?? null,
    }
  }

  async function stageAll(tripId: string) {
    const labels = await db().listTripLabels(tripId)
    for (const label of labels) {
      await db().confirmStagingByQr(tripId, label.qrToken).catch(() => undefined)
    }
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
    capabilities: { deviation: false, scan: true },

    async fetchTasks() {
      const trips = await db().listTrips()
      const tasks: WarehouseTask[] = []
      for (const trip of trips) {
        if (trip.phase !== 'planning' && trip.phase !== 'loading') continue
        const revisions = await db().listRevisions(trip.id)
        const approved = latestApproved(revisions)
        if (approved === undefined) continue
        if (trip.phase === 'planning' && isStale(approved, trip)) continue
        const vehicle = await db().getVehicle(trip.vehicleId)
        tasks.push({
          id: trip.id,
          code: trip.id,
          vehicleInfo: vehicle.name,
          packageCount: trip.packages.length,
          departureAt: trip.departureAt,
          status: tripStatus(trip),
          inProgress: trip.phase === 'loading',
        })
      }
      return tasks
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
      const trip = await db().getTrip(tripId)
      if (trip.phase === 'planning') await db().startLoading(tripId)
      await stageAll(tripId)
      return sessionOf(tripId)
    },

    fetchLoading: sessionOf,

    async confirmPlacement(tripId, placementId) {
      const labels = await db().listTripLabels(tripId)
      const label = labels.find((item) => item.packageInstanceId === placementId)
      if (label === undefined) throw new ApiError('PACKAGE_LOOKUP_UNKNOWN', { params: { code: placementId } })
      await db().confirmLoadingByQr(tripId, label.qrToken)
      return sessionOf(tripId)
    async confirmLoadingByQr(tripId, { method, code }) {
      const db = sessionDb()
      const result = await db.confirmLoadingByQr(tripId, code, method)
      return { ...result, trip: await finishWhenReady(db, result.trip) }
    },

    async recordDeviation() {
      throw new ApiError('NOT_SUPPORTED')
    async confirmLoadingManually(tripId, input) {
      return sessionDb().confirmLoadingManually(tripId, input)
    },
    async reportDamagedPackage(tripId, packageInstanceId) {
      const db = sessionDb()
      const trip = await db.reportDamagedPackage(tripId, packageInstanceId)
      return trip.phase === 'loading' ? finishWhenReady(db, trip) : trip
    },

    async completeLoading(tripId) {
      const before = await sessionOf(tripId)
      const trip = await db().completeLoading(tripId)
      return { tripId: trip.id, tripCode: trip.id, packageCount: before.totalPackages, deviationCount: 0 }
      return sessionDb().completeLoading(tripId)
    },

    async scanPackage(code) {
      const matches = await db().lookupPackages(code)
      const pkg = matches[0]
      if (pkg === undefined) throw new ApiError('PACKAGE_LOOKUP_UNKNOWN', { params: { code } })
      return {
        id: pkg.id,
        code: pkg.packageCode,
        status: pkg.status,
        destination: pkg.destination,
        weightKg: pkg.weightKg,
      } satisfies PackageLookup
    async recordSeal(tripId, sealNumber) {
      return sessionDb().recordSeal(tripId, sealNumber)
    },
    async fetchTripLabels(tripId) {
      return sessionDb().listTripLabels(tripId)
    },
    fetchNotifications,
  }
}
