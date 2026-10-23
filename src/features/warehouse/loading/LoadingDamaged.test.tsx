import { configure, fireEvent, screen } from '@testing-library/react-native'

import { AppText } from '@/components/AppText'
import { ApiError } from '@/data/http'
import { getMockDb, resetMockDb } from '@/data/mock-db'
import { restingOnIds } from '@/domain/constraints'
import type { Revision, Trip } from '@/lib/mock-db'
import { resetNativeMocks } from '@/test/native-mocks'
import { clearStored, signInAs } from '@/test/render'
import {
  labelsInLoadingOrder,
  loadUpTo,
  READY_TRIP,
  renderSession,
  stageAllBut,
  stagedTwoCartonTrip,
  startSession,
  WAREHOUSE_EMAIL,
} from '@/test/warehouse-flow'

/*
 * "Kiện hỏng" ở bước Xếp (`LoadingStepView` qua phiên thật, kho mẫu của app): tờ hỏi lại nói trước hệ quả theo phương án — không kiện nào
 * tựa lên thì kho bỏ kiện lại và xếp tiếp, có kiện tựa lên thì chuyến quay về chờ tối ưu lại. Màn Xếp xong là bản giả.
 */

jest.mock('../LoadingFinishedView', () => ({ LoadingFinishedView: mockFinishedView() }))

/** Bản giả của màn Xếp xong: tiêu đề "finished <mã chuyến> <mã phương án>". */
function mockFinishedView() {
  return function MockFinishedView({ trip, plan }: { trip: Trip; plan: Revision }) {
    return <AppText accessibilityRole="header">{`finished ${trip.id} ${plan.id}`}</AppText>
  }
}

// Mỗi lần ghi, phiên đọc lại cả chuyến từ kho mẫu: cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

const NO_SUPPORT = 'Kiện về kho kiện kèm cờ Hư hỏng và không lên xe. Trong phương án không kiện nào tựa lên nó: kho xếp tiếp các kiện còn lại.'

/** Chờ thẻ hướng dẫn của kiện `id` rồi mở tờ hỏi lại "Kiện hỏng" của nó. */
async function openDamaged(id: string) {
  expect(await screen.findByRole('header', { name: id })).toBeOnTheScreen()
  await fireEvent.press(screen.getByRole('button', { name: 'Kiện hỏng' }))
  expect(await screen.findByRole('header', { name: `Ghi ${id} là kiện hỏng?` })).toBeOnTheScreen()
}

