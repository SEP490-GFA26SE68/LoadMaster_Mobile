import { act, configure, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Linking } from 'react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { departLoadedTrip, DRIVER_EMAIL, LOADED_TRIP, renderTrip } from '@/test/driver-flow'
import { emitPosition, failPosition, locationWatchers, resetNativeMocks, setLocation } from '@/test/native-mocks'
import { clearStored, signInAs } from '@/test/render'

// Mỗi lần ghi, màn đọc lại cả chuyến từ kho mẫu: cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

const GPS_SWITCH = 'Dùng GPS thật'

describe('việc phụ ở điểm giao', () => {
  beforeEach(async () => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
    await signInAs(DRIVER_EMAIL)
  })

  test('báo khách từ chối một kiện: dòng kiện ghi Hoàn trả, câu cảnh báo ngay trên nút chính', async () => {
    await departLoadedTrip({ arrive: true })
    await renderTrip()
    await fireEvent.press(await screen.findByRole('button', { name: 'Báo sự cố' }))
    expect(await screen.findByRole('header', { name: 'Báo sự cố tại điểm 1' })).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('radio', { name: 'Khách từ chối' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Ghi sự cố' }))
    expect(await screen.findByText(/^Khách từ chối .+: kiện ở lại xe và thành Hoàn trả khi hoàn tất điểm giao\.$/)).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Báo sự cố tại điểm 1' })).toBeNull()
    expect(screen.getByText('Sự cố: Khách từ chối')).toBeOnTheScreen()
    expect(screen.getByText('Hoàn trả — kiện ở lại xe')).toBeOnTheScreen()
  })

  test('chọn Khác mà không ghi chú: tờ báo lỗi ngay tại ô, chưa ghi gì', async () => {
    await departLoadedTrip({ arrive: true })
    await renderTrip()
    await fireEvent.press(await screen.findByRole('button', { name: 'Báo sự cố' }))
    await fireEvent.press(await screen.findByRole('radio', { name: 'Khác' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Ghi sự cố' }))

    expect(await screen.findByText('Chọn Khác thì cần ghi chú.')).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Báo sự cố tại điểm 1' })).toBeOnTheScreen()
    expect(screen.queryByText(/^Sự cố: /)).toBeNull()
  })

  test('bản đồ tuyến Goong hiện trên màn điểm giao, không mở Google Maps', async () => {
    await departLoadedTrip({ arrive: false })
    await renderTrip()
    expect(await screen.findByLabelText(/^Bản đồ tuyến tới /)).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: /Google/ })).toBeNull()
  })

  test('xe chưa rời kho: không có nút Thêm — hai việc trong tờ chỉ có khi xe đang chạy', async () => {
    await renderTrip()
    expect(await screen.findByRole('button', { name: 'Xuất phát' })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Thêm' })).toBeNull()
  })

  test('nút Thêm mở một tờ có đúng hai việc; Đóng thì tờ đóng, chưa ghi gì', async () => {
    await departLoadedTrip({ arrive: false })
    await renderTrip()
    await fireEvent.press(await screen.findByRole('button', { name: 'Thêm' }))
    expect(await screen.findByRole('header', { name: 'Thêm thao tác' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Sự cố trên đường' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Nhận hàng dọc đường' })).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByRole('header', { name: 'Thêm thao tác' })).toBeNull()
    expect(await getMockDb().listPickupRequests(LOADED_TRIP)).toEqual([])
  })

  test('sự cố trên đường: kiểm từng ô, báo xong có câu xác nhận kèm mã sự cố', async () => {
    await departLoadedTrip({ arrive: false })
    await renderTrip()
    await fireEvent.press(await screen.findByRole('button', { name: 'Thêm' }))
    await fireEvent.press(await screen.findByRole('button', { name: 'Sự cố trên đường' }))
    expect(await screen.findByRole('header', { name: `Báo sự cố chuyến ${LOADED_TRIP}` })).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Thêm thao tác' })).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Báo sự cố' }))
    expect(await screen.findByText('Chọn loại sự cố.')).toBeOnTheScreen()
    expect(screen.getByText('Nhập mô tả sự cố.')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('radio', { name: 'Tắc đường' }))
    await fireEvent.changeText(screen.getByLabelText('Mô tả'), 'Kẹt xe trên Xa lộ Hà Nội')
    await fireEvent.changeText(screen.getByLabelText('Số phút dự kiến chậm'), '20')
    await fireEvent.press(screen.getByRole('button', { name: 'Báo sự cố' }))
    expect(await screen.findByText(/^Đã báo sự cố EXC-\d+\.$/)).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: `Báo sự cố chuyến ${LOADED_TRIP}` })).toBeNull()
  })

  test('nhận hàng dọc đường: kiểm từng ô, gửi xong tờ chuyển sang mười luật thay vì đóng', async () => {
    await departLoadedTrip({ arrive: false })
    await renderTrip()
    await fireEvent.press(await screen.findByRole('button', { name: 'Thêm' }))
    await fireEvent.press(await screen.findByRole('button', { name: 'Nhận hàng dọc đường' }))
    expect(await screen.findByRole('header', { name: `Nhận hàng dọc đường — chuyến ${LOADED_TRIP}` })).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Gửi yêu cầu' }))
    expect((await screen.findAllByText('Cần nhập.')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cần chọn toạ độ.')).toHaveLength(2)
    expect(await getMockDb().listPickupRequests(LOADED_TRIP)).toEqual([])

    const [pickupName, deliveryName] = screen.getAllByLabelText('Tên điểm')
    const [pickupAddress, deliveryAddress] = screen.getAllByLabelText('Địa chỉ')
    const [pickupLat, deliveryLat] = screen.getAllByLabelText('Vĩ độ')
    const [pickupLng, deliveryLng] = screen.getAllByLabelText('Kinh độ')
    await fireEvent.changeText(pickupName!, 'Kho Bình Thọ')
    await fireEvent.changeText(pickupAddress!, '12 Đặng Văn Bi, Thủ Đức')
    await fireEvent.changeText(pickupLat!, '10,8452')
    await fireEvent.changeText(pickupLng!, '106,7601')
    await fireEvent.changeText(deliveryName!, 'Siêu thị An Phú')
    await fireEvent.changeText(deliveryAddress!, '3 Mai Chí Thọ, Thủ Đức')
    await fireEvent.changeText(deliveryLat!, '10.8010')
    await fireEvent.changeText(deliveryLng!, '106.7415')
    await fireEvent.changeText(screen.getByLabelText('Mã của bên gửi'), 'BG-0001')
    await fireEvent.changeText(screen.getByLabelText('Dài (cm)'), '40')
    await fireEvent.changeText(screen.getByLabelText('Rộng (cm)'), '30')
    await fireEvent.changeText(screen.getByLabelText('Cao (cm)'), '30')
    await fireEvent.changeText(screen.getByLabelText('Khối lượng (kg)'), '8,5')
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi yêu cầu' }))

    expect(await screen.findByText(/^Đã gửi yêu cầu PKR-\d+\.$/)).toBeOnTheScreen()
    const [request] = await getMockDb().listPickupRequests(LOADED_TRIP)
    expect(request).toMatchObject({ pickup: { name: 'Kho Bình Thọ', lat: 10.8452, lng: 106.7601 }, packages: [{ packageCode: 'BG-0001', weightKg: 8.5 }] })
    const id = request?.id
    expect(screen.getByRole('header', { name: `Yêu cầu ${id}` })).toBeOnTheScreen()
    expect(screen.getByText(`Đã gửi yêu cầu ${id}.`)).toBeOnTheScreen()
    expect(screen.getAllByLabelText(/^\d+\. .+, (Đạt|Không đạt)\. /)).toHaveLength(10)
    expect(screen.getByLabelText(/^1\. Điểm nhận gần tuyến, Đạt\. /)).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByRole('header', { name: `Yêu cầu ${id}` })).toBeNull()
  })

  test('bật GPS thật: gửi vị trí của điện thoại; tắt thì vị trí xe về mô phỏng', async () => {
    await departLoadedTrip({ arrive: false })
    await renderTrip()
    await fireEvent.press(await screen.findByRole('switch', { name: GPS_SWITCH }))
    expect(screen.getByRole('switch', { name: GPS_SWITCH })).toBeChecked()
    expect(screen.getByText('Đang chờ quyền vị trí và tín hiệu GPS…')).toBeOnTheScreen()

    await waitFor(() => expect(locationWatchers()).toBe(1))
    await act(async () => emitPosition({ latitude: 10.8512, longitude: 106.7718, speed: 10, heading: 90 }))
    expect(await screen.findByText(/^Đã gửi vị trí lúc .+\. Gửi lại mỗi 30 giây\.$/)).toBeOnTheScreen()
    expect(await getMockDb().getLatestLocation(LOADED_TRIP)).toMatchObject({ source: 'GPS', lat: 10.8512, lng: 106.7718 })

    await fireEvent.press(screen.getByRole('switch', { name: GPS_SWITCH }))
    expect(await screen.findByText('Đã tắt GPS thật. Vị trí xe về mô phỏng.')).toBeOnTheScreen()
    expect(locationWatchers()).toBe(0)
  })

  test('mất tín hiệu GPS: thôi theo dõi và nói lý do', async () => {
    await departLoadedTrip({ arrive: false })
    await renderTrip()
    await fireEvent.press(await screen.findByRole('switch', { name: GPS_SWITCH }))
    await waitFor(() => expect(locationWatchers()).toBe(1))

    await act(async () => failPosition())
    expect(await screen.findByText('Mất tín hiệu GPS. Bật lại khi có tín hiệu. Vị trí xe về mô phỏng.')).toBeOnTheScreen()
    expect(screen.getByRole('switch', { name: GPS_SWITCH })).not.toBeChecked()
    expect(locationWatchers()).toBe(0)
  })

  test.each([
    ['không được phép dùng vị trí', { granted: false }, 'Chưa được phép dùng vị trí. Cấp quyền vị trí cho LoadMaster trong Cài đặt của máy rồi bật lại.'],
    ['định vị của máy tắt', { services: false }, 'Định vị của máy đang tắt. Bật định vị trong Cài đặt của máy rồi bật lại.'],
  ])('%s: nói lý do, có nút mở Cài đặt', async (_case, location, reason) => {
    setLocation(location)
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined)
    await departLoadedTrip({ arrive: false })
    await renderTrip()
    await fireEvent.press(await screen.findByRole('switch', { name: GPS_SWITCH }))

    expect(await screen.findByText(`${reason} Vị trí xe về mô phỏng.`)).toBeOnTheScreen()
    expect(screen.getByRole('switch', { name: GPS_SWITCH })).not.toBeChecked()
    await fireEvent.press(screen.getByRole('button', { name: 'Mở Cài đặt' }))
    expect(openSettings).toHaveBeenCalledTimes(1)
    openSettings.mockRestore()
  })
})
