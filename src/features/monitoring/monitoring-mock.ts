import { getMockDb } from '@/data/mock-db'
import { notificationWindowStart, selectNotifications } from '@/features/notifications/notifications'
import { MockDbError, requirementStatus, vnDate, type AuditEvent, type AuditNames, type MockDb, type Trip } from '@/lib/mock-db'
import type { User } from '@/types/user'

import type { MonitoringApi } from './monitoring-api'
import type { MonitoringTrip, OfficeNotification, RenegotiableRequirement } from './monitoring-model'

/*
 * Nguồn kho mẫu của màn giám sát, như bản web: kho biết người đang đăng nhập và tự xét vai trò cho từng lệnh ghi (`ROLE_NOT_ALLOWED`) —
 * điều phối viên báo, chuyển, xử lý sự cố và duyệt nhận hàng; quản lý công ty gia hạn. Kho không chạy hẹn giờ: mỗi lần đọc giám sát nó
 * ghi bù vị trí xe tới giờ của kho.
 */

function signedIn(db: MockDb): User {
  const viewer = db.sessionUser()
  if (!viewer) throw new MockDbError('NOT_SIGNED_IN', {})
  return viewer
}

/** Họ tên theo mã người dùng, trong phạm vi nhật ký của người xem (không đòi quyền xem người dùng). */
const userNamesOf = (names: AuditNames): Record<string, string> => Object.fromEntries(names.users.map((user) => [user.id, user.fullName]))

/** Phần ít đổi của một chuyến: xe, tài xế, kho đi, điểm giao kèm giờ đã đến và đã giao xong (như `fetchMonitoringBoard` của web). */
function tripHead(trip: Trip, vehicleNames: ReadonlyMap<string, string>, userNames: Readonly<Record<string, string>>): MonitoringTrip {
  return {
    tripId: trip.id,
    name: trip.name,
    vehicleName: vehicleNames.get(trip.vehicleId) ?? trip.vehicleId,
    driverName: trip.driverId === null ? null : (userNames[trip.driverId] ?? null),
    depot: { name: trip.depot.name, lat: trip.depot.lat, lng: trip.depot.lng },
    stops: trip.stops.map((stop, index) => {
      const progress = trip.delivery?.stops.find((item) => item.number === index + 1)
      return {
        id: stop.id,
        number: index + 1,
        name: stop.name,
        ...(stop.kind === undefined ? {} : { kind: stop.kind }),
        ...(stop.lat === undefined || stop.lng === undefined ? {} : { lat: stop.lat, lng: stop.lng }),
        ...(progress?.arrivedAt === undefined ? {} : { arrivedAt: progress.arrivedAt }),
        ...(progress?.completedAt === undefined ? {} : { completedAt: progress.completedAt }),
      }
    }),
  }
}

async function fetchMonitoringBoard() {
  const db = getMockDb()
  signedIn(db)
  const [trips, vehicles, names] = await Promise.all([db.listTrips(), db.listVehicles(), db.listAuditNames()])
  const running = trips.filter((trip) => trip.phase === 'delivering')
  const vehicleNames = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.name]))
  const userNames = userNamesOf(names)
  const pickups = await Promise.all(running.map((trip) => db.listPickupRequests(trip.id)))
  const pendingPickups = Object.fromEntries(
    running.map((trip, index) => [
      trip.id,
      (pickups[index] ?? []).filter((request) => request.status === 'PENDING' || request.status === 'VALIDATED').length,
    ]),
  )
  return { trips: running.map((trip) => tripHead(trip, vehicleNames, userNames)), userNames, pendingPickups }
}

async function fetchLiveTrip(tripId: string) {
  const db = getMockDb()
  signedIn(db)
  // Đọc giám sát trước: kho ghi bù vị trí xe tới giờ của nó, rồi chuyến đọc sau mang đúng tiến độ giao lúc đó
  const live = await db.getTripMonitoring(tripId)
  const [trip, vehicles, names] = await Promise.all([db.getTrip(tripId), db.listVehicles(), db.listAuditNames()])
  const userNames = userNamesOf(names)
  const head = tripHead(trip, new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.name])), userNames)
  return { trip: head, running: trip.phase === 'delivering', userNames, live }
}

/**
 * Yêu cầu giao của chuyến còn gia hạn được: trạng thái suy từ kiện là Đang giao và kiện của nó nằm ở một điểm giao của chuyến; theo điểm
 * rồi theo hạn (như `fetchTripRequirements` của web).
 */
