import { configure, fireEvent, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored, signInAs } from '@/test/render'
import { LOADED_TRIP, renderSession, stagedTwoCartonTrip, WAREHOUSE_EMAIL } from '@/test/warehouse-flow'
import { colors } from '@/theme/tokens'

/*
 * Màn Xếp xong của phiên kho (`LoadingFinishedView`), vẽ qua phiên thật (`renderSession`) trên kho mẫu: số kiện, kiện bỏ lại, theo điểm
 * giao, thông tin chuyến; chỉ đọc khi xe đã đi. `TRIP-010` của seed: 210 kiện đã xếp và đối chiếu bằng quét, ba điểm giao
 * (120 · 45 · 45), xe Isuzu NQR 550.
 */

// Ghi rồi đọc lại cả chuyến (danh sách chuyến của kho đọc lại sau): cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

const BACK = 'Về danh sách chuyến'

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
  test('TRIP-010: số kiện đã xếp, theo điểm giao, đối chiếu bằng nhãn, tuyến · xe · ngày chạy; "Về danh sách chuyến" là nút chính duy nhất', async () => {
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

    // Không có phần niêm phong thùng: lối về danh sách là nút chính duy nhất
    expect(screen.queryByRole('header', { name: 'Niêm phong thùng' })).toBeNull()
    const [primary, ...others] = primaryButtons()
    expect(primary).toHaveAccessibleName(BACK)
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

  test('xe đã rời kho: màn chỉ đọc, không còn câu chờ xuất phát; "Về danh sách chuyến" vẫn là nút chính duy nhất', async () => {
    await getMockDb().startDelivery(LOADED_TRIP)
    await renderSession(LOADED_TRIP)

    expect(screen.getByRole('header', { name: 'Đã xếp xong chuyến TRIP-010' })).toBeOnTheScreen()
    expect(screen.queryByText('Xếp xong — chờ xuất phát. Đóng cửa thùng và bàn giao cho tài xế.')).toBeNull()
    const [primary, ...others] = primaryButtons()
    expect(primary).toHaveAccessibleName(BACK)
    expect(others).toHaveLength(0)
  })

  test('giao diện tiếng Anh', async () => {
    await renderSession(LOADED_TRIP, { locale: 'en' })

    expect(screen.getByRole('header', { name: 'Trip TRIP-010 is loaded' })).toBeOnTheScreen()
    expect(screen.getByLabelText('Loaded 210 / 210 packages')).toBeOnTheScreen()
    expect(screen.getByLabelText('0 packages left at the warehouse')).toBeOnTheScreen()
    expect(screen.getByLabelText('Stop 2, MM Mega Market An Phú, 45 / 45 packages loaded')).toBeOnTheScreen()
    expect(screen.getByText('210 packages verified by their labels')).toBeOnTheScreen()
    expect(screen.getByLabelText('Run date: Sep 14, 2026')).toBeOnTheScreen()
    expect(primaryButtons()[0]).toHaveAccessibleName('Back to trips')
  })
})
