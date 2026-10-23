import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native'

import { AppText } from '@/components/AppText'
import { ApiError } from '@/data/http'
import { getMockDb, resetMockDb } from '@/data/mock-db'
import { pendingManualConfirms, type Revision, type Trip } from '@/lib/mock-db'
import { resetNativeMocks } from '@/test/native-mocks'
import { clearStored, signInAs } from '@/test/render'
import { asDispatcher, labelsInLoadingOrder, LOADING_TRIP, loadUpTo, renderSession, stagedTwoCartonTrip, WAREHOUSE_EMAIL } from '@/test/warehouse-flow'

/*
 * Bước Xếp của phiên kho (`LoadingStepView`), vẽ qua phiên thật (`LoadingSessionScreen`) trên kho mẫu của app: thẻ hướng dẫn của kiện,
 * đối chiếu từng kiện qua tờ ba mức, thẻ "Đã xếp", xác nhận tay chờ duyệt và lúc mọi kiện đã có kết quả. Kỳ vọng về chuyến đọc thẳng từ
 * kho. Màn Xếp xong có test riêng; ở đây nó là bản giả nói phiên đã sang màn đó, cho chuyến nào, theo phương án nào. Kiện hỏng ở
 * `loading/LoadingDamaged.test.tsx`.
 */

jest.mock('./LoadingFinishedView', () => ({ LoadingFinishedView: mockFinishedView() }))

/** Bản giả của màn Xếp xong: tiêu đề "finished <mã chuyến> <mã phương án>". */
function mockFinishedView() {
  return function MockFinishedView({ trip, plan }: { trip: Trip; plan: Revision }) {
    return <AppText accessibilityRole="header">{`finished ${trip.id} ${plan.id}`}</AppText>
  }
}

// Mỗi lần ghi, phiên đọc lại cả chuyến từ kho mẫu; thẻ "Đã xếp" đứng 1,2 giây: cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

const CODE_FIELD = 'Mã QR hoặc mã bên gửi'
const VERIFY = 'Đối chiếu kiện'
const COMPLETE = 'Hoàn tất xếp hàng'

/** Chờ thẻ hướng dẫn của kiện `id` (thẻ "Đã xếp" của kiện trước đã hết giờ) rồi mở tờ đối chiếu của bước `step`, sang tab `tab` khi có. */
async function openVerify(id: string, step: number, tab?: 'Quét QR' | 'Gõ mã' | 'Xác nhận tay') {
  expect(await screen.findByRole('header', { name: id })).toBeOnTheScreen()
  await fireEvent.press(screen.getByRole('button', { name: VERIFY }))
  expect(await screen.findByRole('header', { name: `Đối chiếu kiện bước ${step}` })).toBeOnTheScreen()
  if (tab !== undefined) await fireEvent.press(screen.getByRole('tab', { name: tab }))
}

/** Camera đọc thấy `data` một lần. */
async function scan(data: string) {
  await fireEvent(screen.getByTestId('qr-camera', { includeHiddenElements: true }), 'barcodeScanned', { data })
}

async function typeCode(code: string) {
  await fireEvent.changeText(screen.getByLabelText(CODE_FIELD), code)
  await fireEvent.press(screen.getByRole('button', { name: 'Đối chiếu mã' }))
}

/** Phương án kho làm theo của chuyến (bản duyệt chốt lúc bắt đầu soạn hàng). */
function planOf(trip: Trip): string {
  return trip.loading?.revisionId ?? ''
}

