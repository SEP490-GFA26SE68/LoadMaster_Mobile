import { act, configure, fireEvent, screen, waitFor } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { StyleSheet, type RefreshControlProps, type StyleProp, type ViewStyle } from 'react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { resetNativeMocks } from '@/test/native-mocks'
import { clearStored, renderApp } from '@/test/render'
import { asDispatcher, labelsOf, READY_TRIP, renderWarehouseScreen } from '@/test/warehouse-flow'
import { colors } from '@/theme/tokens'

import * as lookupApi from './lookup-api'
import { PackageLookupScreen } from './PackageLookupScreen'

configure({ asyncUtilTimeout: 5000 })

/**
 * Tab Tra cứu kiện của nhân viên kho — gõ mã (tờ quét mã QR: `ScanPackageSheet.test.tsx`), trên kho mẫu của app: `PK-0063`
 * (`BV-VIN-2609-05`) mang cờ "Không tìm thấy" trong seed; 13 kiện của Long Bình mang mã của bên gửi `PKG-001-01`; `PK-PN-0005` là kiện
 * của Phương Nam.
 */

const FIELD = 'Mã QR hoặc mã kiện của bên gửi'
const FOUND_PROMPT = 'Kiện này đang mang cờ "Không tìm thấy". Nếu kiện đang ở trước mặt bạn, xác nhận để gỡ cờ.'
const FLAG_NOTE = 'Kiện mang cờ chưa đưa vào yêu cầu giao hay chuyến được.'
const notFound = (code: string) => `Không có kiện nào của công ty bạn mang mã ${code}. Xem lại mã in trên nhãn.`
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Gõ mã vào ô tra rồi bấm "Tra cứu". */
async function lookUp(code: string, field = FIELD, submit = 'Tra cứu') {
  await fireEvent.changeText(screen.getByLabelText(field), code)
  await fireEvent.press(screen.getByRole('button', { name: submit }))
}

/** Một mục "nhãn: giá trị" của thẻ kiện. */
const fact = (text: string) => screen.getByLabelText(text)

/** Các nút đang mang nền của nút chính. */
const primaryButtons = () =>
  screen.getAllByRole('button').filter((button) => StyleSheet.flatten(button.props.style as StyleProp<ViewStyle>)?.backgroundColor === colors.primaryFill)

/** Kéo danh sách xuống để đọc lại: gọi `onRefresh` của `RefreshControl` gắn vào danh sách, như khi kéo trên máy. */
async function pullToRefresh() {
  const list = screen.root?.queryAll((node) => node.type === 'RCTScrollView' && node.props.refreshControl != null)[0]
  const control: ReactElement<RefreshControlProps> | undefined = list?.props.refreshControl
  if (control === undefined) throw new Error('danh sách không kéo xuống để đọc lại được')
  await act(async () => control.props.onRefresh?.())
}

