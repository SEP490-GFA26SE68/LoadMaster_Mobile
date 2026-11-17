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

    // Hero Card có cả trạng thái chính và trạng thái phụ (sub-status)
    expect(screen.getByText('Đang xếp hàng')).toBeOnTheScreen()
    expect(screen.getByText('Xếp xong — chờ xuất phát')).toBeOnTheScreen()

    // Kho xuất phát
    expect(await screen.findByText('Kho Long Bình')).toBeOnTheScreen()

    // Phương tiện vận chuyển mặc định đóng dạng dropdown, bấm để mở xem đầy đủ thông tin
    expect(screen.getByText('Phương tiện vận chuyển')).toBeOnTheScreen()
    expect(screen.queryByText('Thể tích thùng:')).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: /Phương tiện vận chuyển/ }))
    expect(await screen.findByText('Biển số xe:')).toBeOnTheScreen()
    expect(screen.getByText('Loại xe:')).toBeOnTheScreen()
    expect(screen.getByText('Thể tích thùng:')).toBeOnTheScreen()
    expect(screen.getByText('8.43 m³')).toBeOnTheScreen()

    // Không còn phần Tổng quan chuyến thừa
    expect(screen.queryByText('Tổng quan chuyến')).toBeNull()

    // Điểm dừng mặc định đóng dạng dropdown (chỉ hiện địa chỉ trước khi mở)
    expect(screen.queryByText('Thông tin khách nhận')).toBeNull()
    const stopButtons = screen.getAllByRole('button', { name: /^\d+\s/ })
    expect(stopButtons.length).toBeGreaterThan(0)
    for (const btn of stopButtons) {
      await fireEvent.press(btn)
    }

    // Trạng thái điểm dừng đã Việt hóa và có nhãn Thông tin khách nhận sau khi mở dropdown
    expect(screen.getAllByText('Chờ giao').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Giao hàng').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Thông tin khách nhận').length).toBeGreaterThan(0)

    // Kiện hàng tại điểm mặc định đóng dạng dropdown, bấm để mở xem danh sách kiện
    expect(screen.queryByText(/PKG-004/)).toBeNull()
    const packageToggles = screen.getAllByRole('button', { name: /Kiện hàng tại điểm/ })
    for (const toggle of packageToggles) {
      await fireEvent.press(toggle)
    }
    expect(await screen.findByText(/PKG-004/)).toBeOnTheScreen()
    expect(screen.getAllByText(/Kích thước: .* cm/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Đã xếp lên xe').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Hàng tiêu chuẩn|Dễ vỡ/).length).toBeGreaterThan(0)
  })

  test('bấm nút gọi điện mở liên kết điện thoại tel:', async () => {
    await renderApp(<DriverTripDetailScreen tripId={LOADED_TRIP} />)

    await screen.findByRole('header', { name: LOADED_TRIP })
    const stopButtons = screen.getAllByRole('button', { name: /^\d+\s/ })
    for (const btn of stopButtons) {
      await fireEvent.press(btn)
    }

    const callButtons = await screen.findAllByRole('button', { name: 'Gọi điện' })
    expect(callButtons.length).toBeGreaterThan(0)

    const firstButton = callButtons[0]
    if (firstButton === undefined) throw new Error('Không tìm thấy nút gọi điện')
    await fireEvent.press(firstButton)
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

    // Điều phối viên mặc định đóng dạng dropdown, bấm để mở nút gọi
    expect(await screen.findByText('Điều phối viên phụ trách')).toBeOnTheScreen()
    expect(screen.queryByText('Gọi điều phối')).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: /Điều phối viên phụ trách/ }))
    expect(await screen.findByText('Gọi điều phối')).toBeOnTheScreen()

    // Quãng đường và thời gian
    expect(screen.getByText(/Tổng quãng đường: 45.2 km/)).toBeOnTheScreen()

    // Nút chỉ đường tới kho
    const navDepot = screen.getByRole('button', { name: 'Chỉ đường tới kho' })
    fireEvent.press(navDepot)
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('google.com/maps/dir/'))

    // Nút chỉ đường tới điểm dừng (sau khi mở dropdown điểm dừng)
    const stopButtons = screen.getAllByRole('button', { name: /^\d+\s/ })
    for (const btn of stopButtons) {
      await fireEvent.press(btn)
    }
    const navButtons = screen.getAllByRole('button', { name: 'Chỉ đường' })
    expect(navButtons.length).toBeGreaterThan(0)
    const firstNav = navButtons[0]
    if (firstNav === undefined) throw new Error('Không tìm thấy nút chỉ đường')
    await fireEvent.press(firstNav)
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('google.com/maps/dir/'))
  })
})
