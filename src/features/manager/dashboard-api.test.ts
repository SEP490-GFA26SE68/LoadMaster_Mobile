import { getMockDb, resetMockDb } from '@/data/mock-db'
import { SEED_PASSWORD } from '@/lib/mock-db'
import { MANAGER_EMAIL, PHUONG_NAM_MANAGER_EMAIL } from '@/test/office-flow'

import { dashboardCapabilities, fetchDashboardSummary } from './dashboard-api'
import { fetchDashboardData } from './dashboard-mock'
import { DEFAULT_PERIOD, resolvePeriod } from './dashboard-period'

/**
 * Lớp dữ liệu của tab Tổng quan trên kho mẫu (`dashboard-mock.ts`): lần đọc đòi phiên, kho chỉ trả dữ liệu của công ty người đăng nhập,
 * "hôm nay" là ngày giờ Việt Nam lúc đọc, và kho mẫu làm được mọi việc của tab. Phép tính số của kỳ (`summarizeDashboard`) đã có test ở bản web; ở đây chỉ kiểm dữ liệu ráp đúng
 * cho phép tính đó trên seed neo 14/09/2026.
 */

const signIn = (email: string) => getMockDb().authenticate(email, SEED_PASSWORD)

beforeEach(() => {
  // Chỉ giả `Date` (10:00 giờ Việt Nam ngày neo của seed): hẹn giờ vẫn chạy thật
  jest.useFakeTimers({
    now: new Date('2026-09-14T03:00:00Z'),
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask'],
  })
  resetMockDb()
})

afterEach(() => {
  jest.useRealTimers()
})

test('chưa đăng nhập: NOT_SIGNED_IN', async () => {
  await expect(fetchDashboardSummary({ from: '2026-09-01', to: '2026-09-14' })).rejects.toMatchObject({ code: 'NOT_SIGNED_IN' })
})

test('kho mẫu có đủ mọi phần của tab; số mang MOCK RESULT', () => {
  expect(dashboardCapabilities()).toEqual({ backend: false, tripDetails: true, tripLinks: true, allTrips: true })
})

test('quản lý Long Bình: dữ liệu của Long Bình, hôm nay theo giờ Việt Nam', async () => {
  await signIn(MANAGER_EMAIL)
  const data = await fetchDashboardData()
  expect(data.today).toBe('2026-09-14')
  expect(data.trips).toHaveLength(15)
  expect(data.trips.some(({ trip }) => trip.id.startsWith('TRIP-PN-'))).toBe(false)
  // Revision đi theo đúng chuyến của nó
  expect(data.trips.every(({ trip, revisions }) => revisions.every((revision) => revision.tripId === trip.id))).toBe(true)
  expect(data.vehicles).toHaveLength(8)
  expect(data.vehicleStates.map((state) => state.vehicleId).toSorted()).toEqual(data.vehicles.map((vehicle) => vehicle.id).toSorted())
  expect(data.users.some((user) => user.fullName === 'Trần Thị Mai')).toBe(true)

  const summary = await fetchDashboardSummary(resolvePeriod({ preset: DEFAULT_PERIOD, from: '', to: '' }, data.today))
  expect(summary.period).toEqual({ from: '2026-08-16', to: '2026-09-14' })
  expect(summary).toMatchObject({ tripCount: 12, completedCount: 7, vehicles: { inUse: 3, total: 8 } })
  expect(summary.fill.isMockResult).toBe(true)
})

test('quản lý Phương Nam chỉ thấy chuyến của Phương Nam', async () => {
  await signIn(PHUONG_NAM_MANAGER_EMAIL)
  const data = await fetchDashboardData()
  expect(data.trips.length).toBeGreaterThan(0)
  expect(data.trips.every(({ trip }) => trip.id.startsWith('TRIP-PN-'))).toBe(true)
})
