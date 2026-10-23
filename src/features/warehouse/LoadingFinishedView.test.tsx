import { act, configure, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored, signInAs } from '@/test/render'
import { LOADED_TRIP, renderSession, stagedTwoCartonTrip, WAREHOUSE_EMAIL } from '@/test/warehouse-flow'
import { colors } from '@/theme/tokens'

/*
 * Màn Xếp xong của phiên kho (`LoadingFinishedView`), vẽ qua phiên thật (`renderSession`) trên kho mẫu: số kiện, kiện bỏ lại, theo điểm
 * giao, thông tin chuyến, và số seal niêm phong — nhập trong tờ trượt từ đáy, ghi / đổi khi xe còn ở kho, chỉ đọc khi xe đã đi.
 * `TRIP-010` của seed: 210 kiện đã xếp và đối chiếu bằng quét, ba điểm giao (120 · 45 · 45), xe Isuzu NQR 550, chưa ghi số seal.
 */

// Ghi rồi đọc lại cả chuyến (danh sách chuyến của kho đọc lại sau): cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

const BACK = 'Về danh sách chuyến'
const SUBMIT = 'Ghi số seal'
const RECORDED = /^Số seal SEAL-0915 · ghi lúc \d{2}:\d{2}$/

/** Nút ở chân màn: nút cuối mang tên đó — nút thoát ở dải trời ("Về danh sách chuyến") đứng trước. */
function footerButton(name: string) {
  const buttons = screen.getAllByRole('button', { name })
  const last = buttons[buttons.length - 1]
  if (last === undefined) throw new Error(`màn không có nút "${name}"`)
  return last
}

/** Nút chính đang hiện (nền `primaryFill` của `Button`): mỗi màn đúng một. */
function primaryButtons() {
  return screen.getAllByRole('button').filter((button) => StyleSheet.flatten(button.props.style)?.backgroundColor === colors.primaryFill)
}

/** Mở tờ nhập số seal từ chân màn (chưa ghi) hoặc từ thẻ niêm phong (đổi số đã ghi). */
async function openSealSheet(from: 'footer' | 'change') {
  await fireEvent.press(from === 'footer' ? footerButton(SUBMIT) : screen.getByRole('button', { name: 'Đổi số seal' }))
  expect(await screen.findByLabelText('Số seal')).toBeOnTheScreen()
}

