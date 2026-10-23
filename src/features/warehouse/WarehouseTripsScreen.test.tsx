import { act, configure, fireEvent, screen, within } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { StyleSheet, type RefreshControlProps } from 'react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored, renderApp, signInAs } from '@/test/render'
import {
  asDispatcher,
  labelsInLoadingOrder,
  LOADED_TRIP,
  LOADING_TRIP,
  PHUONG_NAM_WAREHOUSE_EMAIL,
  READY_TRIP,
  renderWarehouseScreen,
  STALE_TRIP,
  startSession,
  WAREHOUSE_EMAIL,
  type WarehouseRenderOptions,
} from '@/test/warehouse-flow'
import { colors } from '@/theme/tokens'

import { WarehouseTripsScreen } from './WarehouseTripsScreen'

/*
 * Tab Kho (`WarehouseTripsScreen`) trên kho mẫu neo 14/09: chuyến cần xếp theo nhóm (đang xếp · chờ soạn · xếp xong · chờ tối ưu lại),
 * mỗi thẻ một nút mở phiên soạn → xếp, đúng một nút chính cho cả màn. Kỳ vọng lấy từ seed của Long Bình và Phương Nam.
 */

// Danh sách đọc chuyến, revision và xe của cả công ty: cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

const TITLE = 'Chuyến cần xếp'

/** Tiêu đề màn, tiêu đề nhóm và mã chuyến (header của thẻ) theo thứ tự trên màn. */
function headers(): string[] {
  return screen.getAllByRole('header').map((header) => String(header.props.children))
}

/** Thẻ của một chuyến: mã chuyến là header ở hàng đầu thẻ, hàng đó nằm ngay trong thẻ. */
function cardOf(tripId: string) {
  const card = screen.getByRole('header', { name: tripId }).parent?.parent
  if (card == null) throw new Error(`không thấy thẻ của chuyến ${tripId}`)
  return within(card)
}

/** Nút chính đang hiện (nền `primaryFill` của `Button`): mỗi màn đúng một. */
function primaryButtons() {
  return screen.getAllByRole('button').filter((button) => StyleSheet.flatten(button.props.style)?.backgroundColor === colors.primaryFill)
}

/** Vẽ tab Kho; mặc định cho nhân viên kho mẫu của Long Bình. */
function renderTrips(options: WarehouseRenderOptions = {}) {
  return renderWarehouseScreen(<WarehouseTripsScreen />, options)
}

/**
 * Jest không dàn trang nên danh sách ảo chỉ vẽ số ô của lần vẽ đầu (`initialNumToRender`; mỗi nhóm tính thêm hai ô đầu và cuối nhóm):
 * báo cho danh sách khung nhìn và chiều cao nội dung như máy báo sau khi dàn trang, để nó vẽ tiếp các thẻ phía dưới như khi cuộn.
 */
async function layOutList() {
  const list = screen.root?.queryAll((node) => node.type === 'RCTScrollView')[0]
  if (list === undefined) throw new Error('màn không có danh sách cuộn')
  await fireEvent(list, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } } })
  await fireEvent(list, 'contentSizeChange', 390, 2400)
}

/** Kéo danh sách xuống để đọc lại: gọi `onRefresh` của `RefreshControl` gắn vào danh sách, như khi kéo trên máy. */
async function pullToRefresh() {
  const list = screen.root?.queryAll((node) => node.type === 'RCTScrollView' && node.props.refreshControl != null)[0]
  const control: ReactElement<RefreshControlProps> | undefined = list?.props.refreshControl
  if (control === undefined) throw new Error('danh sách không kéo xuống để đọc lại được')
  await act(async () => control.props.onRefresh?.())
}

beforeEach(() => {
  resetMockDb()
  clearStored()
  resetNativeMocks()
})

