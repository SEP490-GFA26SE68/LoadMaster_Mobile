import { getMockDb } from '@/data/mock-db'
import { MockDbError, vnDate } from '@/lib/mock-db'

import type { DashboardApi } from './dashboard-api'
import type { DateRange } from './dashboard-period'
import { summarizeDashboard, type DashboardData } from './dashboard-summary'

/*
 * Nguồn kho mẫu của tab Tổng quan, như `dashboard-api.ts` của web: kho biết người đang đăng nhập và chỉ trả dữ liệu của công ty người đó;
 * số của kỳ tính trên máy (`summarizeDashboard`). Không có phiên thì kho mẫu không lọc gì, nên lần đọc đòi phiên trước (`NOT_SIGNED_IN`).
 */

/** Dữ liệu thô của công ty người đang đăng nhập: mọi chuyến kèm revision, xe, trạng thái xe, tên người dùng. */
export async function fetchDashboardData(): Promise<DashboardData> {
  const db = getMockDb()
  if (!db.sessionUser()) throw new MockDbError('NOT_SIGNED_IN', {})
  // "Hôm nay" theo giờ Việt Nam lúc đọc, như bản web
  const today = vnDate(new Date())
  const [trips, vehicles, vehicleStates, users] = await Promise.all([db.listTrips(), db.listVehicles(), db.listVehicleStates(), db.listUsers()])
  // Kho chưa có hàm liệt kê revision của mọi chuyến nên đọc theo từng chuyến, như bản web
  const revisions = await Promise.all(trips.map((trip) => db.listRevisions(trip.id)))
  return { today, trips: trips.map((trip, index) => ({ trip, revisions: revisions[index] ?? [] })), vehicles, vehicleStates, users }
}

/** Kho mẫu làm được mọi việc của tab Tổng quan; chuyến mở được khi màn chuyến cũng đọc kho mẫu. */
export function mockDashboardApi({ tripLinks }: { readonly tripLinks: boolean }): DashboardApi {
  return {
    capabilities: { backend: false, tripDetails: true, tripLinks, allTrips: true },
    async fetchDashboardSummary(period: DateRange) {
      return summarizeDashboard(await fetchDashboardData(), period)
    },
  }
}
