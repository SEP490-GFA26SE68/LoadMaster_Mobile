import { getMockDb } from '@/data/mock-db'
import {
  isMockDbError,
  MockDbError,
  pendingManualConfirms,
  requirementStatus,
  tripManualSubStatus,
  tripRouteSubStatus,
  tripStatus,
  tripSubStatus,
  type MockDb,
  type Trip,
  type VerifyContext,
} from '@/lib/mock-db'
import type { User } from '@/types/user'

import { tripRow, type TripRow } from './trip-list'
import type { TripsApi } from './trips-api'
import type { ManualConfirmRow, ShortageRow, TripDetail, TripRequirementRow } from './trips-model'

/*
 * Nguồn kho mẫu của màn chuyến, như bản web: kho biết người đang đăng nhập và chỉ trả chuyến của công ty người đó, và tự kiểm vai trò của
 * lệnh ghi (chỉ điều phối viên duyệt xác nhận tay, quyết kiện kho báo thiếu). Không có phiên thì kho mẫu không lọc gì, nên mọi lệnh — đọc
 * lẫn ghi — đòi phiên trước (`NOT_SIGNED_IN`).
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

/** Tài khoản tài xế đã bị xoá khỏi kho: chuyến vẫn đọc được, chỉ không có tên. */
function notFoundAsNull(error: unknown): null {
  if (isMockDbError(error) && error.code === 'NOT_FOUND') return null
  throw error
}

async function fetchTrips(): Promise<TripRow[]> {
  const db = sessionDb()
  const [trips, vehicles, users] = await Promise.all([db.listTrips(), db.listVehicles(), db.listUsers()])
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))
  const userById = new Map(users.map((user) => [user.id, user]))
  // Kho chưa có hàm liệt kê revision của mọi chuyến nên đọc theo từng chuyến, như bản web
  const revisions = await Promise.all(trips.map((trip) => db.listRevisions(trip.id)))
  return trips.map((trip, index) =>
    tripRow(trip, vehicleById.get(trip.vehicleId), revisions[index] ?? [], trip.driverId === null ? undefined : userById.get(trip.driverId)))
}

async function fetchTripDetail(tripId: string): Promise<TripDetail> {
  const db = sessionDb()
  const trip = await db.getTrip(tripId)
  const [vehicle, revisions, events, users, eta, driver] = await Promise.all([
    db.getVehicle(trip.vehicleId),
    db.listRevisions(tripId),
    db.listEvents({ targetId: tripId }),
    db.listUsers(),
    db.getTripEta(tripId),
    trip.driverId === null ? null : db.getUser(trip.driverId).catch(notFoundAsNull),
  ])
  return {
    kind: 'full',
    trip,
    vehicle,
    driver: driver === null ? null : { id: driver.id, fullName: driver.fullName, phone: driver.phone },
    status: tripStatus(trip),
    sub: tripSubStatus(trip, revisions),
    extraSub: tripRouteSubStatus(trip) ?? tripManualSubStatus(trip),
    revisions,
    // `targetId` khớp cả sự kiện của đối tượng khác cùng mã: chỉ giữ sự kiện của chính chuyến
    events: events.filter((event) => event.target.type === 'trip' && event.target.id === tripId),
    people: users.map(({ id, fullName }) => ({ id, fullName })),
    eta,
  }
}

async function fetchTripRequirements(tripId: string): Promise<TripRequirementRow[]> {
  const db = sessionDb()
  const [requirements, packages, trip] = await Promise.all([db.listDeliveryRequirements(), db.listPackages(), db.getTrip(tripId)])
  const packageById = new Map(packages.map((pkg) => [pkg.id, pkg]))
  const numberOfStop = new Map(trip.stops.map((stop, index) => [stop.id, index + 1]))
  return requirements
    .filter((requirement) => requirement.tripId === tripId)
    .map((requirement) => {
      const members = requirement.packageIds.flatMap((id) => packageById.get(id) ?? [])
      const stopId = members.find((pkg) => pkg.tripId === tripId)?.stopId
      const stopNumber = stopId === undefined ? undefined : numberOfStop.get(stopId)
      return { requirement, status: requirementStatus(requirement, members), ...(stopNumber === undefined ? {} : { stopNumber }) }
    })
    .sort((a, b) => (a.stopNumber ?? Infinity) - (b.stopNumber ?? Infinity) || Date.parse(a.requirement.deadline) - Date.parse(b.requirement.deadline))
}

