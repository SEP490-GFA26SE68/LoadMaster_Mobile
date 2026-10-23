import { act, configure, fireEvent, screen, waitFor } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { resetNativeMocks, setCameraPermission } from '@/test/native-mocks'
import { clearStored } from '@/test/render'
import { asDispatcher, renderWarehouseScreen } from '@/test/warehouse-flow'

import * as lookupApi from './lookup-api'
import { PackageLookupScreen } from './PackageLookupScreen'

configure({ asyncUtilTimeout: 5000 })

/**
 * Tờ quét mã QR của tab Tra cứu kiện, mở từ nút chính ở chân màn: camera giả của `@/test/native-mocks`, và ô nhập mã in dưới hình QR.
 * `PK-0063` (`BV-VIN-2609-05`) mang cờ "Không tìm thấy" trong seed; `PK-0040` (`MP-DA12-0914-06`) không mang cờ nào.
 */

const SHEET = 'Quét mã QR của kiện'
const notFound = (code: string) => `Không có kiện nào của công ty bạn mang mã ${code}. Xem lại mã in trên nhãn.`
const sheetHeader = () => screen.queryByRole('header', { name: SHEET })

async function openSheet(button = 'Quét mã QR', title = SHEET) {
  await fireEvent.press(screen.getByRole('button', { name: button }))
  expect(await screen.findByRole('header', { name: title })).toBeOnTheScreen()
}

/** Camera của tờ đọc thấy `data` một lần; chờ lượt tra (nếu có) chạy. */
async function scan(data: string) {
  await fireEvent(screen.getByTestId('qr-camera', { includeHiddenElements: true }), 'barcodeScanned', { data })
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
}

/** Mã QR của một kiện, đọc khi kho chưa có phiên (không lọc theo công ty). */
const qrOf = async (id: string) => (await getMockDb().getPackage(id)).qrToken

describe('tab Tra cứu kiện — tờ quét mã QR', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('mã không phải kiện nào: tờ nói ngay trong tờ; quét kiện mang cờ "Không tìm thấy": cờ được gỡ ngay, tờ đóng, ô tra mang mã vừa quét', async () => {
    const flagged = await asDispatcher((db) => db.flagPackage('PK-0040', 'NOT_FOUND'))
    expect([flagged.flags, flagged.packageCode]).toStrictEqual([['NOT_FOUND'], 'MP-DA12-0914-06'])
    await renderWarehouseScreen(<PackageLookupScreen />)
    await openSheet()

    await fireEvent.changeText(screen.getByLabelText('Nhập mã'), 'LM-0000-0000-0000')
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mã' }))
    expect(await screen.findByText(notFound('LM-0000-0000-0000'))).toBeOnTheScreen()
    expect(sheetHeader()).toBeOnTheScreen()

    await scan(flagged.qrToken.toLowerCase())
    expect(await screen.findByRole('header', { name: 'Kiện MP-DA12-0914-06' })).toBeOnTheScreen()
    await waitFor(() => expect(sheetHeader()).toBeNull())
    expect(screen.getByText('Đã gỡ cờ "Không tìm thấy" của kiện MP-DA12-0914-06. Điều phối viên thấy việc này ở chuông thông báo.')).toBeOnTheScreen()
    expect(screen.getByLabelText('Cờ: Không có cờ')).toBeOnTheScreen()
    expect(screen.getByLabelText('Mã QR hoặc mã kiện của bên gửi')).toHaveDisplayValue(flagged.qrToken)
    expect((await getMockDb().getPackage('PK-0040')).flags).toStrictEqual([])
    expect((await getMockDb().listEvents())[0]).toMatchObject({ action: 'package.found', actorId: 'US-0003', target: { type: 'package', id: 'PK-0040' } })
  })

  test('máy từ chối camera: tờ nói cách cấp quyền; vẫn nhập được mã in dưới hình QR — chữ thường, có khoảng trắng; nút Đóng đóng tờ', async () => {
    setCameraPermission(false, false)
    const token = await qrOf('PK-0040')
    await renderWarehouseScreen(<PackageLookupScreen />)
    await openSheet()
    expect(
      screen.getByText('Chưa được phép dùng camera. Cấp quyền camera cho LoadMaster trong Cài đặt của máy, hoặc gõ mã in dưới hình QR.'),
    ).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Mở Cài đặt' })).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Đóng' }))
    await waitFor(() => expect(sheetHeader()).toBeNull())

    // Mở lại: tờ bắt đầu trống
    await openSheet()
    expect(screen.getByLabelText('Nhập mã')).toHaveDisplayValue('')
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mã' }))
    expect(await screen.findByText('Nhập mã trước khi xác nhận.')).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText('Nhập mã'), ` ${token.toLowerCase().replaceAll('-', ' ')} `)
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mã' }))
    expect(await screen.findByRole('header', { name: 'Kiện MP-DA12-0914-06' })).toBeOnTheScreen()
    await waitFor(() => expect(sheetHeader()).toBeNull())
    // Kiện không mang cờ: không có gì để gỡ
    expect(screen.queryByText(/^Đã gỡ cờ/)).toBeNull()
  })

  test('camera đọc một nhãn nhiều lần: mỗi mã chỉ tra một lần, tới khi nhãn rời khung hình 3 giây', async () => {
    let clock = 1_000_000
    jest.spyOn(Date, 'now').mockImplementation(() => clock)
    const scanPackage = jest.spyOn(lookupApi, 'scanPackage')
    await renderWarehouseScreen(<PackageLookupScreen />)
    await openSheet()

    await scan('LM-0000-0000-0000')
    expect(await screen.findByText(notFound('LM-0000-0000-0000'))).toBeOnTheScreen()
    // Cùng một mã (chữ hoa hay thường) còn trong khung hình
    await scan('lm-0000-0000-0000')
    clock += 2_000
    await scan('LM-0000-0000-0000')
    expect(scanPackage).toHaveBeenCalledTimes(1)
    clock += 3_000
    await scan('LM-0000-0000-0000')
    await waitFor(() => expect(scanPackage).toHaveBeenCalledTimes(2))
  })

  test('nguồn chưa gỡ cờ được: quét kiện mang cờ chỉ mở thẻ kiện, cờ giữ nguyên', async () => {
    jest.spyOn(lookupApi, 'lookupCapabilities').mockReturnValue({ reportFound: false })
    const token = await qrOf('PK-0063')
    await renderWarehouseScreen(<PackageLookupScreen />)
    await openSheet()
    await scan(token)
    expect(await screen.findByRole('header', { name: 'Kiện BV-VIN-2609-05' })).toBeOnTheScreen()
    expect(screen.getByText('Kiện mang cờ chưa đưa vào yêu cầu giao hay chuyến được.')).toBeOnTheScreen()
    expect(screen.queryByText(/^Đã gỡ cờ/)).toBeNull()
    expect((await getMockDb().getPackage('PK-0063')).flags).toStrictEqual(['NOT_FOUND'])
  })

  test('tiếng Anh', async () => {
    await renderWarehouseScreen(<PackageLookupScreen />, { locale: 'en' })
    await openSheet('Scan QR code', 'Scan the QR code of a package')
    expect(screen.getByText('Hold the label on the package in the frame, or type the code printed under the QR image.')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm code' }))
    expect(await screen.findByText('Enter a code before confirming.')).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText('Enter code'), 'LM-0000-0000-0000')
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm code' }))
    expect(await screen.findByText('No package of your company carries the code LM-0000-0000-0000. Check the code printed on the label.')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('header', { name: 'Scan the QR code of a package' })).toBeNull())
  })
})
