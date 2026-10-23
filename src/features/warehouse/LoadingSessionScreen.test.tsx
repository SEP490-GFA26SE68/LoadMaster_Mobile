import { configure, fireEvent, screen } from '@testing-library/react-native'
import { View } from 'react-native'

import { AppText } from '@/components/AppText'
import { ApiError } from '@/data/http'
import { getMockDb, resetMockDb } from '@/data/mock-db'
import { restingOnIds } from '@/domain/constraints'
import type { Revision, Trip } from '@/lib/mock-db'
import { optimizedTwoCartonTrip } from '@/test/mock-db-samples'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored, signInAs } from '@/test/render'
import {
  asDispatcher,
  labelsInLoadingOrder,
  LOADED_TRIP,
  LOADING_TRIP,
  loadUpTo,
  READY_TRIP,
  renderSession,
  STALE_TRIP,
  stageAllBut,
  startSession,
  WAREHOUSE_EMAIL,
} from '@/test/warehouse-flow'

import { SessionExitButton } from './SessionExitButton'

/*
 * Phiên soạn → xếp một chuyến (`LoadingSessionScreen`): phiên chọn màn theo pha và revision của chuyến trong kho mẫu, tự bắt đầu chuyến
 * đã duyệt đúng một lần, và nói vì sao khi chưa xếp được. Kỳ vọng về chuyến đọc thẳng từ kho. Bước Soạn hàng, bước Xếp và màn Xếp xong
 * có test riêng; ở đây chúng là bản giả nói phiên đã mở màn nào, cho chuyến nào, theo phương án nào.
 */

jest.mock('./StagingStepView', () => ({ StagingStepView: mockSessionView('staging') }))
jest.mock('./LoadingStepView', () => ({ LoadingStepView: mockSessionView('loading') }))
jest.mock('./LoadingFinishedView', () => ({ LoadingFinishedView: mockSessionView('finished') }))

/** Bản giả của một màn trong phiên: tiêu đề "<màn> <mã chuyến> <mã phương án>", và nút thoát thật của phiên. */
function mockSessionView(kind: 'staging' | 'loading' | 'finished') {
  return function MockSessionView({ trip, plan }: { trip: Trip; plan: Revision }) {
    return (
      <View>
        <AppText accessibilityRole="header">{`${kind} ${trip.id} ${plan.id}`}</AppText>
        <SessionExitButton />
      </View>
    )
  }
}

// Bắt đầu soạn hàng ghi rồi đọc lại cả chuyến lẫn nhãn: cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

const BACK = 'Về danh sách chuyến'

/** Phương án kho làm theo của một chuyến đã bắt đầu xếp. */
async function startedWith(tripId: string): Promise<string> {
  return (await getMockDb().getTrip(tripId)).loading?.revisionId ?? ''
}