describe('kiện hỏng ở bước Xếp', () => {
  beforeEach(async () => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
    await signInAs(WAREHOUSE_EMAIL)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('không kiện nào tựa lên: hỏi lại, "Quay lại" không ghi gì; ghi thì kiện bị bỏ lại kho, xếp tiếp; hỏng hết thì xong xếp', async () => {
    const { trip } = await stagedTwoCartonTrip()
    await renderSession(trip.id)

    await openDamaged('PKG-001-01')
    expect(screen.getByText(NO_SUPPORT)).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }))
    expect(screen.queryByRole('header', { name: 'Ghi PKG-001-01 là kiện hỏng?' })).toBeNull()
    expect((await getMockDb().getTrip(trip.id)).loading?.steps).toEqual([])

    await openDamaged('PKG-001-01')
    await fireEvent.press(screen.getByRole('button', { name: 'Ghi kiện hỏng' }))
    expect(await screen.findByText('Đã bỏ lại kiện hỏng PKG-001-01 Kiện không lên xe. Xếp tiếp kiện kế tiếp.')).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Ghi PKG-001-01 là kiện hỏng?' })).toBeNull()
    expect(screen.getByRole('header', { name: 'PKG-002-01' })).toBeOnTheScreen()
    expect(screen.getByText('Đã có kết quả 1 / 2 kiện')).toBeOnTheScreen()
    // Dải kết quả ẩn được
    await fireEvent.press(screen.getByRole('button', { name: 'Ẩn thông báo' }))
    expect(screen.queryByText(/^Đã bỏ lại kiện hỏng/)).toBeNull()

    await openDamaged('PKG-002-01')
    await fireEvent.press(screen.getByRole('button', { name: 'Ghi kiện hỏng' }))
    expect(await screen.findByRole('header', { name: `finished ${trip.id} ${trip.loading?.revisionId ?? ''}` })).toBeOnTheScreen()
    const after = await getMockDb().getTrip(trip.id)
    expect(after.phase).toBe('loaded')
    expect(after.loading?.steps.map((step) => [step.packageInstanceId, step.outcome])).toEqual([
      ['PKG-001-01', 'damaged'],
      ['PKG-002-01', 'damaged'],
    ])
  })

  test('kiện cuối hỏng khi còn xác nhận tay chờ duyệt: dải kết quả vẫn hiện, ngay trên nút hoàn tất đang mờ', async () => {
    const { trip } = await stagedTwoCartonTrip()
    // Bước 1 ghi bằng xác nhận tay, chờ điều phối viên duyệt: kho chưa cho xong xếp sau kiện cuối
    await getMockDb().confirmLoadingManually(trip.id, { packageInstanceId: 'PKG-001-01', reason: 'LABEL_DAMAGED' })
    await renderSession(trip.id)

    await openDamaged('PKG-002-01')
    await fireEvent.press(screen.getByRole('button', { name: 'Ghi kiện hỏng' }))
    expect(await screen.findByText('Đã bỏ lại kiện hỏng PKG-002-01 Kiện không lên xe. Xếp tiếp kiện kế tiếp.')).toBeOnTheScreen()
    expect(screen.getByText('Đã có kết quả 2 / 2 kiện')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Hoàn tất xếp hàng' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Kiện hỏng' })).toBeNull()
    const after = await getMockDb().getTrip(trip.id)
    expect(after.phase).toBe('loading')
    expect(after.loading?.steps.map((step) => [step.packageInstanceId, step.outcome])).toEqual([
      ['PKG-001-01', 'loaded'],
      ['PKG-002-01', 'damaged'],
    ])

    await fireEvent.press(screen.getByRole('button', { name: 'Ẩn thông báo' }))
    expect(screen.queryByText(/^Đã bỏ lại kiện hỏng/)).toBeNull()
  })

  test('kho từ chối: câu lỗi trong tờ, tờ ở lại để thử lại', async () => {
    const { trip } = await stagedTwoCartonTrip()
    jest.spyOn(getMockDb(), 'reportDamagedPackage').mockRejectedValueOnce(new ApiError('NETWORK_ERROR'))
    await renderSession(trip.id)

    await openDamaged('PKG-001-01')
    await fireEvent.press(screen.getByRole('button', { name: 'Ghi kiện hỏng' }))
    expect(await screen.findByText('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.')).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Ghi PKG-001-01 là kiện hỏng?' })).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Ghi kiện hỏng' }))
    expect(await screen.findByText(/^Đã bỏ lại kiện hỏng PKG-001-01/)).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Ghi PKG-001-01 là kiện hỏng?' })).toBeNull()
  })

  test('có kiện tựa lên: tờ nói chuyến sẽ quay về Đã lập kế hoạch; ghi xong phiên chờ tối ưu lại, nhắc dỡ phần đã xếp', async () => {
    await startSession(READY_TRIP)
    await stageAllBut(READY_TRIP)
    const { placements } = (await getMockDb().getRevision('REV-002')).result
    const order = await labelsInLoadingOrder(READY_TRIP)
    // Kiện đầu tiên sau bước 1 mà phương án có kiện khác tựa lên: tới bước của nó, các kiện trước đã lên xe
    const step = order.findIndex((label, index) => index > 0 && restingOnIds(placements, label.packageInstanceId).length > 0) + 1
    expect(step).toBeGreaterThan(1)
    const damaged = await loadUpTo(READY_TRIP, step)
    const resting = restingOnIds(placements, damaged.packageInstanceId).length
    await renderSession(READY_TRIP)

    await openDamaged(damaged.packageInstanceId)
    expect(
      screen.getByText(
        `Kiện về kho kiện kèm cờ Hư hỏng. Trong phương án có ${resting} kiện tựa lên nó: chuyến quay về Đã lập kế hoạch, kho phải dỡ ra và xếp lại theo phương án mới.`,
      ),
    ).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Ghi kiện hỏng' }))

    expect(await screen.findByRole('header', { name: 'Chờ điều phối tối ưu lại' })).toBeOnTheScreen()
    expect(
      screen.getByText(
        `Kiện hỏng có kiện khác tựa lên trong phương án nên chuyến ${READY_TRIP} phải xếp lại theo phương án mới. Chờ điều phối viên tối ưu lại và duyệt. Dỡ các kiện đã xếp ra khu chờ.`,
      ),
    ).toBeOnTheScreen()
    expect((await getMockDb().getTrip(READY_TRIP)).phase).toBe('planning')
  })
})
