import { fireEvent, screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored, renderApp } from '@/test/render'

import { fetchMyTrips } from './driver-api'
import { DriverTripHistoryScreen } from './DriverTripHistoryScreen'

const driver = DEMO_ACCOUNTS.find((account) => account.role === 'driver')

describe('màn Lịch sử giao hàng của tài xế', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
  })

  test('hiển thị danh sách chuyến đã giao và nút quay lại', async () => {
    await getMockDb().authenticate(driver?.email ?? '', SEED_PASSWORD)
    const trips = await fetchMyTrips()
    const delivered = trips.history ?? trips.groups.recent

    await renderApp(<DriverTripHistoryScreen />, { auth: createMockAuth() })
    expect(await screen.findByRole('header', { name: 'Lịch sử giao hàng' })).toBeOnTheScreen()

    if (delivered[0] !== undefined) {
      expect(await screen.findByText(delivered[0].code)).toBeOnTheScreen()
    }

    await fireEvent.press(screen.getByLabelText('Quay lại'))
    expect(router.back).toHaveBeenCalled()
  })
})