describe('tab Tra cứu kiện — gõ mã', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('một nút chính "Quét mã QR"; gõ mã của bên gửi ra đủ mục của kiện; xác nhận đã tìm thấy gỡ cờ và báo điều phối viên', async () => {
    await renderWarehouseScreen(<PackageLookupScreen />)
    expect(await screen.findByText('Quét hoặc nhập mã để xem kiện')).toBeOnTheScreen()
    expect(primaryButtons()).toHaveLength(1)
    expect(primaryButtons()[0]).toBe(screen.getByRole('button', { name: 'Quét mã QR' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Tra cứu' }))
    expect(await screen.findByText('Nhập mã trước khi tra cứu.')).toBeOnTheScreen()

    await lookUp('bv-vin-2609-05')
    expect(await screen.findByRole('header', { name: 'Kiện BV-VIN-2609-05' })).toBeOnTheScreen()
    const token = (await getMockDb().getPackage('PK-0063')).qrToken
    for (const text of [
      'Mã của kho kiện: PK-0063',
      'Mã của bên gửi: BV-VIN-2609-05',
      `Mã QR: ${token}`,
      'Kích thước (D × R × C): 80 × 60 × 50 cm',
      'Khối lượng: 32 kg',
      'Loại hàng: Thường',
      'Điểm đến: KCN Bắc Vinh, TP. Vinh, Nghệ An',
      'Chuyến: Chưa vào chuyến nào',
    ])
      expect(fact(text)).toBeOnTheScreen()
    expect(screen.getByText('Đã nhập')).toBeOnTheScreen()
    expect(screen.getByText('Không tìm thấy')).toBeOnTheScreen()
    expect(screen.queryByLabelText(/^Cờ:/)).toBeNull()
    // Không in lại nhãn (app không in), không mở Kho kiện, không gỡ cờ như điều phối viên
    for (const name of ['In lại nhãn', 'Mở trong Kho kiện', /^Gỡ cờ/]) expect(screen.queryByRole('button', { name })).toBeNull()
    expect(screen.getByText(FOUND_PROMPT)).toBeOnTheScreen()
    const events = (await getMockDb().listEvents()).length

    await fireEvent.press(screen.getByRole('button', { name: 'Đã tìm thấy kiện này' }))
    expect(await screen.findByText('Đã gỡ cờ "Không tìm thấy" của kiện BV-VIN-2609-05. Điều phối viên thấy việc này ở chuông thông báo.')).toBeOnTheScreen()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Đã tìm thấy kiện này' })).toBeNull())
    expect(fact('Cờ: Không có cờ')).toBeOnTheScreen()
    expect((await getMockDb().getPackage('PK-0063')).flags).toStrictEqual([])
    const log = await getMockDb().listEvents()
    expect(log).toHaveLength(events + 1)
    expect(log[0]).toMatchObject({ action: 'package.found', actorId: 'US-0003', target: { type: 'package', id: 'PK-0063' } })
  })

  test('gõ mã của kho kiện, hay mã QR chữ thường: ra đúng kiện; kiện của chuyến kèm chuyến và điểm giao', async () => {
    await renderWarehouseScreen(<PackageLookupScreen />)
    await lookUp('pk-0040')
    expect(await screen.findByRole('header', { name: 'Kiện MP-DA12-0914-06' })).toBeOnTheScreen()
    expect(fact('Mã của kho kiện: PK-0040')).toBeOnTheScreen()

    const [label] = await labelsOf(READY_TRIP)
    const trip = await getMockDb().getTrip(READY_TRIP)
    await lookUp(label?.qrToken.toLowerCase() ?? '')
    expect(await screen.findByRole('header', { name: 'Kiện PKG-001-01' })).toBeOnTheScreen()
    expect(screen.getByText('Đã gán chuyến')).toBeOnTheScreen()
    expect(fact(`Chuyến: ${READY_TRIP}, ${trip.name}`)).toBeOnTheScreen()
    expect(fact(`Điểm giao: Điểm 1 · ${trip.stops[0]?.name}`)).toBeOnTheScreen()
    expect(fact('Cờ: Không có cờ')).toBeOnTheScreen()
  })

  test('mã của bên gửi trùng nhiều kiện: danh sách để chọn; chọn một kiện rồi quay lại danh sách', async () => {
    await renderWarehouseScreen(<PackageLookupScreen />)
    const matches = await getMockDb().lookupPackages('PKG-001-01')
    expect(matches).toHaveLength(13)
    const id = matches[0]?.id ?? ''

    await lookUp('PKG-001-01')
    expect(await screen.findByRole('header', { name: '13 kiện mang mã PKG-001-01' })).toBeOnTheScreen()
    expect(screen.getByText('Chọn đúng kiện theo điểm đến và chuyến.')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^Xem kiện ${escape(id)}, `) }))
    expect(await screen.findByRole('header', { name: 'Kiện PKG-001-01' })).toBeOnTheScreen()
    expect(fact(`Mã của kho kiện: ${id}`)).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: '13 kiện mang mã PKG-001-01' })).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Về danh sách kiện cùng mã' }))
    expect(await screen.findByRole('header', { name: '13 kiện mang mã PKG-001-01' })).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Kiện PKG-001-01' })).toBeNull()
  })

  test('mã không khớp kiện nào và mã của kiện công ty khác đọc như nhau: không tìm thấy, không lộ dữ liệu', async () => {
    // Kho chưa có phiên thì không lọc: đọc kiện của Phương Nam trước khi nhân viên kho Long Bình đăng nhập
    const foreign = await getMockDb().getPackage('PK-PN-0005')
    await renderWarehouseScreen(<PackageLookupScreen />)
    for (const code of ['LM-0000-0000-0000', foreign.qrToken, foreign.packageCode, foreign.id]) {
      await lookUp(code)
      // Kết quả của lần tra: trình đọc màn hình đọc câu ngay khi hiện
      expect(await screen.findByText(notFound(code))).toHaveProp('accessibilityLiveRegion', 'polite')
      expect(screen.getByRole('header', { name: 'Không tìm thấy' })).toBeOnTheScreen()
      expect(screen.queryByRole('header', { name: /^Kiện / })).toBeNull()
      expect(screen.queryByText(foreign.destination)).toBeNull()
    }
  })

  test('tra lại đúng mã đang xem là đọc lại kiện: cờ người khác vừa gỡ không còn trên thẻ', async () => {
    await renderWarehouseScreen(<PackageLookupScreen />)
    await lookUp('BV-VIN-2609-05')
    expect(await screen.findByRole('button', { name: 'Đã tìm thấy kiện này' })).toBeOnTheScreen()
    await asDispatcher((db) => db.clearPackageFlag('PK-0063', 'NOT_FOUND'))

    await fireEvent.press(screen.getByRole('button', { name: 'Tra cứu' }))
    expect(await screen.findByLabelText('Cờ: Không có cờ')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Đã tìm thấy kiện này' })).toBeNull()
  })

  test('kéo xuống cũng là đọc lại kiện đang xem', async () => {
    await renderWarehouseScreen(<PackageLookupScreen />)
    await lookUp('BV-VIN-2609-05')
    expect(await screen.findByRole('button', { name: 'Đã tìm thấy kiện này' })).toBeOnTheScreen()
    await asDispatcher((db) => db.clearPackageFlag('PK-0063', 'NOT_FOUND'))

    await pullToRefresh()
    expect(await screen.findByLabelText('Cờ: Không có cờ')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Đã tìm thấy kiện này' })).toBeNull()
  })

  test('đọc lại lỗi: thẻ ở lại, câu lỗi dưới ô tra; mã không còn khớp kiện nào: không tìm thấy, không giữ thẻ cũ', async () => {
    await renderWarehouseScreen(<PackageLookupScreen />)
    await lookUp('BV-VIN-2609-05')
    expect(await screen.findByRole('header', { name: 'Kiện BV-VIN-2609-05' })).toBeOnTheScreen()

    // Kho mẫu mất phiên: lần đọc lại bị từ chối
    getMockDb().restoreSession(null)
    await fireEvent.press(screen.getByRole('button', { name: 'Tra cứu' }))
    expect(await screen.findByText('Phiên đăng nhập đã hết, hãy đăng nhập lại.')).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Kiện BV-VIN-2609-05' })).toBeOnTheScreen()

    // Có phiên lại; điều phối viên đổi mã của bên gửi nên mã cũ không còn khớp kiện nào
    getMockDb().restoreSession('US-0003')
    await asDispatcher((db) => db.updatePackage('PK-0063', { packageCode: 'BV-VIN-2609-50' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Tra cứu' }))
    expect(await screen.findByText(notFound('BV-VIN-2609-05'))).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Kiện BV-VIN-2609-05' })).toBeNull()
    expect(screen.queryByText('Phiên đăng nhập đã hết, hãy đăng nhập lại.')).toBeNull()
  })

  test('cờ đã được gỡ trước khi bấm xác nhận: câu lỗi của kho ở lại trên thẻ, thẻ theo đúng cờ trong kho', async () => {
    await renderWarehouseScreen(<PackageLookupScreen />)
    await lookUp('BV-VIN-2609-05')
    expect(await screen.findByRole('button', { name: 'Đã tìm thấy kiện này' })).toBeOnTheScreen()
    await asDispatcher((db) => db.clearPackageFlag('PK-0063', 'NOT_FOUND'))

    await fireEvent.press(screen.getByRole('button', { name: 'Đã tìm thấy kiện này' }))
    expect(await screen.findByText('Kiện PK-0063 không mang cờ này.')).toBeOnTheScreen()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Đã tìm thấy kiện này' })).toBeNull())
    expect(fact('Cờ: Không có cờ')).toBeOnTheScreen()
    expect(screen.getByText('Kiện PK-0063 không mang cờ này.')).toBeOnTheScreen()
    expect(screen.queryByText(/^Đã gỡ cờ/)).toBeNull()
  })

  test('nguồn chưa gỡ cờ được: kiện mang cờ chỉ có câu giải thích, không có nút xác nhận', async () => {
    jest.spyOn(lookupApi, 'lookupCapabilities').mockReturnValue({ reportFound: false })
    await renderWarehouseScreen(<PackageLookupScreen />)
    await lookUp('BV-VIN-2609-05')
    expect(await screen.findByText(FLAG_NOTE)).toBeOnTheScreen()
    expect(screen.queryByText(FOUND_PROMPT)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Đã tìm thấy kiện này' })).toBeNull()
  })

  test('nguồn báo lỗi khác "không tìm thấy": câu lỗi kèm nút thử lại', async () => {
    // Chưa đăng nhập: kho mẫu từ chối mọi lần tra
    await renderApp(<PackageLookupScreen />)
    await lookUp('BV-VIN-2609-05')
    expect(await screen.findByText('Phiên đăng nhập đã hết, hãy đăng nhập lại.')).toHaveProp('accessibilityLiveRegion', 'polite')
    expect(screen.getByRole('header', { name: 'Không tải được dữ liệu' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Không tìm thấy' })).toBeNull()
  })

  test('tiếng Anh', async () => {
    await renderWarehouseScreen(<PackageLookupScreen />, { locale: 'en' })
    expect(await screen.findByText('Scan or type a code to see a package')).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Package lookup' })).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Look up' }))
    expect(await screen.findByText('Enter a code before looking it up.')).toBeOnTheScreen()

    await lookUp('BV-VIN-2609-05', 'QR code or sender package code', 'Look up')
    expect(await screen.findByRole('header', { name: 'Package BV-VIN-2609-05' })).toBeOnTheScreen()
    expect(fact('Dimensions (L × W × H): 80 × 60 × 50 cm')).toBeOnTheScreen()
    expect(fact('Trip: Not in any trip')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'I found this package' }))
    expect(
      await screen.findByText('Cleared the "Not found" flag of package BV-VIN-2609-05. The dispatcher sees this in the notification bell.'),
    ).toBeOnTheScreen()
    expect(await screen.findByLabelText('Flags: No flag')).toBeOnTheScreen()
  })
})
