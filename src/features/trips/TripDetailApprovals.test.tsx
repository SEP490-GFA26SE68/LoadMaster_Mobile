import { act, configure, fireEvent, screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { pendingManualConfirms } from '@/lib/mock-db'
import { resetNativeMocks } from '@/test/native-mocks'
import { optimizedTwoCartonTrip } from '@/test/mock-db-samples'
import { MANAGER_EMAIL, renderOfficeScreen } from '@/test/office-flow'
import { clearStored, signInAs } from '@/test/render'
import { stageAll } from '@/test/trip-flow'
import { asDispatcher, stagedTwoCartonTrip, startSession, WAREHOUSE_EMAIL } from '@/test/warehouse-flow'

import { TripDetailScreen } from './TripDetailScreen'

/*
 * Hai thẻ chờ điều phối viên quyết ở Chi tiết chuyến, trên chuyến hai thùng của Long Bình: "Xác nhận tay chờ duyệt" (duyệt, từ chối kèm lý
 * do bắt buộc) và "Kiện kho báo thiếu" (tìm tiếp, bỏ kiện khỏi chuyến). Việc của kho làm dưới phiên nhân viên kho, rồi màn đăng nhập lại
 * bằng người của test. Kết quả hiện ngay trong thẻ; quản lý công ty chỉ thấy danh sách và một dòng lý do.
 */

// Chi tiết đọc chuyến, revision, nhật ký, người dùng, rồi đọc riêng từng thẻ: cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

beforeEach(() => {
  resetMockDb()
  clearStored()
  resetNativeMocks()
})

/** Cuối mỗi test chờ các lượt đọc còn dở (yêu cầu giao, thẻ chờ duyệt) xong trong `act`, không để chúng xong sau khi test đã xong. */
function settle() {
  return act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))
}

const PACKAGE = 'PKG-001-01'

/** Kho xác nhận tay kiện ở bước 1 của chuyến hai thùng (đang xếp). */
async function pendingLoadingConfirm(): Promise<string> {
  await signInAs(WAREHOUSE_EMAIL)
  const { trip } = await stagedTwoCartonTrip()
  await getMockDb().confirmLoadingManually(trip.id, { packageInstanceId: PACKAGE, reason: 'LABEL_DAMAGED', note: 'Nhãn rách một nửa' })
  return trip.id
}

/** Kho bắt đầu chuyến hai thùng, soạn mọi kiện trừ `PKG-001-01` (điểm 3) rồi báo thiếu kiện đó. */
async function shortageTrip(): Promise<string> {
  await signInAs(WAREHOUSE_EMAIL)
  const { trip } = await asDispatcher(async (db) => {
    const created = await optimizedTwoCartonTrip(db)
    await db.approveRevision(created.revision.id, [])
    return created
  })
  await startSession(trip.id)
  await stageAll(getMockDb(), trip.id, [PACKAGE])
  await getMockDb().reportStagingShortage(trip.id, PACKAGE)
  return trip.id
}