describe('tab Kho', () => {
  /*
   * Màn còn vẽ theo lượt hẹn giờ sau lần chờ cuối của test: danh sách ảo vẽ thêm ô theo đợt (`updateCellsBatchingPeriod`, 50 ms) và
   * React Query giao kết quả của chuông ở lượt kế tiếp, mà bước dọn của RNTL nhường một lượt trước khi gỡ màn. Chờ các lượt đó trong
   * `act` — hook đặt trong `describe` nên chạy trước bước dọn đó.
   */
  afterEach(async () => {
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))
  })

  test('Long Bình: bốn nhóm theo thứ tự, thẻ mang trạng thái, tiến độ, xe; một nút chính là chuyến đang xếp dở; chuông ở dải trời', async () => {
    await renderTrips()
    expect(await screen.findByRole('header', { name: 'Đang xếp hàng (1)' })).toBeOnTheScreen()
    await layOutList()
    expect(await screen.findByRole('header', { name: STALE_TRIP })).toBeOnTheScreen()
    expect(headers()).toStrictEqual([
      TITLE,
      'Đang xếp hàng (1)', LOADING_TRIP,
      'Chờ soạn (1)', READY_TRIP,
      'Xếp xong — chờ xuất phát (1)', LOADED_TRIP,
      'Chờ điều phối tối ưu lại (1)', STALE_TRIP,
    ])
    expect(screen.getByText(/^4 chuyến · \d{2}\/\d{2}\/\d{4}$/)).toBeOnTheScreen()
    expect(await screen.findByRole('button', { name: /^Thông báo/ })).toBeOnTheScreen()

    // Chip trạng thái và dòng phụ như mọi màn; tiến độ cho trình đọc màn hình là thanh có tên và giá trị
    const loading = cardOf(LOADING_TRIP)
    expect(loading.getByText('Đang xếp hàng')).toBeOnTheScreen()
    expect(loading.getByText('Đang xếp 110 / 280')).toBeOnTheScreen()
    expect(loading.getByText('Tuyến Tân Bình – Q.1 – Q.7')).toBeOnTheScreen()
    expect(loading.getByText('110/280')).toBeOnTheScreen()
    expect(loading.getByText('Isuzu FVR 900 · 51D-622.14')).toBeOnTheScreen()
    expect(loading.getByRole('progressbar', { name: 'Tiến độ xếp chuyến TRIP-011' })).toHaveAccessibilityValue({ min: 0, max: 100, now: 39 })
    expect(loading.getByRole('button', { name: 'Tiếp tục xếp (110/280) TRIP-011' })).toHaveTextContent('Tiếp tục xếp (110/280)')

    const approved = cardOf(READY_TRIP)
    expect(approved.getByText('Đã lập kế hoạch')).toBeOnTheScreen()
    expect(approved.getByText('Đã duyệt')).toBeOnTheScreen()
    expect(approved.getByText('14/09/2026')).toBeOnTheScreen()
    expect(approved.getByText('Hyundai HD210 · 60C-446.32')).toBeOnTheScreen()
    expect(approved.getByText('132')).toBeOnTheScreen()
    expect(approved.getByText('0/132')).toBeOnTheScreen()
    expect(approved.queryByRole('progressbar')).toBeNull()

    // Xếp xong chờ tài xế xuất phát: kho còn mở lại được để ghi số seal
    const loaded = cardOf(LOADED_TRIP)
    expect(loaded.getByText('Xếp xong — chờ xuất phát')).toBeOnTheScreen()
    expect(loaded.getByText('210/210')).toBeOnTheScreen()
    expect(loaded.getByText('Chưa ghi số seal.')).toBeOnTheScreen()
    expect(loaded.getByRole('button', { name: 'Xem chuyến đã xếp TRIP-010' })).toBeOnTheScreen()

    // Bản duyệt lỗi thời: không có nút, một cảnh báo nói vì sao
    const stale = cardOf(STALE_TRIP)
    expect(stale.getByText('Đã lập kế hoạch')).toBeOnTheScreen()
    expect(stale.getByText('Lỗi thời — cần tối ưu lại')).toBeOnTheScreen()
    expect(stale.getByText(/^Phương án đã duyệt lỗi thời/)).toBeOnTheScreen()
    expect(stale.queryByRole('button')).toBeNull()

    const [primary, ...others] = primaryButtons()
    expect(primary).toHaveAccessibleName('Tiếp tục xếp (110/280) TRIP-011')
    expect(others).toHaveLength(0)
  })

  test('bấm nút của thẻ: mở phiên soạn → xếp của đúng chuyến', async () => {
    await renderTrips()
    await fireEvent.press(await screen.findByRole('button', { name: 'Bắt đầu soạn hàng TRIP-2026-0914' }))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/loading/[tripId]', params: { tripId: READY_TRIP } })

    await fireEvent.press(screen.getByRole('button', { name: 'Xem chuyến đã xếp TRIP-010' }))
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/loading/[tripId]', params: { tripId: LOADED_TRIP } })
  })

  test('chuyến đang soạn: tiến độ soạn và kiện báo thiếu; điều phối viên bỏ kiện thiếu thì chuyến chờ tối ưu lại, không có nút', async () => {
    await signInAs(WAREHOUSE_EMAIL)
    await startSession(READY_TRIP)
    const [first, second] = await labelsInLoadingOrder(READY_TRIP)
    if (first === undefined || second === undefined) throw new Error('chuyến chính của seed phải có ít nhất hai kiện')
    await getMockDb().confirmStagingByQr(READY_TRIP, second.qrToken)
    await getMockDb().reportStagingShortage(READY_TRIP, first.packageInstanceId)

    const view = await renderTrips()
    expect(await screen.findByRole('header', { name: 'Đang xếp hàng (2)' })).toBeOnTheScreen()
    expect(headers().slice(0, 4)).toStrictEqual([TITLE, 'Đang xếp hàng (2)', LOADING_TRIP, READY_TRIP])
    const staging = cardOf(READY_TRIP)
    expect(staging.getByText('1/132')).toBeOnTheScreen()
    expect(staging.getByText('Thiếu kiện — chờ điều phối')).toBeOnTheScreen()
    expect(staging.getByRole('button', { name: 'Tiếp tục soạn (1/132) TRIP-2026-0914' })).toBeOnTheScreen()
    // Nút chính vẫn là chuyến đang xếp dở đứng đầu nhóm
    expect(primaryButtons().map((button) => button.props.accessibilityLabel)).toStrictEqual(['Tiếp tục xếp (110/280) TRIP-011'])
    await view.unmount()

    await asDispatcher((db) => db.resolveStagingShortage(READY_TRIP, first.packageInstanceId, 'DROP'))
    await renderTrips()
    expect(await screen.findByRole('header', { name: 'Chờ điều phối tối ưu lại (2)' })).toBeOnTheScreen()
    expect(headers().slice(-3)).toStrictEqual(['Chờ điều phối tối ưu lại (2)', READY_TRIP, STALE_TRIP])
    const waiting = cardOf(READY_TRIP)
    expect(waiting.getByText('Lỗi thời — cần tối ưu lại')).toBeOnTheScreen()
    expect(waiting.getByText(/^Điều phối viên đã bỏ kiện thiếu khỏi chuyến TRIP-2026-0914\. Kiện đã soạn giữ nguyên ở khu chờ/)).toBeOnTheScreen()
    expect(waiting.queryByRole('button')).toBeNull()
  })

  test('không còn chuyến nào cần xếp: trạng thái rỗng thật, không có thẻ nào', async () => {
    await asDispatcher(async (db) => {
      for (const tripId of [READY_TRIP, LOADED_TRIP, LOADING_TRIP, STALE_TRIP]) await db.cancelTrip(tripId, 'Khách hoãn nhận hàng')
    })
    await renderTrips()

    expect(await screen.findByRole('header', { name: 'Không có chuyến cần xếp' })).toBeOnTheScreen()
    expect(screen.getByText('Chuyến có phương án đã duyệt sẽ hiện ở đây để kho bắt đầu soạn hàng.')).toBeOnTheScreen()
    expect(screen.getByText(/^0 chuyến · /)).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: /TRIP-/ })).toBeNull()
  })

  test('nhân viên kho của Phương Nam chỉ thấy chuyến của công ty mình', async () => {
    await renderTrips({ email: PHUONG_NAM_WAREHOUSE_EMAIL })

    expect(await screen.findByRole('header', { name: 'Chờ soạn (1)' })).toBeOnTheScreen()
    expect(headers()).toStrictEqual([TITLE, 'Chờ soạn (1)', 'TRIP-PN-001'])
    const card = cardOf('TRIP-PN-001')
    expect(card.getByText('42')).toBeOnTheScreen()
    expect(card.getByText('0/42')).toBeOnTheScreen()
    expect(primaryButtons().map((button) => button.props.accessibilityLabel)).toStrictEqual(['Bắt đầu soạn hàng TRIP-PN-001'])
  })

  test('chưa có phiên ở kho: lỗi kèm nút thử lại, không có danh sách rỗng', async () => {
    await renderApp(<WarehouseTripsScreen />, { auth: createMockAuth() })

    expect(await screen.findByText('Phiên đăng nhập đã hết, hãy đăng nhập lại.')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen()
    expect(screen.queryByText('Không có chuyến cần xếp')).toBeNull()
  })

  test('kéo xuống để đọc lại; lần đọc lại lỗi thì giữ danh sách, câu lỗi ở đầu danh sách', async () => {
    await renderTrips()
    expect(await screen.findByRole('header', { name: 'Chờ soạn (1)' })).toBeOnTheScreen()
    await asDispatcher((db) => db.cancelTrip(READY_TRIP, 'Khách hoãn nhận hàng'))

    await pullToRefresh()
    expect(await screen.findByText(/^3 chuyến · /)).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: READY_TRIP })).toBeNull()

    // Kho mẫu mất phiên: lần đọc lại bị từ chối, danh sách đang có ở lại
    getMockDb().restoreSession(null)
    await pullToRefresh()
    expect(await screen.findByText('Phiên đăng nhập đã hết, hãy đăng nhập lại.')).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Đang xếp hàng (1)' })).toBeOnTheScreen()
    expect(cardOf(LOADING_TRIP).getByRole('button', { name: 'Tiếp tục xếp (110/280) TRIP-011' })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull()
  })

  test('giao diện tiếng Anh', async () => {
    await renderTrips({ locale: 'en' })

    expect(await screen.findByRole('header', { name: 'Loading (1)' })).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Trips to load' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Continue loading (110/280) TRIP-011' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Start staging TRIP-2026-0914' })).toBeOnTheScreen()
    expect(screen.getByText(/^4 trips · /)).toBeOnTheScreen()
  })
})
