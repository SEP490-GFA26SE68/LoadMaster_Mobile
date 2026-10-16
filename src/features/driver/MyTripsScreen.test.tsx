import { screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'
import { clearStored, renderApp } from '@/test/render'

import { fetchMyTrips } from './driver-api'
import { MY_TRIP_GROUPS } from './my-trips'
import { MyTripsScreen } from './MyTripsScreen'

const driver = DEMO_ACCOUNTS.find((account) => account.role === 'driver')

describe('màn Chuyến của tôi', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
  })

  test('tài xế thấy chuyến của mình theo nhóm, mỗi chuyến kèm chip trạng thái', async () => {
    await getMockDb().authenticate(driver?.email ?? '', SEED_PASSWORD)
    const { groups } = await fetchMyTrips()
    const first = MY_TRIP_GROUPS.flatMap((group) => groups[group])[0]
    if (first === undefined) throw new Error('seed không có chuyến nào cho tài xế mẫu')

    await renderApp(<MyTripsScreen />, { auth: createMockAuth() })
    expect(await screen.findByRole('header', { name: 'Chuyến của tôi' })).toBeOnTheScreen()
    expect(await screen.findByText(first.code)).toBeOnTheScreen()
    if (first.name !== undefined) expect(screen.getByText(first.name)).toBeOnTheScreen()
  })

  test('chưa có phiên ở kho: hiện lỗi kèm nút thử lại, không hiện danh sách rỗng', async () => {
    await renderApp(<MyTripsScreen />, { auth: createMockAuth() })
    expect(await screen.findByText('Phiên đăng nhập đã hết, hãy đăng nhập lại.')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen()
  })
})
