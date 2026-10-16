import { configure, fireEvent, screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { departLoadedTrip, DRIVER_EMAIL, labelsAt, LOADED_TRIP, renderTrip, unloadAllButLast } from '@/test/driver-flow'
import { resetNativeMocks, router, setCameraPermission } from '@/test/native-mocks'
import { clearStored, signInAs } from '@/test/render'

// Mỗi lần ghi, màn đọc lại cả chuyến từ kho mẫu: cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

const CODE_FIELD = 'Mã QR hoặc mã bên gửi'

/** Mở tờ đối chiếu kiện dỡ của điểm 1, rồi sang tab `tab` khi có. */
async function openVerify(tab?: 'Gõ mã' | 'Xác nhận tay') {
  await fireEvent.press(await screen.findByRole('button', { name: 'Đối chiếu kiện dỡ' }))
  expect(await screen.findByRole('header', { name: 'Đối chiếu kiện dỡ tại điểm 1' })).toBeOnTheScreen()
  if (tab !== undefined) await fireEvent.press(screen.getByRole('tab', { name: tab }))
}

async function typeCode(code: string) {
  await fireEvent.changeText(screen.getByLabelText(CODE_FIELD), code)
  await fireEvent.press(screen.getByRole('button', { name: 'Đối chiếu mã' }))
}

describe('màn chuyến của tài xế', () => {
  beforeEach(async () => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
    await signInAs(DRIVER_EMAIL)
  })

  test('kho đã xếp xong: Xuất phát, rồi Đã đến điểm 1 mới mở việc dỡ hàng', async () => {
    await renderTrip()
    expect(await screen.findByRole('header', { name: 'Điểm 1 / 3' })).toBeOnTheScreen()
    expect(screen.getByText('Kho đã xếp xong. Bấm Xuất phát khi xe rời kho.')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Đối chiếu kiện dỡ' })).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Xuất phát' }))
    await fireEvent.press(await screen.findByRole('button', { name: 'Đã đến điểm 1' }))

    expect(await screen.findByRole('button', { name: 'Đối chiếu kiện dỡ' })).toBeOnTheScreen()
    expect(screen.getByText(/^Đã đến điểm 1 lúc /)).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Báo sự cố' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Hoàn tất điểm giao' })).toBeDisabled()
  })

  test('kho đang xếp: chỉ xem trước, không có nút chính', async () => {
    await signInAs('nam.dang@loadmaster.vn')
    await renderTrip('TRIP-011')
    expect(await screen.findByText('Kho chưa xếp xong chuyến này: bạn xem trước được, chưa xuất phát được.')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Xuất phát' })).toBeNull()
    expect(screen.queryByRole('switch', { name: 'Dùng GPS thật' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sự cố trên đường' })).toBeNull()
  })

  test('gõ mã: kiện của điểm khác chỉ được báo, kiện của điểm này ghi Đã dỡ', async () => {
    await departLoadedTrip({ arrive: true })
    const [here] = await labelsAt(1)
    const [elsewhere] = await labelsAt(2)
    if (here === undefined || elsewhere === undefined) throw new Error('chuyến mẫu thiếu kiện ở điểm 1 hoặc 2')
    await renderTrip()
    await openVerify('Gõ mã')

    await typeCode(elsewhere.qrToken)
    expect(await screen.findByText(/thuộc điểm 2 · .+, không phải điểm này\. Chưa ghi gì/)).toBeOnTheScreen()
    expect(screen.getByLabelText(CODE_FIELD)).toHaveDisplayValue(elsewhere.qrToken)

    // Chữ thường cũng được, như gợi ý của ô nói
    await typeCode(here.qrToken.toLowerCase())
    expect(await screen.findByText(new RegExp(`^Vừa dỡ ${here.packageInstanceId} · `))).toBeOnTheScreen()
    expect(screen.getByLabelText(CODE_FIELD)).toHaveDisplayValue('')
    expect(screen.getByText('Đã dỡ · gõ mã')).toBeOnTheScreen()
  })

  test('quét QR bằng camera ghi kiện Đã dỡ', async () => {
    await departLoadedTrip({ arrive: true })
    const labels = await labelsAt(1)
    const [first] = labels
    if (first === undefined) throw new Error('chuyến mẫu không có kiện nào ở điểm 1')
    await renderTrip()
    await openVerify()

    await fireEvent(screen.getByTestId('qr-camera', { includeHiddenElements: true }), 'barcodeScanned', { data: first.qrToken })
    expect(await screen.findByText(new RegExp(`^Vừa dỡ ${first.packageInstanceId} · `))).toBeOnTheScreen()
    expect(screen.getByText(`Cần dỡ ${labels.length} kiện · Đã dỡ 1 · Sự cố 0`)).toBeOnTheScreen()
    expect(screen.getByText('Đã dỡ · quét QR')).toBeOnTheScreen()
  })

  test('camera bị từ chối hẳn: nói cách cấp quyền, vẫn gõ mã được', async () => {
    setCameraPermission(false, false)
    await departLoadedTrip({ arrive: true })
    await renderTrip()
    await openVerify()

    expect(screen.getByText(/^Chưa được phép dùng camera\./)).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Mở Cài đặt' })).toBeOnTheScreen()
    expect(screen.queryByTestId('qr-camera', { includeHiddenElements: true })).toBeNull()
    await fireEvent.press(screen.getByRole('tab', { name: 'Gõ mã' }))
    expect(screen.getByLabelText(CODE_FIELD)).toBeOnTheScreen()
  })

  test('dỡ kiện cuối thì tờ tự đóng; hoàn tất hỏi lại rồi sang điểm 2', async () => {
    await departLoadedTrip({ arrive: true })
    const { last, total } = await unloadAllButLast()
    await renderTrip()
    await openVerify('Gõ mã')

    await typeCode(last.qrToken)
    expect(await screen.findByText('Mọi kiện của điểm này đã dỡ hoặc đã báo sự cố.')).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Đối chiếu kiện dỡ tại điểm 1' })).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Hoàn tất điểm giao' }))
    expect(await screen.findByRole('header', { name: /^Hoàn tất điểm 1 — / })).toBeOnTheScreen()
    expect(screen.getByText(`${total} kiện đã dỡ được ghi Đã giao.`)).toBeOnTheScreen()
    expect(screen.getByText(/^Tiếp theo: điểm 2 · /)).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Hoàn tất' }))
    expect(await screen.findByRole('header', { name: 'Điểm 2 / 3' })).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: /^Hoàn tất điểm/ })).toBeNull()
  })

  test('xác nhận tay kiện cuối: chờ điều phối viên duyệt, chưa hoàn tất điểm được', async () => {
    await departLoadedTrip({ arrive: true })
    await unloadAllButLast()
    await renderTrip()
    await openVerify('Xác nhận tay')

    await fireEvent.press(screen.getByRole('radio', { name: 'Nhãn rách / mất' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi xác nhận tay' }))
    expect(
      await screen.findByText('Còn 1 xác nhận tay của điểm này chờ điều phối viên duyệt — chưa hoàn tất điểm giao được.'),
    ).toBeOnTheScreen()
    expect(screen.getByText('Đã dỡ · xác nhận tay, chờ duyệt')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Hoàn tất điểm giao' })).toBeDisabled()
  })

  test('chuyến đã giao: tổng kết chuyến, nút về danh sách', async () => {
    await renderTrip('TRIP-002')
    expect(await screen.findByRole('header', { name: 'Tổng kết chuyến' })).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Đã giao xong chuyến TRIP-002' })).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Điểm giao' })).toBeOnTheScreen()

    const [footer] = screen.getAllByRole('button', { name: 'Về danh sách chuyến' }).slice(-1)
    if (footer === undefined) throw new Error('màn tổng kết không có nút về danh sách')
    await fireEvent.press(footer)
    expect(router.dismissTo).toHaveBeenCalledWith('/trips')
  })

  test('chuyến đã huỷ: nói lý do, nút về danh sách', async () => {
    await getMockDb().cancelTrip(LOADED_TRIP, 'Khách hoãn nhận hàng')
    await renderTrip()
    expect(await screen.findByRole('header', { name: 'Chuyến đã huỷ' })).toBeOnTheScreen()
    expect(screen.getByText(`Chuyến ${LOADED_TRIP} đã huỷ: Khách hoãn nhận hàng`)).toBeOnTheScreen()
    expect(screen.getAllByRole('button', { name: 'Về danh sách chuyến' })).toHaveLength(2)
  })
})