async function fetchTripRequirements(tripId: string): Promise<RenegotiableRequirement[]> {
  const db = getMockDb()
  const [requirements, packages, trip] = await Promise.all([db.listDeliveryRequirements(), db.listPackages(), db.getTrip(tripId)])
  const packageById = new Map(packages.map((pkg) => [pkg.id, pkg]))
  const numberOfStop = new Map(trip.stops.map((stop, index) => [stop.id, index + 1]))
  return requirements
    .filter((requirement) => requirement.tripId === tripId)
    .flatMap((requirement) => {
      const members = requirement.packageIds.flatMap((id) => packageById.get(id) ?? [])
      const stopId = members.find((pkg) => pkg.tripId === tripId)?.stopId
      const stopNumber = stopId === undefined ? undefined : numberOfStop.get(stopId)
      if (stopNumber === undefined || requirementStatus(requirement, members) !== 'IN_TRIP') return []
      return [{ id: requirement.id, destinationName: requirement.destinationName, deadline: requirement.deadline, stopNumber }]
    })
    .toSorted((a, b) => a.stopNumber - b.stopNumber || Date.parse(a.deadline) - Date.parse(b.deadline))
}

/** Tham số của sự kiện nêu mã một người: màn đọc họ tên thay mã. */
const PERSON_PARAMS = ['requestedBy', 'driverId'] as const

function officeNotification(event: AuditEvent, users: ReadonlyMap<string, string>, trips: ReadonlyMap<string, string>): OfficeNotification {
  const names = Object.fromEntries(
    PERSON_PARAMS.flatMap((key) => {
      const id = event.params[key]
      const name = typeof id === 'string' ? users.get(id) : undefined
      return name === undefined ? [] : [[id, name] as const]
    }),
  )
  return {
    id: event.id,
    at: event.at,
    action: event.action,
    actorId: event.actorId,
    actorName: event.actorId === null ? null : (users.get(event.actorId) ?? null),
    target: { type: event.target.type, id: event.target.id, label: event.target.type === 'trip' ? trips.get(event.target.id) : undefined },
    params: event.params,
    names,
  }
}

async function fetchNotifications(): Promise<OfficeNotification[]> {
  const db = getMockDb()
  const viewer = signedIn(db)
  const now = new Date()
  const [events, names] = await Promise.all([db.listEvents({ from: vnDate(notificationWindowStart(now)) }), db.listAuditNames()])
  const users = new Map(names.users.map((user) => [user.id, user.fullName]))
  const trips = new Map(names.trips.map((trip) => [trip.id, trip.name]))
  return selectNotifications(events, { id: viewer.id, role: viewer.role }, now).map((event) => officeNotification(event, users, trips))
}

/** Kho mẫu làm được mọi việc của màn giám sát. */
export function mockMonitoringApi(): MonitoringApi {
  const db = () => getMockDb()
  return {
    capabilities: { exceptions: true, reroute: true, escalation: true, pickups: true, notifications: true },
    fetchMonitoringBoard,
    async listTripMonitoring() {
      signedIn(db())
      return db().listTripMonitoring()
    },
    fetchLiveTrip,
    async reportTripException(tripId, input) {
      const { id } = await db().reportTripException(tripId, input)
      return { id }
    },
    async escalateTripException(tripId, exceptionId) {
      await db().escalateTripException(tripId, exceptionId)
    },
    async resolveTripException(tripId, exceptionId, note) {
      await db().resolveTripException(tripId, exceptionId, note)
    },
    requestReroute: (tripId) => db().requestReroute(tripId),
    async confirmReroute(tripId, routeIndex) {
      await db().confirmReroute(tripId, routeIndex)
    },
    fetchTripRequirements,
    async renegotiateDeadline(tripId, exceptionId, input) {
      await db().renegotiateDeadline(tripId, exceptionId, input)
    },
    async fetchPickupRows(tripId) {
      const requests = await db().listPickupRequests(tripId)
      if (requests.length === 0) return []
      const users = new Map((await db().listAuditNames()).users.map((user) => [user.id, user.fullName]))
      return requests.map((request) => ({ request, createdByName: request.createdBy === null ? null : (users.get(request.createdBy) ?? null) }))
    },
    async createPickupRequest(tripId, input) {
      const request = await db().createPickupRequest(tripId, input)
      const trip = await db().getTrip(tripId)
      return { request, stops: trip.stops.map(({ id, name }) => ({ id, name })) }
    },
    validatePickupRequest: (tripId, pickupId) => db().validatePickupRequest(tripId, pickupId),
    async approvePickupRequest(tripId, pickupId, input) {
      const { request, packages } = await db().approvePickupRequest(tripId, pickupId, input)
      return { request, packages: packages.map(({ id, packageCode, qrToken }) => ({ id, packageCode, qrToken })) }
    },
    async rejectPickupRequest(tripId, pickupId, reason) {
      await db().rejectPickupRequest(tripId, pickupId, reason)
    },
    fetchNotifications,
  }
}