describe('bước Xếp của phiên kho', () => {
  beforeEach(async () => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
    await signInAs(WAREHOUSE_EMAIL)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('thẻ hướng dẫn: mã kiện, điểm giao, vị trí, hướng đặt, khoảng cách tới vách và vật cản sát bên; sơ đồ thùng chỉ để nhìn', async () => {
    const { trip } = await stagedTwoCartonTrip()
    await renderSession(trip.id)

    expect(screen.getByRole('header', { name: 'PKG-001-01' })).toBeOnTheScreen()
    expect(screen.getByText('Bước 1 / 2')).toBeOnTheScreen()
    expect(screen.getByText('Đã có kết quả 0 / 2 kiện')).toBeOnTheScreen()
    expect(screen.getByLabelText('Điểm 3 · Siêu thị Co.opmart Biên Hoà')).toBeOnTheScreen()
    expect(screen.getByLabelText('Vị trí, Lớp 1 · Cách cửa 360 cm')).toBeOnTheScreen()
    expect(screen.getByLabelText('Khối lượng, 30 kg')).toBeOnTheScreen()
    expect(screen.getByText('LWH · Đứng thẳng · cạnh dài dọc thùng')).toBeOnTheScreen()
    expect(screen.getByText('120 × 60 × 45 cm')).toBeOnTheScreen()
    expect(screen.getByRole('img', { name: /^Minh hoạ hướng đặt LWH: / })).toBeOnTheScreen()
    expect(screen.getByText('Mặt trên gốc hướng lên, đặt khít kiện bên cạnh')).toBeOnTheScreen()
    for (const row of [
      'Cách vách trước, 120 cm',
      'Cách vách trái, 0 cm',
      'Cách vách phải, 180 cm',
      'Cách cửa sau, 360 cm',
      'Cách sàn, 0 cm',
      'Phía dưới gần nhất, Không có kiện',
      'Vật cản gần nhất, Hốc bánh xe OBS-001 · khe 0 cm',
    ]) {
      expect(screen.getByLabelText(row)).toBeOnTheScreen()
    }
    // Sơ đồ thùng nhìn từ trên: có trên màn, trình đọc màn hình bỏ qua (thẻ đã nói đủ bằng chữ)
    expect(screen.getByText('Kiện đang xếp', { includeHiddenElements: true })).toBeOnTheScreen()
    expect(screen.queryByText('Kiện đang xếp')).toBeNull()
    expect(screen.getByRole('button', { name: VERIFY })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Kiện hỏng' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: COMPLETE })).toBeNull()
  })

  test('đưa sai kiện: tờ ở lại, nói rõ hai kiện, không ghi gì; đúng kiện thì thẻ "Đã xếp" khoá nút rồi sang bước 2; kiện cuối tự xong xếp', async () => {
    const { trip, labels } = await stagedTwoCartonTrip()
    const [first, second] = labels
    if (first === undefined || second === undefined) throw new Error('chuyến hai thùng thiếu nhãn')
    await renderSession(trip.id)
    await openVerify('PKG-001-01', 1)

    await scan(second.qrToken)
    expect(
      await screen.findByText(
        'Sai kiện hoặc sai thứ tự: vừa đưa PKG-002-01 (Carton A), bước này cần PKG-001-01 (Carton A). Chưa ghi gì — để kiện này sang bên và đối chiếu đúng kiện.',
      ),
    ).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Đối chiếu kiện bước 1' })).toBeOnTheScreen()
    expect((await getMockDb().getTrip(trip.id)).loading?.steps).toEqual([])

    // Chữ thường cũng được, như gợi ý của ô nói
    await fireEvent.press(screen.getByRole('tab', { name: 'Gõ mã' }))
    await typeCode(first.qrToken.toLowerCase())
    expect(await screen.findByRole('header', { name: 'Đã xếp PKG-001-01' })).toBeOnTheScreen()
    expect(screen.getByText('Chuyển sang bước 2…')).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Đối chiếu kiện bước 1' })).toBeNull()
    expect(screen.getByRole('button', { name: VERIFY })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Kiện hỏng' })).toBeDisabled()

    expect(await screen.findByRole('header', { name: 'PKG-002-01' })).toBeOnTheScreen()
    expect(screen.getByText('Bước 2 / 2')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: VERIFY })).toBeEnabled()
    // Kiện thứ hai cách hốc bánh xe 120 cm: không có dòng vật cản gần nhất
    expect(screen.getByLabelText('Cách vách trước, 240 cm')).toBeOnTheScreen()
    expect(screen.queryByText('Vật cản gần nhất')).toBeNull()

    // Mỗi lần mở là một lượt đối chiếu mới: tờ về mức quét QR dù bước 1 ghi bằng gõ mã
    await openVerify('PKG-002-01', 2)
    expect(screen.getByRole('tab', { name: 'Quét QR' })).toBeSelected()
    await fireEvent.press(screen.getByRole('tab', { name: 'Gõ mã' }))
    await typeCode(second.qrToken)
    expect(await screen.findByRole('header', { name: `finished ${trip.id} ${planOf(trip)}` })).toBeOnTheScreen()
    const after = await getMockDb().getTrip(trip.id)
    expect(after.phase).toBe('loaded')
    expect(after.loading?.steps.map((step) => [step.packageInstanceId, step.outcome])).toEqual([
      ['PKG-001-01', 'loaded'],
      ['PKG-002-01', 'loaded'],
    ])
    // Mỗi lần đối chiếu ghi bước, cách, người: soạn bằng quét (dựng sẵn), xếp bằng gõ mã, do nhân viên kho mẫu làm
    expect(after.verifications?.map((entry) => [entry.context, entry.packageInstanceId, entry.method, entry.by])).toEqual([
      ['STAGING', 'PKG-001-01', 'QR', 'US-0003'],
      ['STAGING', 'PKG-002-01', 'QR', 'US-0003'],
      ['LOADING', 'PKG-001-01', 'CODE', 'US-0003'],
      ['LOADING', 'PKG-002-01', 'CODE', 'US-0003'],
    ])
  })

  test('mở lại chuyến đồng nghiệp đang xếp: tiếp tục ở kiện chưa có kết quả đầu tiên, kèm vùng của kiện trong thùng', async () => {
    const trip = await getMockDb().getTrip(LOADING_TRIP)
    const recorded = new Set(trip.loading?.steps.map((step) => step.packageInstanceId))
    const order = await labelsInLoadingOrder(LOADING_TRIP)
    const index = order.findIndex((label) => !recorded.has(label.packageInstanceId))
    expect(index).toBe(recorded.size)
    await renderSession(LOADING_TRIP)

    expect(screen.getByRole('header', { name: order[index]?.packageInstanceId ?? '' })).toBeOnTheScreen()
    expect(screen.getByText(`Bước ${index + 1} / ${order.length}`)).toBeOnTheScreen()
    expect(screen.getByText(`Đã có kết quả ${recorded.size} / ${order.length} kiện`)).toBeOnTheScreen()
    expect(screen.getByText(/^Vùng .+ — (sát cửa|giữa thùng|sát vách trước|cả thùng)$/)).toBeOnTheScreen()
  })

  test('xác nhận tay: ghi để làm tiếp, chờ điều phối viên duyệt; còn chờ thì chưa hoàn tất được; bị từ chối thì kiện quay lại, duyệt thì hoàn tất', async () => {
    const { trip, labels } = await stagedTwoCartonTrip()
    const second = labels[1]
    if (second === undefined) throw new Error('chuyến hai thùng thiếu nhãn')
    const view = await renderSession(trip.id)
    await openVerify('PKG-001-01', 1, 'Xác nhận tay')

    await fireEvent.press(screen.getByRole('radio', { name: 'Nhãn rách / mất' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi xác nhận tay' }))
    expect(await screen.findByRole('header', { name: 'Đã xếp PKG-001-01' })).toBeOnTheScreen()
    expect(screen.getByText('Đã ghi xác nhận tay PKG-001-01 Chờ điều phối viên duyệt trước khi xong xếp.')).toBeOnTheScreen()
    expect(screen.getByText('Còn 1 xác nhận tay chờ điều phối viên duyệt.')).toBeOnTheScreen()

    // Kiện cuối có kết quả nhưng còn chờ duyệt: thẻ "Đã xếp" nói chờ duyệt, rồi nút hoàn tất mờ kèm lý do
    await openVerify('PKG-002-01', 2, 'Gõ mã')
    await typeCode(second.qrToken)
    expect(await screen.findByRole('header', { name: 'Đã xếp PKG-002-01' })).toBeOnTheScreen()
    expect(screen.getByText('Chờ điều phối viên duyệt xác nhận tay rồi mới hoàn tất xếp hàng.')).toBeOnTheScreen()
    const blocked = 'Mọi kiện đã có kết quả, nhưng còn 1 xác nhận tay chờ điều phối viên duyệt nên chưa hoàn tất xếp hàng được.'
    expect(await screen.findByText(blocked)).toBeOnTheScreen()
    const complete = screen.getByRole('button', { name: COMPLETE })
    expect(complete).toBeDisabled()
    expect(complete.props.accessibilityHint).toBe(blocked)
    expect((await getMockDb().getTrip(trip.id)).phase).toBe('loading')
    await view.unmount()

    // Điều phối viên từ chối: kho gỡ kết quả của kiện, phiên quay về đúng kiện đó kèm lý do
    const [first] = pendingManualConfirms(await getMockDb().getTrip(trip.id), 'LOADING')
    if (first === undefined) throw new Error('không có xác nhận tay chờ duyệt')
    await asDispatcher((db) => db.rejectManualConfirmation(trip.id, first.id, 'Ảnh chụp cho thấy sai kiện'))
    const rejected = await renderSession(trip.id)
    expect(screen.getByRole('header', { name: 'PKG-001-01' })).toBeOnTheScreen()
    expect(screen.getByText('Bước 1 / 2')).toBeOnTheScreen()
    expect(
      screen.getByText('Điều phối viên từ chối xác nhận tay kiện PKG-001-01. Kiểm lại kiện này rồi đối chiếu lại. Lý do: Ảnh chụp cho thấy sai kiện'),
    ).toBeOnTheScreen()

    // Gửi lại: kho nhận xác nhận tay mới, dải từ chối mất, vẫn chờ duyệt
    await openVerify('PKG-001-01', 1, 'Xác nhận tay')
    await fireEvent.press(screen.getByRole('radio', { name: 'QR không đọc được' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi xác nhận tay' }))
    expect(await screen.findByRole('header', { name: 'Đã xếp PKG-001-01' })).toBeOnTheScreen()
    expect(await screen.findByText(blocked)).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: COMPLETE })).toBeDisabled()
    expect(screen.queryByText(/^Điều phối viên từ chối xác nhận tay/)).toBeNull()
    await rejected.unmount()

    const [again] = pendingManualConfirms(await getMockDb().getTrip(trip.id), 'LOADING')
    if (again === undefined) throw new Error('không có xác nhận tay chờ duyệt')
    expect(again.manual?.reason).toBe('QR_UNREADABLE')
    await asDispatcher((db) => db.approveManualConfirmation(trip.id, again.id))
    await renderSession(trip.id)

    expect(screen.getByText('Mọi kiện đã có kết quả. Bấm Hoàn tất xếp hàng để chuyển chuyến sang Xếp xong — chờ xuất phát.')).toBeOnTheScreen()
    await waitFor(() => expect(screen.getByRole('button', { name: COMPLETE })).toBeEnabled())
    await fireEvent.press(screen.getByRole('button', { name: COMPLETE }))
    expect(await screen.findByRole('header', { name: `finished ${trip.id} ${planOf(trip)}` })).toBeOnTheScreen()
    expect((await getMockDb().getTrip(trip.id)).phase).toBe('loaded')
  })

  test('kiện cuối có kết quả mà hoàn tất không thành: thẻ nói còn bước hoàn tất; lỗi nằm ngay trên nút, bấm lại được', async () => {
    const { trip, labels } = await stagedTwoCartonTrip()
    const second = labels[1]
    if (second === undefined) throw new Error('chuyến hai thùng thiếu nhãn')
    await loadUpTo(trip.id, 2)
    // Mất mạng hai lần: lúc nguồn tự hoàn tất sau kiện cuối, và lần bấm đầu
    const complete = jest
      .spyOn(getMockDb(), 'completeLoading')
      .mockRejectedValueOnce(new ApiError('NETWORK_ERROR'))
      .mockRejectedValueOnce(new ApiError('NETWORK_ERROR'))
    await renderSession(trip.id)
    await openVerify('PKG-002-01', 2)

    await scan(second.qrToken)
    expect(
      await screen.findByText('Mọi kiện đã có kết quả. Bấm Hoàn tất xếp hàng để chuyển chuyến sang Xếp xong — chờ xuất phát.'),
    ).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Đối chiếu kiện bước 2' })).toBeNull()
    expect(screen.getByText('Đã có kết quả 2 / 2 kiện')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: COMPLETE }))
    expect(await screen.findByText('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.')).toBeOnTheScreen()
    expect((await getMockDb().getTrip(trip.id)).phase).toBe('loading')

    await fireEvent.press(screen.getByRole('button', { name: COMPLETE }))
    expect(await screen.findByRole('header', { name: `finished ${trip.id} ${planOf(trip)}` })).toBeOnTheScreen()
    expect(complete).toHaveBeenCalledTimes(3)
  })

  test('giao diện tiếng Anh: bước, ô số và hai nút đổi theo', async () => {
    const { trip } = await stagedTwoCartonTrip()
    await renderSession(trip.id, { locale: 'en' })

    expect(screen.getByText('Step 1 / 2')).toBeOnTheScreen()
    expect(screen.getByText('Package to load')).toBeOnTheScreen()
    expect(screen.getByLabelText('Position, Layer 1 · 360 cm from the door')).toBeOnTheScreen()
    expect(screen.getByLabelText('From rear door, 360 cm')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Verify package' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Damaged package' })).toBeOnTheScreen()
  })
})