/** Bước đối chiếu đang diễn ra theo pha của chuyến: kho đang soạn / xếp, hoặc xe đang giao (dỡ, nhận hàng dọc đường). */
function activeContexts(phase: Trip['phase']): readonly VerifyContext[] {
  return phase === 'loading' ? ['STAGING', 'LOADING'] : phase === 'delivering' ? ['UNLOADING', 'PICKUP'] : []
}

async function fetchManualConfirmations(tripId: string): Promise<ManualConfirmRow[]> {
  const db = sessionDb()
  const trip = await db.getTrip(tripId)
  const contexts = activeContexts(trip.phase)
  const pending = pendingManualConfirms(trip).filter((entry) => contexts.includes(entry.context))
  if (pending.length === 0) return []
  const [labels, names] = await Promise.all([db.listTripLabels(tripId), db.listAuditNames()])
  const packageNames = new Map(labels.map((label) => [label.packageInstanceId, label.name]))
  const users = new Map(names.users.map((user) => [user.id, user.fullName]))
  return pending.map((entry) => ({
    id: entry.id,
    context: entry.context,
    ...(entry.stopNumber === undefined ? {} : { stopNumber: entry.stopNumber }),
    packageInstanceId: entry.packageInstanceId,
    packageName: packageNames.get(entry.packageInstanceId) ?? '',
    reason: entry.manual?.reason ?? 'OTHER',
    ...(entry.manual?.note === undefined ? {} : { note: entry.manual.note }),
    at: entry.at,
    senderName: entry.by === null ? null : (users.get(entry.by) ?? null),
  }))
}

async function fetchStagingShortages(tripId: string): Promise<ShortageRow[]> {
  const db = sessionDb()
  const trip = await db.getTrip(tripId)
  const shortages = trip.phase === 'loading' ? (trip.loading?.shortages ?? []) : []
  if (shortages.length === 0) return []
  const [labels, names] = await Promise.all([db.listTripLabels(tripId), db.listAuditNames()])
  const labelOf = new Map(labels.map((label) => [label.packageInstanceId, label]))
  const users = new Map(names.users.map((user) => [user.id, user.fullName]))
  return shortages.map((shortage) => {
    const label = labelOf.get(shortage.packageInstanceId)
    return {
      // Kho mẫu quyết báo thiếu theo kiện: mã của lần báo là mã kiện
      id: shortage.packageInstanceId,
      packageInstanceId: shortage.packageInstanceId,
      packageName: label?.name ?? '',
      packageCode: label?.packageCode ?? shortage.packageInstanceId,
      ...(label === undefined ? {} : { stopNumber: label.deliveryStop }),
      at: shortage.at,
      reporterName: shortage.by === null ? null : (users.get(shortage.by) ?? null),
    }
  })
}

/** Kho mẫu làm được mọi việc của màn chuyến. */
export function mockTripsApi(): TripsApi {
  return {
    capabilities: { manualConfirms: true, shortages: true, requirements: true, planStatus: true },
    fetchTrips,
    fetchTripDetail,
    fetchTripRequirements,
    fetchManualConfirmations,
    async approveManualConfirmation(tripId, confirmationId) {
      await sessionDb().approveManualConfirmation(tripId, confirmationId)
    },
    async rejectManualConfirmation(tripId, confirmationId, reason) {
      await sessionDb().rejectManualConfirmation(tripId, confirmationId, reason)
    },
    fetchStagingShortages,
    async resolveStagingShortage(tripId, shortageId, decision) {
      await sessionDb().resolveStagingShortage(tripId, shortageId, decision)
    },
  }
}
