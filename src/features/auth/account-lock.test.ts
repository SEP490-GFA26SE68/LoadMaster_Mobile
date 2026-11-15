import type { User } from '@/types/user'

import { accountLockOf, lockedUser } from './account-lock'

const driver: User = { id: '15', fullName: 'Trần Văn Bình', email: 'binh@longbinh.vn', phone: '', role: 'driver', status: 'active', lastActiveAt: null, companyId: '3' }

describe('accountLockOf', () => {
  test('chưa đăng nhập, hay tài khoản không mang cờ nào (kho mẫu): không khoá', () => {
    expect(accountLockOf(null)).toBeNull()
    expect(accountLockOf(driver)).toBeNull()
    expect(accountLockOf({ ...driver, subscriptionExpired: false, userType: 'TRIAL' })).toBeNull()
  })

  test('gói cước của công ty hết hạn: khoá nhân sự công ty, trừ quản trị công ty', () => {
    for (const role of ['driver', 'warehouse', 'dispatcher', 'companyManager'] as const) {
      expect(accountLockOf({ ...driver, role, subscriptionExpired: true })).toBe('subscriptionExpired')
    }
    expect(accountLockOf({ ...driver, role: 'companyAdmin', subscriptionExpired: true })).toBeNull()
    expect(accountLockOf({ ...driver, role: 'systemSupporter', subscriptionExpired: true })).toBeNull()
  })

  test('tài khoản bị gắn cờ: khoá với mọi vai trò, trước cả lý do gói cước', () => {
    expect(accountLockOf({ ...driver, status: 'flagged', subscriptionExpired: true })).toBe('flagged')
    expect(accountLockOf({ ...driver, role: 'companyAdmin', status: 'flagged' })).toBe('flagged')
  })
})

test('lockedUser: tin mã máy chủ vừa trả khi không đọc lại được hồ sơ', () => {
  expect(accountLockOf(lockedUser(driver, 'SUBSCRIPTION_EXPIRED'))).toBe('subscriptionExpired')
  expect(accountLockOf(lockedUser(driver, 'ACCOUNT_FLAGGED'))).toBe('flagged')
  expect(lockedUser(driver, 'ACCESS_DENIED')).toBe(driver)
})
