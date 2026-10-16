import { getMockDb } from '@/data/mock-db'
import {
  driverNotice,
  driverNoticeEvent,
  notificationWindowStart,
  operationHrefs,
  selectNotifications,
} from '@/features/notifications/notifications'
import { MockDbError, vnDate, type AuditEvent, type MockDb, type TripMonitoring } from '@/lib/mock-db'
import type { User } from '@/types/user'

import type { DriverApi } from './driver-api'
import type { DriverNotification, DriverNotificationKind, DriverTripRow, DriverTrips } from './driver-model'
import { driverPlan, isVisibleTo, myTrips, MY_TRIP_GROUPS, type MyTripGroup, type MyTripRow } from './my-trips'
import { stopListTimings } from './stop-timing'
import { tripScreen } from './trip-screen'

/*
 * Nguồn kho mẫu của màn tài xế, như bản web: kho biết người đang đăng nhập; tài xế chỉ đọc được chuyến gán cho mình — chuyến của người
 * khác là `NOT_FOUND` như chuyến không tồn tại. Kiện chỉ được ghi "đã dỡ" qua đối chiếu: không có hàm đánh dấu tay.
 */

function signedIn(db: MockDb): User {
  const viewer = db.sessionUser()
  if (!viewer) throw new MockDbError('NOT_SIGNED_IN', {})
  return viewer
}

/** Chuyến đang chạy và đã có tuyến: kho tính được vị trí xe và giờ đến từ đó. */
const isLive = (row: Pick<MyTripRow, 'status' | 'schedule'>) => row.status === 'IN_TRANSIT' && row.schedule.routePlan !== undefined

function tripRow(row: MyTripRow, live: TripMonitoring | undefined): DriverTripRow {
  const { byStop, sources } = stopListTimings(row.schedule, row.status === 'IN_TRANSIT' ? live : undefined)
  return {
    id: row.id,
    code: row.id,
    name: row.name,
    date: row.scheduledDate,
    vehicleName: row.vehicleName,
    status: row.status,
    sub: row.sub,
    manualSub: row.manualSub,
    stopCount: row.stopCount,
    packageCount: row.packageCount,
    currentStop: row.currentStop,
    completedAt: row.completedAt,
    issueCount: row.issueCount,
    recheck: row.recheck,
    stops: row.stops.map((stop) => ({ ...stop, timing: byStop.get(stop.number) })),
    etaSources: row.stops.length > 0 ? sources : [],
  }
}

async function fetchMyTrips(): Promise<DriverTrips> {
  const db = getMockDb()
  const viewer = signedIn(db)
  const [trips, vehicles] = await Promise.all([db.listTrips(), db.listVehicles()])
  // Chuyến còn lập kế hoạch và chuyến đã huỷ không hiện ở "Chuyến của tôi": không cần đọc revision của chúng
  const visible = trips.filter((trip) => isVisibleTo(trip, viewer) && trip.phase !== 'planning' && trip.phase !== 'cancelled')
  const entries = await Promise.all(visible.map(async (trip) => ({ trip, revisions: await db.listRevisions(trip.id) })))
  const rows = myTrips(entries, new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.name])), viewer)
  const live = new Map(
    await Promise.all(rows.inTransit.filter(isLive).map(async (row) => [row.id, await db.getTripMonitoring(row.id)] as const)),
  )
  const groups = Object.fromEntries(
    MY_TRIP_GROUPS.map((group) => [group, rows[group].map((row) => tripRow(row, live.get(row.id)))]),
  ) as Record<MyTripGroup, DriverTripRow[]>
  const waits = [...live.values()].flatMap((entry) => (entry.refreshMs === null ? [] : [entry.refreshMs]))
  return { groups, refreshMs: waits.length === 0 ? null : Math.min(...waits) }
}

