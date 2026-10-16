import { configure, fireEvent, screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { SEED_PASSWORD } from '@/lib/mock-db'
import { DRIVER_EMAIL, LOADED_TRIP } from '@/test/driver-flow'
import { router } from '@/test/native-mocks'
import { clearStored, renderApp, signInAs } from '@/test/render'

import { NotificationBell } from './NotificationBell'
import { resetReadNotifications } from './notification-read'
import { NotificationsScreen } from './NotificationsScreen'
import { tripPath } from './TripCard'

configure({ asyncUtilTimeout: 5000 })

const renderNotifications = () =>
  renderApp(
    <>
      <NotificationBell />
      <NotificationsScreen />
    </>,
    { auth: createMockAuth() },
  )

describe('thông báo của tài xế', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
    resetReadNotifications()
  })

  test('điều phối viên huỷ chuyến của mình: chuông báo chưa đọc, đánh dấu đã đọc, mở được chuyến', async () => {
    await getMockDb().authenticate('dieuphoi@loadmaster.vn', SEED_PASSWORD)
    await getMockDb().cancelTrip(LOADED_TRIP, 'Khách hoãn nhận hàng')
    await signInAs(DRIVER_EMAIL)
    await renderNotifications()

    expect(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' })).toBeOnTheScreen()
    expect(screen.getByText('1 chưa đọc')).toBeOnTheScreen()
    const row = screen.getByRole('button', { name: /^Chưa đọc, .+, Chuyến đã huỷ, Chuyến TRIP-010 · .+, Lý do: Khách hoãn nhận hàng, Đã lên xe: \d+$/ })

    await fireEvent.press(screen.getByRole('button', { name: 'Đánh dấu đã đọc' }))
    expect(await screen.findByRole('button', { name: 'Thông báo' })).toBeOnTheScreen()
    expect(screen.queryByText('1 chưa đọc')).toBeNull()
    expect(row).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: /Chuyến đã huỷ/ }))
    expect(router.push).toHaveBeenCalledWith(tripPath(LOADED_TRIP))
  })

  test('việc chính mình làm không thành thông báo', async () => {
    await signInAs(DRIVER_EMAIL)
    await getMockDb().startDelivery(LOADED_TRIP)
    await renderNotifications()

    expect(await screen.findByText('Không có thông báo nào trong 7 ngày qua.')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Thông báo' })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Đánh dấu đã đọc' })).toBeNull()
  })
})