describe('phiên soạn → xếp một chuyến', () => {
  beforeEach(async () => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
    await signInAs(WAREHOUSE_EMAIL)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('chuyến đã duyệt chưa bắt đầu: vào phiên là bắt đầu đúng một lần theo bản duyệt mới nhất, rồi sang bước Soạn hàng; thoát về tab Kho', async () => {
    const start = jest.spyOn(getMockDb(), 'startLoading')
    await renderSession(READY_TRIP)

    expect(screen.getByRole('header', { name: `staging ${READY_TRIP} REV-002` })).toBeOnTheScreen()
    expect(start).toHaveBeenCalledTimes(1)
    expect(start).toHaveBeenCalledWith(READY_TRIP)
    const trip = await getMockDb().getTrip(READY_TRIP)
    expect([trip.phase, trip.loading?.revisionId, trip.loading?.startedBy, trip.loading?.stagedIds, trip.loading?.steps]).toStrictEqual([
      'loading', 'REV-002', 'US-0003', [], [],
    ])

    await fireEvent.press(screen.getByRole('button', { name: BACK }))
    expect(router.dismissTo).toHaveBeenCalledWith('/warehouse')
  })

  test('bắt đầu không được: nói lỗi, chuyến chưa đổi; "Thử lại" bắt đầu lại rồi vào bước Soạn hàng', async () => {
    const start = jest.spyOn(getMockDb(), 'startLoading').mockRejectedValueOnce(new ApiError('NETWORK_ERROR'))
    await renderSession(READY_TRIP)

    expect(screen.getByRole('header', { name: READY_TRIP })).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Chưa bắt đầu soạn hàng được' })).toBeOnTheScreen()
    expect(screen.getByRole('alert', { name: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.' })).toBeOnTheScreen()
    // Nút thoát ở dải trời và lối về danh sách ở chân màn, dưới nút chính "Thử lại"
    expect(screen.getAllByRole('button', { name: BACK })).toHaveLength(2)
    expect((await getMockDb().getTrip(READY_TRIP)).phase).toBe('planning')

    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('header', { name: `staging ${READY_TRIP} REV-002` })).toBeOnTheScreen()
    expect(start).toHaveBeenCalledTimes(2)
    expect((await getMockDb().getTrip(READY_TRIP)).phase).toBe('loading')
  })

  test('mở lại chuyến đã bắt đầu: còn kiện chưa soạn là bước Soạn hàng, soạn đủ là bước Xếp — không bắt đầu lần nữa', async () => {
    await startSession(READY_TRIP)
    const start = jest.spyOn(getMockDb(), 'startLoading')
    const view = await renderSession(READY_TRIP)
    expect(screen.getByRole('header', { name: `staging ${READY_TRIP} REV-002` })).toBeOnTheScreen()
    await view.unmount()

    await stageAllBut(READY_TRIP)
    await renderSession(READY_TRIP)
    expect(screen.getByRole('header', { name: `loading ${READY_TRIP} REV-002` })).toBeOnTheScreen()
    expect(start).not.toHaveBeenCalled()
  })

  test.each([
    ['đồng nghiệp đang xếp dở (110 / 280): bước Xếp', LOADING_TRIP, 'loading'],
    ['đã xếp xong, chờ xuất phát: màn Xếp xong', LOADED_TRIP, 'finished'],
  ])('chuyến %s, theo phương án kho chốt lúc bắt đầu', async (_, tripId, kind) => {
    const start = jest.spyOn(getMockDb(), 'startLoading')
    const plan = await startedWith(tripId)
    await renderSession(tripId)

    expect(screen.getByRole('header', { name: `${kind} ${tripId} ${plan}` })).toBeOnTheScreen()
    expect(start).not.toHaveBeenCalled()
  })

  test('chưa có phương án đã duyệt: nói vì sao, không bắt đầu; nút thoát và nút chính đều về tab Kho', async () => {
    const { trip } = await asDispatcher((db) => optimizedTwoCartonTrip(db))
    await renderSession(trip.id)

    expect(screen.getByRole('header', { name: 'Chưa có phương án đã duyệt' })).toBeOnTheScreen()
    expect(screen.getByText(`Chuyến ${trip.id} chưa có phương án đã duyệt. Điều phối viên cần duyệt phương án trước khi kho xếp.`)).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull()
    expect((await getMockDb().getTrip(trip.id)).phase).toBe('planning')

    const exits = screen.getAllByRole('button', { name: BACK })
    expect(exits).toHaveLength(2)
    for (const exit of exits) await fireEvent.press(exit)
    expect(router.dismissTo.mock.calls).toStrictEqual([['/warehouse'], ['/warehouse']])
  })

  test('chuyến đã huỷ: lý do của điều phối viên; huỷ lúc đang xếp thì nhắc dỡ các kiện đã lên xe', async () => {
    const { trip } = await asDispatcher(async (db) => {
      const created = await optimizedTwoCartonTrip(db)
      await db.cancelTrip(created.trip.id, 'Khách hoãn nhận hàng')
      return created
    })
    const view = await renderSession(trip.id)
    expect(screen.getByRole('header', { name: 'Chuyến đã huỷ' })).toBeOnTheScreen()
    expect(screen.getByText(`Chuyến ${trip.id} đã huỷ: Khách hoãn nhận hàng`)).toBeOnTheScreen()
    await view.unmount()

    // TRIP-011 (seed): kho đã xếp 110 / 280 kiện
    await asDispatcher((db) => db.cancelTrip(LOADING_TRIP, 'Xe hỏng máy lạnh'))
    await renderSession(LOADING_TRIP)
    expect(screen.getByRole('header', { name: 'Chuyến đã huỷ' })).toBeOnTheScreen()
    expect(screen.getByText(`Chuyến ${LOADING_TRIP} đã huỷ: Xe hỏng máy lạnh Dỡ 110 kiện đã xếp khỏi xe.`)).toBeOnTheScreen()
  })

  test('bản duyệt lỗi thời: không bắt đầu, chờ điều phối viên tối ưu và duyệt lại; kèm dòng phụ và thông tin chuyến', async () => {
    const start = jest.spyOn(getMockDb(), 'startLoading')
    await renderSession(STALE_TRIP)

    expect(screen.getByRole('header', { name: 'Chờ tối ưu và duyệt lại' })).toBeOnTheScreen()
    expect(screen.getByText(/^Phương án đã duyệt của chuyến TRIP-013 lỗi thời: /)).toBeOnTheScreen()
    // Dòng phụ và thẻ chuyến đọc từ danh sách chuyến của kho
    expect(await screen.findByText('Lỗi thời — cần tối ưu lại')).toBeOnTheScreen()
    expect(screen.getByText('Tuyến Biên Hoà – Long Bình Tân')).toBeOnTheScreen()
    expect(screen.getByText('Ngày chạy')).toBeOnTheScreen()
    expect(screen.getByText('15/09/2026')).toBeOnTheScreen()
    expect(screen.getByText('Số kiện')).toBeOnTheScreen()
    expect(start).not.toHaveBeenCalled()
    expect((await getMockDb().getTrip(STALE_TRIP)).phase).toBe('planning')
  })

  test('điều phối viên bỏ kiện kho báo thiếu: chuyến quay về chờ tối ưu lại, kiện đã soạn giữ ở khu chờ', async () => {
    await startSession(READY_TRIP)
    const [first] = await labelsInLoadingOrder(READY_TRIP)
    const short = first?.packageInstanceId ?? ''
    await getMockDb().reportStagingShortage(READY_TRIP, short)
    await asDispatcher((db) => db.resolveStagingShortage(READY_TRIP, short, 'DROP'))
    await renderSession(READY_TRIP)

    expect(screen.getByRole('header', { name: 'Chờ điều phối tối ưu lại' })).toBeOnTheScreen()
    expect(
      screen.getByText(`Điều phối viên đã bỏ kiện thiếu khỏi chuyến ${READY_TRIP}. Kiện đã soạn giữ nguyên ở khu chờ; kho làm tiếp khi phương án mới được duyệt.`),
    ).toBeOnTheScreen()
    expect((await getMockDb().getTrip(READY_TRIP)).phase).toBe('planning')
  })

  test('kiện hỏng có kiện tựa lên khi đã có kiện trên xe: chuyến quay về chờ tối ưu lại, kho được nhắc dỡ phần đã xếp', async () => {
    await startSession(READY_TRIP)
    await stageAllBut(READY_TRIP)
    const { placements } = (await getMockDb().getRevision('REV-002')).result
    const order = await labelsInLoadingOrder(READY_TRIP)
    // Kiện đầu tiên sau bước 1 mà phương án có kiện khác tựa lên: tới bước của nó, các kiện trước đã lên xe
    const step = order.findIndex((label, index) => index > 0 && restingOnIds(placements, label.packageInstanceId).length > 0) + 1
    expect(step).toBeGreaterThan(1)
    const damaged = await loadUpTo(READY_TRIP, step)
    await getMockDb().reportDamagedPackage(READY_TRIP, damaged.packageInstanceId)
    await renderSession(READY_TRIP)

    expect(screen.getByRole('header', { name: 'Chờ điều phối tối ưu lại' })).toBeOnTheScreen()
    expect(
      screen.getByText(
        `Kiện hỏng có kiện khác tựa lên trong phương án nên chuyến ${READY_TRIP} phải xếp lại theo phương án mới. Chờ điều phối viên tối ưu lại và duyệt. Dỡ các kiện đã xếp ra khu chờ.`,
      ),
    ).toBeOnTheScreen()
  })

  test('không tải được chuyến: nói lý do của kho, không lộ mã lỗi; có thử lại và lối về danh sách', async () => {
    await renderSession('TRIP-KHONG-CO')

    expect(screen.getByRole('header', { name: 'Không tải được chuyến' })).toBeOnTheScreen()
    expect(screen.getByRole('alert', { name: 'Không tìm thấy TRIP-KHONG-CO.' })).toBeOnTheScreen()
    expect(screen.queryByText(/NOT_FOUND/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen()
    expect(screen.getAllByRole('button', { name: BACK })).toHaveLength(2)
  })

  test('mất mạng lúc tải chuyến: "Thử lại" đọc lại và vào phiên', async () => {
    const read = jest.spyOn(getMockDb(), 'getTrip').mockRejectedValueOnce(new ApiError('NETWORK_ERROR'))
    await renderSession(READY_TRIP)
    expect(screen.getByRole('header', { name: 'Không tải được chuyến' })).toBeOnTheScreen()
    expect(screen.getByRole('alert', { name: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.' })).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('header', { name: `staging ${READY_TRIP} REV-002` })).toBeOnTheScreen()
    expect(read.mock.calls.length).toBeGreaterThan(1)
  })

  test('giao diện tiếng Anh: tiêu đề, câu lý do và lối về danh sách đổi theo', async () => {
    await renderSession(STALE_TRIP, { locale: 'en' })

    expect(screen.getByRole('header', { name: 'Waiting to be optimized and approved again' })).toBeOnTheScreen()
    expect(screen.getByText(/^The approved plan of trip TRIP-013 is outdated: /)).toBeOnTheScreen()
    expect(screen.getAllByRole('button', { name: 'Back to trips' })).toHaveLength(2)
    expect(await screen.findByText('Stale — optimize again')).toBeOnTheScreen()
  })
})
