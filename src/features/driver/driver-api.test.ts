import { getMockDb, resetMockDb } from '@/data/mock-db'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'

import { fetchMyTrips } from './driver-api'
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
