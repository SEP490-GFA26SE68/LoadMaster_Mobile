import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'

import { getMockDb, resetMockDb } from './mock-db'

/** Phần logic chép từ web phải chạy được trong bộ công cụ của app: dựng seed, đăng nhập, lọc theo công ty của phiên. */
describe('kho mẫu của app', () => {
  beforeEach(resetMockDb)

  test('dựng được seed của bản web: 15 chuyến và 8 xe của Long Bình', async () => {
    const db = getMockDb()
    const dispatcher = DEMO_ACCOUNTS.find((account) => account.role === 'dispatcher')
    await db.authenticate(dispatcher?.email ?? '', SEED_PASSWORD)
    await expect(db.listTrips()).resolves.toHaveLength(15)
    await expect(db.listVehicles()).resolves.toHaveLength(8)
  })

  test('sai mật khẩu: lỗi có mã INVALID_CREDENTIALS', async () => {
    await expect(getMockDb().authenticate('taixe@loadmaster.vn', 'sai')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  test('cùng một kho giữa các lần gọi; resetMockDb trả về seed', async () => {
    expect(getMockDb()).toBe(getMockDb())
    const first = getMockDb()
    resetMockDb()
    expect(getMockDb()).not.toBe(first)
  })
})
