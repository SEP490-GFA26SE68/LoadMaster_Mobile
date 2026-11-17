import { fireEvent, screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored, renderApp } from '@/test/render'

import { fetchMyTrips } from './driver-api'
import { MY_TRIP_GROUPS } from './my-trips'
import { MyTripsScreen } from './MyTripsScreen'
import { driverTripDetailPath } from './TripCard'

const driver = DEMO_ACCOUNTS.find((account) => account.role === 'driver')

describe('màn Chuyến của tôi', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
  })

  test('tài xế thấy chuyến đang hoạt động với thông tin cơ bản (không hiện chi tiết điểm dừng, tách lịch sử đã giao)', async () => {
    await getMockDb().authenticate(driver?.email ?? '', SEED_PASSWORD)
    const { groups } = await fetchMyTrips()
    const first = MY_TRIP_GROUPS.filter((g) => g !== 'recent').flatMap((group) => groups[group])[0]
    if (first === undefined) throw new Error('seed không có chuyến nào cho tài xế mẫu')

    await renderApp(<MyTripsScreen />, { auth: createMockAuth() })
    expect(await screen.findByRole('header', { name: 'Chuyến của tôi' })).toBeOnTheScreen()
    expect(await screen.findByText(first.code)).toBeOnTheScreen()
    if (first.name !== undefined) expect(screen.getByText(first.name)).toBeOnTheScreen()

    // Không tự hiện mục Đã giao gần đây trên màn chính; có nút chuyển sang Lịch sử giao
    expect(screen.queryByText('Đã giao gần đây')).toBeNull()
    const historyBtn = screen.getByRole('button', { name: 'Lịch sử giao' })
    await fireEvent.press(historyBtn)
    expect(router.push).toHaveBeenCalledWith('/driver-history')

    // Không hiện chi tiết địa chỉ điểm giao trên thẻ danh sách chuyến
    expect(screen.queryByText(/Địa chỉ điểm giao hàng/)).toBeNull()
    // Hiện các thông tin cơ bản (tổng khối lượng kiện, số lượng kiện)
    expect(screen.getAllByText(/Tổng khối lượng kiện/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Số lượng kiện/).length).toBeGreaterThan(0)
  })

  test('bấm Chi tiết chuyến điều hướng tới /driver-trip/{id}', async () => {
    await getMockDb().authenticate(driver?.email ?? '', SEED_PASSWORD)
    const { groups } = await fetchMyTrips()
    const first = MY_TRIP_GROUPS.flatMap((group) => groups[group])[0]
    if (first === undefined) throw new Error('seed không có chuyến nào cho tài xế mẫu')

    await renderApp(<MyTripsScreen />, { auth: createMockAuth() })
    const menuButtons = await screen.findAllByRole('button', { name: 'Tùy chọn' })
    expect(menuButtons.length).toBeGreaterThan(0)

    const firstMenuButton = menuButtons[0]
    if (firstMenuButton === undefined) throw new Error('Không có nút Tùy chọn')
    fireEvent.press(firstMenuButton)

    const detailButton = await screen.findByRole('button', { name: 'Chi tiết chuyến' })
    fireEvent.press(detailButton)
    expect(router.push).toHaveBeenCalledWith(driverTripDetailPath(first.id))
  })

  test('chưa có phiên ở kho: hiện lỗi kèm nút thử lại, không hiện danh sách rỗng', async () => {
    await renderApp(<MyTripsScreen />, { auth: createMockAuth() })
    expect(await screen.findByText('Phiên đăng nhập đã hết, hãy đăng nhập lại.')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen()
  })
})