async function fetchTripScreen(tripId: string) {
  const db = getMockDb()
  const viewer = signedIn(db)
  const [trip, revisions, requests, packages] = await Promise.all([
    db.getTrip(tripId),
    db.listRevisions(tripId),
    db.listPickupRequests(tripId),
    db.listPickupPackages(tripId),
  ])
  if (!isVisibleTo(trip, viewer)) throw new MockDbError('NOT_FOUND', { collection: 'trips', id: tripId })
  const live = trip.phase === 'delivering' && trip.routePlan !== undefined ? await db.getTripMonitoring(tripId) : undefined
  return tripScreen({ trip, plan: driverPlan(trip, revisions) ?? null, pickups: { requests, packages }, live })
}

/** Câu của thông báo: việc của chuyến mình (`driverNotice`), xác nhận tay của mình bị từ chối, trả lời yêu cầu hỗ trợ. */
function notificationKind(event: AuditEvent, driverId: string): DriverNotificationKind | null {
  if (event.action === 'manualConfirm.rejected') return 'manualRejected'
  if (event.action === 'ticket.replied') return 'ticketReplied'
  return driverNotice(event, driverId)
}

/** Chỉ tham số câu cần: mã kiện và lý do của xác nhận tay bị từ chối; chi tiết riêng của từng câu về chuyến (`driverNoticeEvent`). */
function detailsOf(event: AuditEvent, kind: DriverNotificationKind): Readonly<Record<string, string | number>> {
  if (kind === 'ticketReplied') return {}
  if (kind === 'manualRejected') {
    const { packageInstanceId, reason } = event.params
    return { ...(packageInstanceId === undefined ? {} : { packageInstanceId }), ...(reason === undefined ? {} : { reason }) }
  }
  return driverNoticeEvent(event, kind).params
}

async function fetchNotifications(): Promise<DriverNotification[]> {
  const db = getMockDb()
  const viewer = signedIn(db)
  const now = new Date()
  const [events, names] = await Promise.all([db.listEvents({ from: vnDate(notificationWindowStart(now)) }), db.listAuditNames()])
  const me = { id: viewer.id, role: viewer.role }
  const selected = selectNotifications(events, me, now)
  const hrefs = operationHrefs(selected, me)
  const tripNames = new Map(names.trips.map((trip) => [trip.id, trip.name]))
  return selected.flatMap((event, index): DriverNotification[] => {
    const kind = notificationKind(event, viewer.id)
    if (kind === null) return []
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

/** Kho mẫu làm được mọi việc của tài xế; vị trí GPS chỉ ở lại kho trong máy. */
export function mockDriverApi(): DriverApi {
  const db = () => getMockDb()
  return {
    capabilities: {
      depart: true,
      arrive: true,
      manualConfirm: true,
      deliveryIssues: true,
      tripExceptions: true,
      gps: true,
      notifications: true,
      gpsLocalOnly: true,
    },
    fetchMyTrips,
    fetchTripScreen,
    async startDelivery(tripId) {
      await db().startDelivery(tripId)
    },
    async arriveAtStop(tripId, stop) {
      await db().arriveAtStop(tripId, stop.number)
    },
    async confirmUnload(tripId, { stop, method, code }) {
      const { packageInstanceId } = await db().confirmUnloadByQr(tripId, stop.number, code, method)
      return { id: packageInstanceId }
    },
    async confirmUnloadManually(tripId, { stop, itemId, reason, note }) {
      const input = { packageInstanceId: itemId, reason, ...(note === undefined ? {} : { note }) }
      const { packageInstanceId } = await db().confirmUnloadManually(tripId, stop.number, input)
      return { id: packageInstanceId }
    },
    async reportDeliveryIssue(tripId, { stop, itemId, kind, note }) {
      await db().reportDeliveryIssue(tripId, { stopNumber: stop.number, packageInstanceId: itemId, kind, note: note ?? '' })
    },
    async completeStop(tripId, stop) {
      await db().completeStop(tripId, stop.number)
    },
    async reportTripException(tripId, input) {
      const { id } = await db().reportTripException(tripId, input)
      return { id }
    },
    async setDriverGps(tripId, enabled) {
      await db().setDriverGps(tripId, enabled)
    },
    async postLocation(tripId, location) {
      const { recordedAt } = await db().postDriverLocation(tripId, location)
      return { recordedAt }
    },
    fetchNotifications,
  }
}
