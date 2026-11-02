import { getMockDb, resetMockDb } from '@/data/mock-db'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'

import { createPickupRequest, fetchMyTrips } from './driver-api'
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

describe('createPickupRequest trên kho mẫu', () => {
  beforeEach(resetMockDb)

  const input = {
    pickup: { name: 'Kho Minh Phát', address: 'KCN VSIP 1, Thuận An', lat: 10.928, lng: 106.712 },
    delivery: { name: 'Bếp ăn Sóng Thần', address: 'KCN Sóng Thần, Dĩ An', lat: 10.894, lng: 106.751 },
    packages: [{ packageCode: 'MP-001', lengthCm: 60, widthCm: 40, heightCm: 40, weightKg: 12, handlingClass: 'STANDARD' as const }],
  }

  test('tài xế của chuyến đang chạy gửi yêu cầu: kho kiểm mười luật, trả kèm các điểm của chuyến', async () => {
    const db = getMockDb()
    await db.authenticate('bao.ngo@loadmaster.vn', SEED_PASSWORD)
    const { request, stops } = await createPickupRequest('TRIP-009', input)
    expect([request.id, request.tripId, request.createdBy, request.validationResults.length]).toStrictEqual(['PKR-002', 'TRIP-009', 'US-0006', 10])
    expect(stops.map((stop) => stop.id)).toStrictEqual((await db.getTrip('TRIP-009')).stops.map((stop) => stop.id))
  })

  test('tài xế khác không gửi được yêu cầu cho chuyến không phải của mình', async () => {
    await getMockDb().authenticate(emailOf('driver'), SEED_PASSWORD)
    await expect(createPickupRequest('TRIP-009', input)).rejects.toMatchObject({ code: 'ROLE_NOT_ALLOWED' })
  })
})
