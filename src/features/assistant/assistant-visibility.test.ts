import type { User } from '@/types/user'

import { assistantCapabilities } from './assistant-api'
import { assistantShown } from './assistant-visibility'

jest.mock('./assistant-api', () => ({ assistantCapabilities: jest.fn(() => ({ available: true })) }))

const available = jest.mocked(assistantCapabilities)

const user = (extra: Partial<User> = {}): User => ({
  id: '15',
  fullName: 'Phạm Văn Tài',
  email: 'taixe@loadmaster.vn',
  phone: '',
  role: 'driver',
  status: 'active',
  lastActiveAt: null,
  companyId: 'LOG-001',
  ...extra,
})

describe('assistantShown: điều kiện của nút trợ lý', () => {
  beforeEach(() => available.mockReturnValue({ available: true }))

  test('tài xế và nhân viên kho đăng nhập bằng máy chủ thì có nút', () => {
    expect(assistantShown(user())).toBe(true)
    expect(assistantShown(user({ role: 'warehouse' }))).toBe(true)
  })

  test('kho mẫu (trợ lý không có nguồn) thì không có nút', () => {
    available.mockReturnValue({ available: false })
    expect(assistantShown(user())).toBe(false)
  })

  test('chưa đăng nhập, bị gắn cờ, công ty hết gói, hay vai trò khác thì không có nút', () => {
    expect(assistantShown(null)).toBe(false)
    expect(assistantShown(user({ status: 'flagged' }))).toBe(false)
    expect(assistantShown(user({ subscriptionExpired: true }))).toBe(false)
    expect(assistantShown(user({ role: 'dispatcher' }))).toBe(false)
  })
})
