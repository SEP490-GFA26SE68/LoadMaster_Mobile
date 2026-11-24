import { getMockDb, resetMockDb } from '@/data/mock-db'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'

import { fetchMyTrips, fetchTripDetail } from './driver-api'
import { MY_TRIP_GROUPS } from './my-trips'

const emailOf = (role: string) => DEMO_ACCOUNTS.find((account) => account.role === role)?.email ?? ''

describe('fetchMyTrips trên kho mẫu', () => {
  beforeEach(resetMockDb)

  test('chưa đăng nhập: NOT_SIGNED_IN', async () => {
    await expect(fetchMyTrips()).rejects.toMatchObject({ code: 'NOT_SIGNED_IN' })
  })

  test('tài xế chỉ thấy chuyến gán cho mình, chia đúng bốn nhóm', async () => {
    const db = getMockDb()
    const driver = await db.authenticate(emailOf('driver'), SEED_PASSWORD)
    const mine = (await db.listTrips()).filter((trip) => trip.driverId === driver.id && trip.phase !== 'planning' && trip.phase !== 'cancelled')

    const { groups } = await fetchMyTrips()
    expect(Object.keys(groups).sort()).toEqual([...MY_TRIP_GROUPS].sort())
    const shown = MY_TRIP_GROUPS.flatMap((group) => groups[group])
    expect(shown.length).toBeGreaterThan(0)
    // "Đã giao gần đây" chỉ giữ vài chuyến mới nhất nên số hiện ra không vượt số chuyến của tài xế
    expect(shown.length).toBeLessThanOrEqual(mine.length)
    expect(shown.every((row) => mine.some((trip) => trip.id === row.id))).toBe(true)
    expect(groups.inTransit.every((row) => row.status === 'IN_TRANSIT')).toBe(true)
    expect(groups.recent.every((row) => row.status === 'DELIVERED')).toBe(true)
  })
})

describe('fetchTripDetail trên kho mẫu', () => {
  beforeEach(resetMockDb)

  test('chưa đăng nhập: NOT_SIGNED_IN', async () => {
    await expect(fetchTripDetail('TRIP-009')).rejects.toMatchObject({ code: 'NOT_SIGNED_IN' })
  })

  test('tài xế được gán lấy đầy đủ chi tiết chuyến: kho, xe, các điểm giao và kiện hàng', async () => {
    const db = getMockDb()
    await db.authenticate('bao.ngo@loadmaster.vn', SEED_PASSWORD)
    const detail = await fetchTripDetail('TRIP-009')
    expect(detail.id).toBe('TRIP-009')
    expect(detail.stops.length).toBeGreaterThan(0)
    const firstStop = detail.stops[0]
    if (firstStop === undefined) throw new Error('Không có điểm dừng nào')
    expect(firstStop).toHaveProperty('number')
    expect(firstStop).toHaveProperty('contactName')
    expect(firstStop.packages.length).toBeGreaterThan(0)
  })

  test('tài xế khác không xem được chi tiết chuyến của người khác', async () => {
    await getMockDb().authenticate(emailOf('driver'), SEED_PASSWORD)
    await expect(fetchTripDetail('TRIP-009')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

