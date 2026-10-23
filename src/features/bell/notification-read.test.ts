import { act, renderHook } from '@testing-library/react-native'

import { markNotificationsRead, resetReadNotifications, useReadNotifications, type NotificationReader } from './notification-read'

const HAI: NotificationReader = { id: 'US-0003', role: 'warehouse', email: 'kho@loadmaster.vn' }

beforeEach(resetReadNotifications)

test('dấu đã đọc theo người đọc: cùng mã mà khác email (tài khoản backend mượn mã của tài khoản mẫu) hay khác vai trò là người đọc khác', async () => {
  const hai = await renderHook(() => useReadNotifications(HAI))
  const borrowedId = await renderHook(() => useReadNotifications({ ...HAI, email: 'thu.kho@congty-khac.vn' }))
  const otherRole = await renderHook(() => useReadNotifications({ ...HAI, role: 'driver' }))

  await act(() => markNotificationsRead(HAI, ['EV-000170']))

  expect([...hai.result.current]).toStrictEqual(['EV-000170'])
  expect(borrowedId.result.current.size).toBe(0)
  expect(otherRole.result.current.size).toBe(0)
})

test('chưa có người đăng nhập: không ghi, không đọc gì', async () => {
  const nobody = await renderHook(() => useReadNotifications(null))
  await act(() => markNotificationsRead(null, ['EV-000170']))

  expect(nobody.result.current.size).toBe(0)
  const hai = await renderHook(() => useReadNotifications(HAI))
  expect(hai.result.current.size).toBe(0)
})
