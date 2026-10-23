import { render, screen } from '@testing-library/react-native'
import type { ReactElement } from 'react'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { I18nProvider, type Locale } from '@/lib/i18n'
import { clearStored, signInAs } from '@/test/render'
import { asDispatcher, labelsInLoadingOrder, READY_TRIP, startSession, WAREHOUSE_EMAIL } from '@/test/warehouse-flow'

import { ConfirmNotices } from './ConfirmNotices'
import { PlanNotices } from './PlanNotices'
import { StepHeader } from './StepHeader'

/* Phần dùng chung của các màn trong phiên soạn → xếp: dải tiến độ trong dải trời, nhãn của phương án, dải xác nhận tay. */

/** Các phần này chỉ cần chữ và cách viết số theo ngôn ngữ, không cần phiên đăng nhập hay truy vấn. */
function renderPart(ui: ReactElement, locale: Locale = 'vi') {
  return render(<I18nProvider initialLocale={locale}>{ui}</I18nProvider>)
}

describe('StepHeader', () => {
  test('bước Soạn hàng: số kiện đã soạn trên tổng, thanh tiến độ theo phần trăm đã soạn', async () => {
    await renderPart(<StepHeader kind="staging" staged={33} total={132} />)

    expect(screen.getByText('Đã soạn 33 / 132')).toBeOnTheScreen()
    expect(screen.getByText('25%')).toBeOnTheScreen()
    expect(screen.getByRole('progressbar', { name: 'Tiến độ soạn hàng' })).toHaveAccessibilityValue({ min: 0, max: 100, now: 25 })
  })

  test('bước Xếp: bước của kiện đang hỏi, thanh tiến độ theo số kiện đã có kết quả', async () => {
    await renderPart(<StepHeader kind="loading" step={111} total={280} recorded={110} />)

    expect(screen.getByText('Bước 111 / 280')).toBeOnTheScreen()
    expect(screen.getByText('Đã có kết quả 110 / 280 kiện')).toBeOnTheScreen()
    // 110 / 280 = 39,3 %
    expect(screen.getByText('39%')).toBeOnTheScreen()
    expect(screen.getByRole('progressbar', { name: 'Tiến độ xếp hàng' })).toHaveAccessibilityValue({ min: 0, max: 100, now: 39 })
  })

  test('bước không vượt tổng số kiện; chuyến không có kiện nào coi như xong', async () => {
    const view = await renderPart(<StepHeader kind="loading" step={281} total={280} recorded={280} />)
    expect(screen.getByText('Bước 280 / 280')).toBeOnTheScreen()
    expect(screen.getByText('100%')).toBeOnTheScreen()
    await view.unmount()

    await renderPart(<StepHeader kind="staging" staged={0} total={0} />)
    expect(screen.getByRole('progressbar', { name: 'Tiến độ soạn hàng' })).toHaveAccessibilityValue({ now: 100 })
  })

  test('giao diện tiếng Anh', async () => {
    await renderPart(<StepHeader kind="loading" step={2} total={2} recorded={1} />, 'en')
    expect(screen.getByText('Step 2 / 2')).toBeOnTheScreen()
    expect(screen.getByText('1 / 2 packages have a result')).toBeOnTheScreen()
  })
})

describe('PlanNotices', () => {
  test('phương án của mock tối ưu, thứ tự tính lại khi duyệt: hai nhãn', async () => {
    await renderPart(<PlanNotices model={{ isMockResult: true, ordersRecomputed: true }} />)
    expect(screen.getByText('MOCK RESULT')).toBeOnTheScreen()
    expect(screen.getByText('Thứ tự xếp tính lại khi duyệt')).toBeOnTheScreen()
  })

  test('không có nhãn nào thì không vẽ gì', async () => {
    await renderPart(<PlanNotices model={{ isMockResult: false, ordersRecomputed: false }} />)
    expect(screen.queryByText('MOCK RESULT')).toBeNull()
    expect(screen.queryByText('Thứ tự xếp tính lại khi duyệt')).toBeNull()
  })
})

describe('ConfirmNotices', () => {
  beforeEach(async () => {
    resetMockDb()
    clearStored()
    await signInAs(WAREHOUSE_EMAIL)
  })

  test('xác nhận tay bị từ chối kèm lý do của điều phối viên; xác nhận tay còn chờ duyệt được đếm', async () => {
    await startSession(READY_TRIP)
    const [first, second] = await labelsInLoadingOrder(READY_TRIP)
    const rejected = first?.packageInstanceId ?? ''
    const db = getMockDb()
    const { trip: withFirst } = await db.confirmStagingManually(READY_TRIP, { packageInstanceId: rejected, reason: 'LABEL_DAMAGED' })
    await db.confirmStagingManually(READY_TRIP, { packageInstanceId: second?.packageInstanceId ?? '', reason: 'QR_UNREADABLE' })
    const confirmation = withFirst.verifications?.at(-1)?.id ?? ''
    await asDispatcher((dispatcher) => dispatcher.rejectManualConfirmation(READY_TRIP, confirmation, 'Ảnh chụp cho thấy sai kiện'))
    await renderPart(<ConfirmNotices trip={await db.getTrip(READY_TRIP)} />)

    expect(
      screen.getByText(`Điều phối viên từ chối xác nhận tay kiện ${rejected}. Kiểm lại kiện này rồi đối chiếu lại. Lý do: Ảnh chụp cho thấy sai kiện`),
    ).toBeOnTheScreen()
    expect(screen.getByText('Còn 1 xác nhận tay chờ điều phối viên duyệt.')).toBeOnTheScreen()
  })

  test('không có xác nhận tay nào thì không vẽ gì', async () => {
    await startSession(READY_TRIP)
    await renderPart(<ConfirmNotices trip={await getMockDb().getTrip(READY_TRIP)} />)
    expect(screen.queryByText(/xác nhận tay/)).toBeNull()
  })
})
