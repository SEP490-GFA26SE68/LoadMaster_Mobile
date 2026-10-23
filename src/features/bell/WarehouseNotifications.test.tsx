import { configure, fireEvent, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { useAuth } from '@/features/auth/AuthProvider'
import * as warehouseApi from '@/features/warehouse/warehouse-api'
import { pendingManualConfirms, type MockDb } from '@/lib/mock-db'
import { router } from '@/test/native-mocks'
import { clearStored, renderApp, signInAs } from '@/test/render'
import { asDispatcher, labelsInLoadingOrder, LOADING_TRIP, READY_TRIP, startSession, WAREHOUSE_EMAIL } from '@/test/warehouse-flow'

import { NotificationBell } from './NotificationBell'
import { resetReadNotifications } from './notification-read'
import { NotificationsScreen } from './NotificationsScreen'

configure({ asyncUtilTimeout: 5000 })

/** Đồng nghiệp kho cùng công ty (Đỗ Thị Hạnh, `US-0011`): đọc cùng thông báo chung của kho. */
const COLLEAGUE_EMAIL = 'hanh.do@loadmaster.vn'
/** Hỗ trợ khách hàng mẫu (Tạ Thị Ngọc Ánh). */
const SUPPORT_ID = 'US-NT-02'
const READY_TARGET = `Chuyến ${READY_TRIP} · Tuyến Q.7 – Thủ Dầu Một – Dĩ An – Biên Hoà`
const LOADING_TARGET = `Chuyến ${LOADING_TRIP} · Tuyến Tân Bình – Q.1 – Q.7`

/** Như bộ điều hướng gốc của app: đang mở lại phiên thì chưa vẽ gì, mở xong mới vẽ chuông và màn của người đăng nhập. */
function AfterRestore({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  return status === 'restoring' ? null : children
}

const renderNotifications = () =>
  renderApp(
    <AfterRestore>
      <NotificationBell />
      <NotificationsScreen />
    </AfterRestore>,
    { auth: createMockAuth() },
  )

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Tên đọc của một dòng thông báo: "Chưa đọc" khi chưa đọc, giờ · ngày (giờ thật của máy chạy test), rồi các dòng chữ. */
const rowName = (unread: boolean, ...lines: string[]) => new RegExp(`^${unread ? 'Chưa đọc, ' : ''}[^,]+, ${lines.map(escape).join(', ')}$`)

/** Route phiên soạn → xếp của một chuyến ở màn kho. */
const loadingRoute = (tripId: string) => ({ pathname: '/loading/[tripId]', params: { tripId } })

/** Nhân viên kho mẫu bắt đầu soạn chuyến chờ soạn; trả mã các kiện theo thứ tự xếp. */
async function stagingSession(): Promise<string[]> {
  await signInAs(WAREHOUSE_EMAIL)
  await startSession(READY_TRIP)
  return (await labelsInLoadingOrder(READY_TRIP)).map((label) => label.packageInstanceId)
}

/** Nhân viên kho mẫu đăng nhập và gửi một yêu cầu hỗ trợ. */
async function sendTicket() {
  await signInAs(WAREHOUSE_EMAIL)
  return getMockDb().createSupportTicket({
    kind: 'TECHNICAL',
    title: 'Máy tính bảng không quét được nhãn',
    description: 'Camera của máy tính bảng ở Kho Long Bình không lấy nét được nhãn QR của kiện.',
  })
}

/** Như `asDispatcher`: chạy `work` dưới phiên của hỗ trợ khách hàng rồi trả kho về phiên trước đó. */
async function asSupport<T>(work: (db: MockDb) => Promise<T>): Promise<T> {
  const db = getMockDb()
  const previous = db.sessionUser()?.id ?? null
  db.restoreSession(SUPPORT_ID)
  try {
    return await work(db)
  } finally {
    db.restoreSession(previous)
  }
}

describe('thông báo của nhân viên kho', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
    resetReadNotifications()
  })

  test('điều phối viên chọn tìm tiếp kiện mình báo thiếu: chuông báo chưa đọc, dòng mở phiên của chuyến và thành đã đọc', async () => {
    const [missing = ''] = await stagingSession()
    await getMockDb().reportStagingShortage(READY_TRIP, missing)
    await asDispatcher((db) => db.resolveStagingShortage(READY_TRIP, missing, 'KEEP_SEARCHING'))
    await renderNotifications()

    expect(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' })).toBeOnTheScreen()
    const sentence = `Điều phối viên chọn tìm tiếp kiện ${missing} — tìm kiện này rồi soạn vào khu chờ`
    await fireEvent.press(screen.getByRole('button', { name: rowName(true, sentence, READY_TARGET) }))

    expect(router.push).toHaveBeenCalledWith(loadingRoute(READY_TRIP))
    expect(await screen.findByRole('button', { name: 'Thông báo' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: rowName(false, sentence, READY_TARGET) })).toBeOnTheScreen()
  })

  test('điều phối viên bỏ kiện mình báo thiếu khỏi chuyến: kiện đã soạn giữ ở khu chờ', async () => {
    const [missing = ''] = await stagingSession()
    await getMockDb().reportStagingShortage(READY_TRIP, missing)
    await asDispatcher((db) => db.resolveStagingShortage(READY_TRIP, missing, 'DROP'))
    await renderNotifications()

    expect(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' })).toBeOnTheScreen()
    const sentence = `Điều phối viên đã bỏ kiện ${missing} khỏi chuyến — kiện đã soạn giữ ở khu chờ, làm tiếp khi phương án mới được duyệt`
    await fireEvent.press(screen.getByRole('button', { name: rowName(true, sentence, READY_TARGET) }))
    expect(router.push).toHaveBeenCalledWith(loadingRoute(READY_TRIP))
  })

  test('điều phối viên từ chối xác nhận tay của mình: câu nêu kiện phải kiểm lại, lý do ở dòng chi tiết', async () => {
    const [, unreadable = ''] = await stagingSession()
    const db = getMockDb()
    await db.confirmStagingManually(READY_TRIP, { packageInstanceId: unreadable, reason: 'QR_UNREADABLE' })
    const [pending] = pendingManualConfirms(await db.getTrip(READY_TRIP), 'STAGING')
    await asDispatcher((dispatcher) => dispatcher.rejectManualConfirmation(READY_TRIP, pending?.id ?? '', 'Nhãn còn nguyên — quét lại mã QR'))
    await renderNotifications()

    expect(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' })).toBeOnTheScreen()
    const sentence = `Điều phối viên từ chối xác nhận tay kiện ${unreadable}. Kiểm lại kiện này rồi đối chiếu lại.`
    expect(screen.getByRole('button', { name: rowName(true, sentence, READY_TARGET, 'Lý do: Nhãn còn nguyên — quét lại mã QR') })).toBeOnTheScreen()
    expect(screen.getByText('Lý do: Nhãn còn nguyên — quét lại mã QR')).toBeOnTheScreen()
  })

  test('chuyến bị huỷ lúc đang xếp: dỡ số kiện đã lên xe; huỷ lúc còn soạn hàng: không phải dỡ', async () => {
    await stagingSession()
    await asDispatcher(async (db) => {
      await db.cancelTrip(LOADING_TRIP, 'Xe hỏng máy lạnh')
      await db.cancelTrip(READY_TRIP, 'Khách hoãn nhận hàng')
    })
    await renderNotifications()

    expect(await screen.findByRole('button', { name: 'Thông báo, 2 chưa đọc' })).toBeOnTheScreen()
    expect(screen.getByText('2 chưa đọc')).toBeOnTheScreen()
    const staged = screen.getByRole('button', {
      name: rowName(true, 'Chuyến đã huỷ', READY_TARGET, 'Chưa có kiện nào lên xe, không phải dỡ.', 'Lý do: Khách hoãn nhận hàng'),
    })
    const loading = screen.getByRole('button', { name: rowName(true, 'Chuyến đã huỷ', LOADING_TARGET, 'Dỡ 110 kiện đã xếp khỏi xe.', 'Lý do: Xe hỏng máy lạnh') })

    await fireEvent.press(loading)
    expect(router.push).toHaveBeenCalledWith(loadingRoute(LOADING_TRIP))
    expect(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' })).toBeOnTheScreen()
    expect(staged).toBeOnTheScreen()
  })

  test('bộ phận hỗ trợ trả lời yêu cầu của mình: dòng không mở chuyến nào', async () => {
    const ticket = await sendTicket()
    await asSupport((db) => db.replyToSupportTicket(ticket.id, 'Đã ghi nhận, bộ phận kỹ thuật sẽ gọi lại trong hôm nay.'))
    await renderNotifications()

    expect(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' })).toBeOnTheScreen()
    expect(screen.getByLabelText(rowName(true, 'Bộ phận hỗ trợ đã trả lời yêu cầu của bạn', `Yêu cầu hỗ trợ ${ticket.id}`))).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: /Bộ phận hỗ trợ/ })).toBeNull()
  })

  test('dấu đã đọc theo người dùng: đồng nghiệp kho vẫn thấy chưa đọc thông báo mình đã đọc', async () => {
    await signInAs(WAREHOUSE_EMAIL)
    await asDispatcher((db) => db.cancelTrip(LOADING_TRIP, 'Xe hỏng máy lạnh'))
    const first = await renderNotifications()
    expect(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' })).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Đánh dấu đã đọc' }))
    expect(await screen.findByRole('button', { name: 'Thông báo' })).toBeOnTheScreen()
    await first.unmount()

    await signInAs(COLLEAGUE_EMAIL)
    await renderNotifications()
    expect(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: rowName(true, 'Chuyến đã huỷ', LOADING_TARGET, 'Dỡ 110 kiện đã xếp khỏi xe.', 'Lý do: Xe hỏng máy lạnh') })).toBeOnTheScreen()
  })

  test('việc chính mình làm không thành thông báo', async () => {
    // Tự trả lời yêu cầu hỗ trợ của mình: đúng loại thông báo của kho và đúng người gửi — chỉ người làm là chính mình
    const ticket = await sendTicket()
    await getMockDb().replyToSupportTicket(ticket.id, 'Bổ sung: máy quét được nhãn khi bật đèn khu chờ.')
    await renderNotifications()

    expect(await screen.findByText('Không có thông báo nào trong 7 ngày qua.')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Thông báo' })).toBeOnTheScreen()
  })

  test('nguồn dữ liệu của kho chưa có thông báo: không có chuông, màn nói không làm được', async () => {
    const capabilities = jest
      .spyOn(warehouseApi, 'warehouseCapabilities')
      .mockReturnValue({ manualConfirm: true, shortages: true, seal: true, notifications: false })
    try {
      await signInAs(WAREHOUSE_EMAIL)
      await asDispatcher((db) => db.cancelTrip(LOADING_TRIP, 'Xe hỏng máy lạnh'))
      await renderNotifications()

      expect(await screen.findByText('Máy chủ chưa làm được việc này.')).toBeOnTheScreen()
      expect(screen.queryByRole('button', { name: /^Thông báo/ })).toBeNull()
    } finally {
      capabilities.mockRestore()
    }
  })
})
