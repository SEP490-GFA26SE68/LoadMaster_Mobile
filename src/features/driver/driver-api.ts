/**
 * Hàm → endpoint backend; nối backend chỉ thêm adapter `http`.
 *   GET /api/driver/trips — fetchMyTrips (dạng dữ liệu của backend còn thiếu nhóm theo trạng thái và điểm giao: chưa nối)
 */
import { createAdapter } from '@/data/adapter'
import { getMockDb } from '@/data/mock-db'
import { MockDbError } from '@/lib/mock-db'

import { isVisibleTo, myTrips, type MyTrips } from './my-trips'

/** Hợp đồng dữ liệu của màn tài xế. Màn và hook chỉ biết hợp đồng này, không biết nguồn. */
export type DriverApi = {
  fetchMyTrips(): Promise<MyTrips>
}

/** Trên kho mẫu, như bản web: kho biết người đang đăng nhập; tài xế chỉ đọc được chuyến gán cho mình. */
function mockDriverApi(): DriverApi {
  return {
    async fetchMyTrips() {
      const db = getMockDb()
      const viewer = db.sessionUser()
      if (!viewer) throw new MockDbError('NOT_SIGNED_IN', {})
      const [trips, vehicles] = await Promise.all([db.listTrips(), db.listVehicles()])
      // Chuyến còn lập kế hoạch và chuyến đã huỷ không hiện ở "Chuyến của tôi": không cần đọc revision của chúng
      const visible = trips.filter((trip) => isVisibleTo(trip, viewer) && trip.phase !== 'planning' && trip.phase !== 'cancelled')
      const entries = await Promise.all(visible.map(async (trip) => ({ trip, revisions: await db.listRevisions(trip.id) })))
      return myTrips(entries, new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.name])), viewer)
    },
  }
}

const adapter = createAdapter<DriverApi>('driver', { mock: mockDriverApi })

// GET /api/driver/trips
export function fetchMyTrips(): Promise<MyTrips> {
  return adapter().fetchMyTrips()
}