describe('xác nhận tay chờ duyệt', () => {
  test('dòng chờ nói kiện, bước, người gửi, lý do; điều phối viên duyệt thì dòng mất, thẻ nói kết quả', async () => {
    const tripId = await pendingLoadingConfirm()
    await renderOfficeScreen(<TripDetailScreen tripId={tripId} />)
    expect(await screen.findByText('Xác nhận tay chờ duyệt')).toBeOnTheScreen()
    expect(screen.getByText('1 chờ duyệt')).toBeOnTheScreen()
    expect(
      screen.getByLabelText(/^PKG-001-01 Carton A, Xếp hàng, Lê Văn Hải gửi lúc \d\d:\d\d \d\d\/\d\d, Lý do: Nhãn rách \/ mất — Nhãn rách một nửa$/),
    ).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: `Duyệt xác nhận tay ${PACKAGE}` }))
    expect(await screen.findByText(`Đã duyệt xác nhận tay ${PACKAGE}`)).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: `Duyệt xác nhận tay ${PACKAGE}` })).toBeNull()
    expect(pendingManualConfirms(await getMockDb().getTrip(tripId))).toEqual([])
    await settle()
  })

  test('từ chối đòi lý do trong tờ trượt; ghi xong kết quả của kiện bị gỡ', async () => {
    const tripId = await pendingLoadingConfirm()
    await renderOfficeScreen(<TripDetailScreen tripId={tripId} />)
    await fireEvent.press(await screen.findByRole('button', { name: `Từ chối xác nhận tay ${PACKAGE}` }))
    expect(screen.getByText(`Từ chối xác nhận tay ${PACKAGE}?`)).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Từ chối xác nhận' }))
    expect(await screen.findByText('Ghi lý do từ chối.')).toBeOnTheScreen()
    // Lý do trống: kho chưa ghi gì
    expect(pendingManualConfirms(await getMockDb().getTrip(tripId))).toHaveLength(1)

    await fireEvent.changeText(screen.getByLabelText('Lý do từ chối'), 'Nhãn còn đọc được, quét lại')
    await fireEvent.press(screen.getByRole('button', { name: 'Từ chối xác nhận' }))
    expect(await screen.findByText(`Đã từ chối xác nhận tay ${PACKAGE}`)).toBeOnTheScreen()
    expect(screen.queryByText(`Từ chối xác nhận tay ${PACKAGE}?`)).toBeNull()
    const trip = await getMockDb().getTrip(tripId)
    expect(pendingManualConfirms(trip)).toEqual([])
    expect(trip.loading?.steps.some((step) => step.packageInstanceId === PACKAGE)).toBe(false)
    await settle()
  })

  test('quản lý công ty thấy danh sách và lý do, không có nút', async () => {
    const tripId = await pendingLoadingConfirm()
    await renderOfficeScreen(<TripDetailScreen tripId={tripId} />, { email: MANAGER_EMAIL })
    expect(await screen.findByText('Chỉ điều phối viên duyệt hoặc từ chối được xác nhận tay.')).toBeOnTheScreen()
    expect(screen.getByLabelText(/^PKG-001-01 Carton A, Xếp hàng, /)).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: `Duyệt xác nhận tay ${PACKAGE}` })).toBeNull()
    expect(screen.queryByRole('button', { name: `Từ chối xác nhận tay ${PACKAGE}` })).toBeNull()
    await settle()
  })
})

describe('kiện kho báo thiếu', () => {
  test('tìm tiếp: báo thiếu đóng lại, thẻ nói kết quả', async () => {
    const tripId = await shortageTrip()
    await renderOfficeScreen(<TripDetailScreen tripId={tripId} />)
    expect(await screen.findByText('Kiện kho báo thiếu')).toBeOnTheScreen()
    expect(screen.getByText('1 chờ quyết')).toBeOnTheScreen()
    expect(screen.getByLabelText(/^PKG-001-01 Carton A, Điểm 3, Lê Văn Hải báo lúc \d\d:\d\d \d\d\/\d\d$/)).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: `Tìm tiếp kiện ${PACKAGE}` }))
    expect(await screen.findByText(`Kho tìm tiếp kiện ${PACKAGE}`)).toBeOnTheScreen()
    const trip = await getMockDb().getTrip(tripId)
    expect(trip.phase).toBe('loading')
    expect(trip.loading?.shortages ?? []).toEqual([])
    await settle()
  })

  test('bỏ kiện hỏi lại trong tờ trượt; chuyến về Đã lập kế hoạch', async () => {
    const tripId = await shortageTrip()
    await renderOfficeScreen(<TripDetailScreen tripId={tripId} />)
    await fireEvent.press(await screen.findByRole('button', { name: `Bỏ kiện ${PACKAGE} khỏi chuyến` }))
    expect(screen.getByText(`Bỏ kiện ${PACKAGE} khỏi chuyến?`)).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Bỏ kiện' }))
    expect(await screen.findByText(/^Đã bỏ kiện PKG-001-01 khỏi chuyến Chuyến về Đã lập kế hoạch, phương án lỗi thời/)).toBeOnTheScreen()
    expect((await getMockDb().getTrip(tripId)).phase).toBe('planning')
    await settle()
  })

  test('quản lý công ty thấy danh sách và lý do, không có nút', async () => {
    const tripId = await shortageTrip()
    await renderOfficeScreen(<TripDetailScreen tripId={tripId} />, { email: MANAGER_EMAIL })
    expect(await screen.findByText('Chỉ điều phối viên quyết được kiện kho báo thiếu.')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: `Tìm tiếp kiện ${PACKAGE}` })).toBeNull()
    expect(screen.queryByRole('button', { name: `Bỏ kiện ${PACKAGE} khỏi chuyến` })).toBeNull()
    await settle()
  })
})
