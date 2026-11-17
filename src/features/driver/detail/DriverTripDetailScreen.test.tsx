import { configure, fireEvent, screen } from '@testing-library/react-native'
import { Linking } from 'react-native'

import { resetMockDb } from '@/data/mock-db'
import { DRIVER_EMAIL, LOADED_TRIP } from '@/test/driver-flow'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored, renderApp, signInAs } from '@/test/render'

import { DriverTripDetailScreen } from './DriverTripDetailScreen'

configure({ asyncUtilTimeout: 5000 })

describe('màn hình Chi tiết chuyến đi của tài xế', () => {
  beforeEach(async () => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never)
    await signInAs(DRIVER_EMAIL)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('tài xế thấy đầy đủ thông tin kho, xe, bản đồ, các điểm dừng và kiện hàng', async () => {
    await renderApp(<DriverTripDetailScreen tripId={LOADED_TRIP} />)

    // Mã chuyến và tiêu đề
    expect(await screen.findByRole('header', { name: LOADED_TRIP })).toBeOnTheScreen()

    // Kho xuất phát
    expect(await screen.findByText('Kho Long Bình')).toBeOnTheScreen()

    // Phương tiện vận chuyển
    expect(screen.getByText('Phương tiện vận chuyển')).toBeOnTheScreen()

    // Điểm dừng và kiện hàng
    expect(await screen.findByText('PKG-004')).toBeOnTheScreen()
  })

  test('bấm nút gọi điện mở liên kết điện thoại tel:', async () => {
    await renderApp(<DriverTripDetailScreen tripId={LOADED_TRIP} />)

    const callButtons = await screen.findAllByRole('button', { name: 'Gọi điện' })
    expect(callButtons.length).toBeGreaterThan(0)

    const firstButton = callButtons[0]
    if (firstButton === undefined) throw new Error('Không tìm thấy nút gọi điện')
    fireEvent.press(firstButton)
    expect(Linking.openURL).toHaveBeenCalledWith('tel:0938 552 109')
  })

  test('bấm nút quay lại gọi router.back', async () => {
    await renderApp(<DriverTripDetailScreen tripId={LOADED_TRIP} />)

    const backButton = await screen.findByLabelText('Quay lại')
    fireEvent.press(backButton)

    expect(router.back).toHaveBeenCalled()
  })

  test('chuyến không tồn tại: hiển thị thông báo lỗi và nút thử lại', async () => {
    await renderApp(<DriverTripDetailScreen tripId="TRIP-NON-EXISTENT" />)

    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeOnTheScreen()
  })

  test('tài xế thấy thông tin điều phối viên, quãng đường và nút chỉ đường Google Maps', async () => {
    await renderApp(<DriverTripDetailScreen tripId={LOADED_TRIP} />)

    // Điều phối viên
    expect(await screen.findByText('Điều phối viên phụ trách')).toBeOnTheScreen()
    expect(screen.getByText('Gọi điều phối')).toBeOnTheScreen()

    // Quãng đường và thời gian
    expect(screen.getByText(/Tổng quãng đường: 45.2 km/)).toBeOnTheScreen()

    // Nút chỉ đường tới kho
    const navDepot = screen.getByRole('button', { name: 'Chỉ đường tới kho' })
    fireEvent.press(navDepot)
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('google.com/maps/dir/'))

    // Nút chỉ đường tới điểm dừng
    const navButtons = screen.getAllByRole('button', { name: 'Chỉ đường' })
    expect(navButtons.length).toBeGreaterThan(0)
    const firstNav = navButtons[0]
    if (firstNav === undefined) throw new Error('Không tìm thấy nút chỉ đường')
    fireEvent.press(firstNav)
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('google.com/maps/dir/'))
  })
})