beforeEach(async () => {
  resetMockDb()
  clearStored()
  resetNativeMocks()
  await signInAs(WAREHOUSE_EMAIL)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('màn Xếp xong', () => {
  test('TRIP-010: số kiện đã xếp, theo điểm giao, đối chiếu bằng nhãn, tuyến · xe · ngày chạy; chưa ghi seal thì "Ghi số seal" là nút chính', async () => {
    await renderSession(LOADED_TRIP)

    expect(screen.getByRole('header', { name: 'Đã xếp xong chuyến TRIP-010' })).toBeOnTheScreen()
    expect(screen.getByText('Xếp xong — chờ xuất phát. Đóng cửa thùng và bàn giao cho tài xế.')).toBeOnTheScreen()
    expect(screen.getByLabelText('Đã xếp 210 / 210 kiện')).toBeOnTheScreen()
    expect(screen.getByLabelText('Bỏ lại kho 0 kiện')).toBeOnTheScreen()
    expect(screen.getByText('Không có kiện nào bị bỏ lại.')).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: /^Kiện hỏng, bỏ lại kho/ })).toBeNull()
    expect(screen.getByRole('header', { name: 'Theo điểm giao' })).toBeOnTheScreen()
    expect(screen.getByLabelText('Điểm 1, Cửa hàng Bách Hoá Xanh Thủ Đức, đã xếp 120 / 120 kiện')).toBeOnTheScreen()
    expect(screen.getByLabelText('Điểm 2, MM Mega Market An Phú, đã xếp 45 / 45 kiện')).toBeOnTheScreen()
    expect(screen.getByLabelText('Điểm 3, Circle K Phan Xích Long, đã xếp 45 / 45 kiện')).toBeOnTheScreen()
    expect(screen.getByText('Đã đối chiếu bằng nhãn 210 kiện')).toBeOnTheScreen()
    expect(screen.getByLabelText('Chuyến: Tuyến Thủ Đức – An Phú – Phú Nhuận')).toBeOnTheScreen()
    expect(await screen.findByLabelText('Xe: Isuzu NQR 550 · 51C-284.19')).toBeOnTheScreen()
    expect(screen.getByLabelText('Ngày chạy: 14/09/2026')).toBeOnTheScreen()

    // Niêm phong: chưa ghi, còn ở kho — nút ghi là nút chính ở chân màn, lối về danh sách là nút phụ
    expect(screen.getByRole('header', { name: 'Niêm phong thùng' })).toBeOnTheScreen()
    expect(screen.getByText('Chưa ghi số seal.')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Đổi số seal' })).toBeNull()
    const [primary, ...others] = primaryButtons()
    expect(primary).toHaveAccessibleName(SUBMIT)
    expect(others).toHaveLength(0)

    await fireEvent.press(footerButton(BACK))
    expect(router.dismissTo).toHaveBeenCalledWith('/warehouse')
  })

  test('kiện hỏng bị bỏ lại kho: ô "Bỏ lại kho", danh sách kiện hỏng, số theo điểm giao', async () => {
    const { trip, labels } = await stagedTwoCartonTrip()
    const db = getMockDb()
    await db.confirmLoadingByQr(trip.id, labels[0]?.qrToken ?? '')
    await db.reportDamagedPackage(trip.id, 'PKG-002-01')
    await db.completeLoading(trip.id)
    await renderSession(trip.id)

    expect(screen.getByRole('header', { name: `Đã xếp xong chuyến ${trip.id}` })).toBeOnTheScreen()
    expect(screen.getByLabelText('Đã xếp 1 / 2 kiện')).toBeOnTheScreen()
    expect(screen.getByLabelText('Bỏ lại kho 1 kiện')).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Kiện hỏng, bỏ lại kho (1)' })).toBeOnTheScreen()
    expect(screen.getByLabelText('PKG-002-01, Carton A · Điểm 1')).toBeOnTheScreen()
    expect(screen.queryByText('Không có kiện nào bị bỏ lại.')).toBeNull()
    expect(screen.getByLabelText('Điểm 1, Cửa hàng Bách Hoá Xanh Thủ Đức, đã xếp 0 / 1 kiện, bỏ lại 1')).toBeOnTheScreen()
    expect(screen.getByLabelText('Điểm 3, Siêu thị Co.opmart Biên Hoà, đã xếp 1 / 1 kiện')).toBeOnTheScreen()
    expect(screen.getByText('Đã đối chiếu bằng nhãn 1 kiện')).toBeOnTheScreen()
  })

  test('số seal: trống và quá 32 ký tự bị chặn ngay trong tờ, không ghi gì; quay lại thì tờ đóng và mở lại từ đầu', async () => {
    await renderSession(LOADED_TRIP)
    await openSealSheet('footer')
    // Tờ đang mở: chân màn ẩn, nút "Ghi số seal" duy nhất là nút của tờ
    expect(screen.getAllByRole('button', { name: SUBMIT })).toHaveLength(1)

    await fireEvent.press(screen.getByRole('button', { name: SUBMIT }))
    expect(await screen.findByText('Nhập số seal trước khi ghi.')).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText('Số seal'), '   ')
    await fireEvent.press(screen.getByRole('button', { name: SUBMIT }))
    expect(await screen.findByText('Nhập số seal trước khi ghi.')).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText('Số seal'), 'S'.repeat(33))
    await fireEvent.press(screen.getByRole('button', { name: SUBMIT }))
    expect(await screen.findByText('Số seal tối đa 32 ký tự.')).toBeOnTheScreen()
    expect((await getMockDb().getTrip(LOADED_TRIP)).loading?.seal).toBeUndefined()

    await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }))
    await waitFor(() => expect(screen.queryByLabelText('Số seal')).toBeNull())
    expect(footerButton(SUBMIT)).toBeOnTheScreen()
    await openSealSheet('footer')
    expect(screen.getByLabelText('Số seal')).toHaveDisplayValue('')
    expect(screen.queryByText('Số seal tối đa 32 ký tự.')).toBeNull()
  })

  test('ghi số seal (bỏ khoảng trắng hai đầu) rồi đổi: thẻ nói số và giờ ghi, nút chính về "Về danh sách chuyến"', async () => {
    await renderSession(LOADED_TRIP)
    await openSealSheet('footer')
    await fireEvent.changeText(screen.getByLabelText('Số seal'), '  SEAL-0915  ')
    await fireEvent.press(screen.getByRole('button', { name: SUBMIT }))

    expect(await screen.findByText(RECORDED)).toBeOnTheScreen()
    expect(screen.queryByLabelText('Số seal')).toBeNull()
    expect((await getMockDb().getTrip(LOADED_TRIP)).loading?.seal?.number).toBe('SEAL-0915')
    expect(screen.queryByRole('button', { name: SUBMIT })).toBeNull()
    const [primary, ...others] = primaryButtons()
    expect(primary).toHaveAccessibleName(BACK)
    expect(others).toHaveLength(0)

    // Đổi: tờ mở với số đã ghi
    await openSealSheet('change')
    expect(screen.getByLabelText('Số seal')).toHaveDisplayValue('SEAL-0915')
    await fireEvent.changeText(screen.getByLabelText('Số seal'), 'SEAL-0916')
    await fireEvent.press(screen.getByRole('button', { name: SUBMIT }))
    expect(await screen.findByText(/^Số seal SEAL-0916 · ghi lúc \d{2}:\d{2}$/)).toBeOnTheScreen()
    expect((await getMockDb().getTrip(LOADED_TRIP)).loading?.seal?.number).toBe('SEAL-0916')
  })

  test('phím "Xong" của bàn phím khi số seal đang được ghi: không ghi lần nữa', async () => {
    const db = getMockDb()
    const recordSeal = db.recordSeal.bind(db)
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const record = jest.spyOn(db, 'recordSeal').mockImplementation((tripId, sealNumber) => gate.then(() => recordSeal(tripId, sealNumber)))
    await renderSession(LOADED_TRIP)
    await openSealSheet('footer')
    const field = screen.getByLabelText('Số seal')

    await fireEvent.changeText(field, 'SEAL-0915')
    await fireEvent(field, 'submitEditing')
    await waitFor(() => expect(screen.getByRole('button', { name: SUBMIT })).toBeBusy())
    await fireEvent(field, 'submitEditing')
    await fireEvent(field, 'submitEditing')
    expect(record).toHaveBeenCalledTimes(1)

    await act(async () => release())
    expect(await screen.findByText(RECORDED)).toBeOnTheScreen()
    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith(LOADED_TRIP, 'SEAL-0915')
  })

  test('xe đã rời kho: màn chỉ đọc — số seal đã ghi không đổi được, chưa ghi thì nói chuyến không ghi số seal', async () => {
    const db = getMockDb()
    await db.recordSeal(LOADED_TRIP, 'SEAL-0915')
    await db.startDelivery(LOADED_TRIP)
    const view = await renderSession(LOADED_TRIP)

    expect(screen.getByRole('header', { name: 'Đã xếp xong chuyến TRIP-010' })).toBeOnTheScreen()
    expect(screen.queryByText('Xếp xong — chờ xuất phát. Đóng cửa thùng và bàn giao cho tài xế.')).toBeNull()
    expect(screen.getByText(RECORDED)).toBeOnTheScreen()
    expect(screen.getByText('Xe đã rời kho: không đổi số seal được nữa.')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Đổi số seal' })).toBeNull()
    expect(screen.queryByRole('button', { name: SUBMIT })).toBeNull()
    expect(primaryButtons()[0]).toHaveAccessibleName(BACK)
    await view.unmount()

    // Chuyến khác của kho đã đi mà chưa từng ghi seal
    const { trip, labels } = await stagedTwoCartonTrip()
    for (const label of labels) await db.confirmLoadingByQr(trip.id, label.qrToken)
    await db.completeLoading(trip.id)
    await db.startDelivery(trip.id)
    await renderSession(trip.id)
    expect(screen.getByText('Chuyến này không ghi số seal.')).toBeOnTheScreen()
    expect(screen.queryByText('Chưa ghi số seal.')).toBeNull()
    expect(screen.queryByRole('button', { name: SUBMIT })).toBeNull()
  })

  test('xe rời kho trong lúc đang nhập: kho từ chối, tờ tự đóng, thẻ niêm phong nói lý do và thành chỉ đọc', async () => {
    await renderSession(LOADED_TRIP)
    await openSealSheet('footer')
    await fireEvent.changeText(screen.getByLabelText('Số seal'), 'SEAL-0915')
    // Tài xế xuất phát trên máy khác
    await act(async () => {
      await getMockDb().startDelivery(LOADED_TRIP)
    })
    await fireEvent.press(screen.getByRole('button', { name: SUBMIT }))

    expect(await screen.findByText('Thao tác này không làm được ở trạng thái hiện tại của chuyến TRIP-010.')).toBeOnTheScreen()
    expect(screen.queryByLabelText('Số seal')).toBeNull()
    expect(screen.getByText('Chuyến này không ghi số seal.')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: SUBMIT })).toBeNull()
    expect(primaryButtons()[0]).toHaveAccessibleName(BACK)
    expect((await getMockDb().getTrip(LOADED_TRIP)).loading?.seal).toBeUndefined()
  })

  test('giao diện tiếng Anh', async () => {
    await renderSession(LOADED_TRIP, { locale: 'en' })

    expect(screen.getByRole('header', { name: 'Trip TRIP-010 is loaded' })).toBeOnTheScreen()
    expect(screen.getByLabelText('Loaded 210 / 210 packages')).toBeOnTheScreen()
    expect(screen.getByLabelText('0 packages left at the warehouse')).toBeOnTheScreen()
    expect(screen.getByLabelText('Stop 2, MM Mega Market An Phú, 45 / 45 packages loaded')).toBeOnTheScreen()
    expect(screen.getByText('210 packages verified by their labels')).toBeOnTheScreen()
    expect(screen.getByLabelText('Run date: Sep 14, 2026')).toBeOnTheScreen()
    expect(primaryButtons()[0]).toHaveAccessibleName('Record seal number')

    await fireEvent.press(footerButton('Record seal number'))
    await fireEvent.press(await screen.findByRole('button', { name: 'Record seal number' }))
    expect(await screen.findByText('Enter the seal number before recording it.')).toBeOnTheScreen()
  })
})
