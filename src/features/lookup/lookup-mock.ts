import { getMockDb } from '@/data/mock-db'
import { MockDbError, type MockDb, type Package } from '@/lib/mock-db'

import type { LookupApi, PackageLookup } from './lookup-api'

/*
 * Nguồn kho mẫu của Tra cứu kiện, như bản web: kho chỉ trả kiện của công ty người đang đăng nhập. Không có phiên thì kho mẫu không lọc
 * gì, nên mọi lệnh đòi phiên trước (`NOT_SIGNED_IN`).
 */

function sessionDb(): MockDb {
  const db = getMockDb()
  if (!db.sessionUser()) throw new MockDbError('NOT_SIGNED_IN', {})
  return db
}

/** Kèm loại kiện, chuyến và điểm giao đang giữ từng kiện; điểm giao đánh số theo thứ tự của chuyến, điểm đầu là 1. */
async function withPlace(db: MockDb, packages: readonly Package[]): Promise<PackageLookup[]> {
  const tripIds = [...new Set(packages.flatMap((pkg) => pkg.tripId ?? []))]
  const [types, trips] = await Promise.all([db.listPackageTypes(), Promise.all(tripIds.map((id) => db.getTrip(id)))])
  const tripById = new Map(trips.map((trip) => [trip.id, trip]))
  return packages.map((pkg) => {
    const trip = pkg.tripId === undefined ? undefined : tripById.get(pkg.tripId)
    const stopIndex = trip?.stops.findIndex((stop) => stop.id === pkg.stopId) ?? -1
    const stop = trip?.stops[stopIndex]
    return {
      package: pkg,
      type: types.find((type) => type.id === pkg.packageTypeId),
      trip: trip ? { id: trip.id, name: trip.name } : undefined,
      stop: stop ? { number: stopIndex + 1, name: stop.name } : undefined,
    }
  })
}

/** Kho mẫu làm được mọi việc của tra cứu kiện. */
export function mockLookupApi(): LookupApi {
  return {
    capabilities: { reportFound: true },
    async scanPackage(token) {
      const db = sessionDb()
      const [found] = await withPlace(db, [await db.findPackageByQr(token)])
      if (!found) throw new MockDbError('QR_UNKNOWN', { token })
      return found
    },
    async lookupPackages(code) {
      const db = sessionDb()
      return withPlace(db, await db.lookupPackages(code))
    },
    async reportPackageFound(token) {
      return sessionDb().reportPackageFound(token)
    },
  }
}
