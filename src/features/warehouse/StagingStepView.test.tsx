import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { resetNativeMocks } from '@/test/native-mocks'
import { clearStored, signInAs } from '@/test/render'
import { labelsInLoadingOrder, READY_TRIP, renderSession, stageAllBut, startSession, WAREHOUSE_EMAIL } from '@/test/warehouse-flow'

import * as warehouseApi from './warehouse-api'

/*
 * Bước Soạn hàng (`StagingStepView`) trong phiên thật (`renderSession`) trên kho mẫu: danh sách ảo các kiện chưa soạn và báo thiếu từng
 * kiện. Đối chiếu kiện vào khu chờ có test riêng (`staging/StagingVerify.test.tsx`). Kỳ vọng về chuyến đọc thẳng từ kho.
 */

// Mỗi lần ghi, màn đọc lại cả chuyến từ kho mẫu: cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

const rowButtons = () => screen.queryAllByRole('button', { name: /^Báo thiếu / })

/** Kiện đầu tiên theo thứ tự xếp của chuyến 132 kiện (chuyến phải đã bắt đầu). */
async function firstPackage(): Promise<string> {
  const [first] = await labelsInLoadingOrder(READY_TRIP)
  if (first === undefined) throw new Error('chuyến mẫu không có kiện nào')
  return first.packageInstanceId
}

const shortagesOf = async (tripId: string) =>
  (await getMockDb().getTrip(tripId)).loading?.shortages?.map((entry) => [entry.packageInstanceId, entry.by]) ?? []

describe('bước Soạn hàng', () => {
  beforeEach(async () => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
    await signInAs(WAREHOUSE_EMAIL)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('chuyến 132 kiện mới vào bước soạn: tiêu đề đếm kiện chưa soạn, danh sách ảo chỉ dựng các dòng đầu', async () => {
    await renderSession(READY_TRIP)
    const order = await labelsInLoadingOrder(READY_TRIP)

    expect(screen.getByRole('header', { name: 'Kiện chưa soạn (132)' })).toBeOnTheScreen()
    expect(screen.getByText('Đã soạn 0 / 132')).toBeOnTheScreen()
    expect(screen.getByText('MOCK RESULT')).toBeOnTheScreen()
    expect(screen.getByLabelText('Kiện chưa soạn')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Đối chiếu kiện' })).toBeEnabled()
    // Danh sách ảo: dòng đầu theo thứ tự xếp đã dựng, dòng cuối chưa
    expect(rowButtons().length).toBeGreaterThan(0)
    expect(rowButtons().length).toBeLessThan(132)
    expect(screen.getByRole('button', { name: `Báo thiếu ${order[0]?.packageInstanceId}` })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: `Báo thiếu ${order.at(-1)?.packageInstanceId}` })).toBeNull()
  })

  test('chỉ kiện chưa soạn nằm trong danh sách, theo thứ tự xếp', async () => {
    await startSession(READY_TRIP)
    const left = await stageAllBut(READY_TRIP, 3)
    await renderSession(READY_TRIP)

    expect(screen.getByRole('header', { name: 'Kiện chưa soạn (3)' })).toBeOnTheScreen()
    expect(screen.getByText('Đã soạn 129 / 132')).toBeOnTheScreen()
    expect(rowButtons().map((button) => button.props.accessibilityLabel)).toStrictEqual(left.map((id) => `Báo thiếu ${id}`))
  })

  test('báo thiếu hỏi lại: "Quay lại" không ghi gì; xác nhận thì dòng ghi chờ điều phối và màn đếm kiện thiếu', async () => {
    await renderSession(READY_TRIP)
    const id = await firstPackage()
    const sheet = () => screen.queryByRole('header', { name: `Báo thiếu ${id}?` })

    await fireEvent.press(screen.getByRole('button', { name: `Báo thiếu ${id}` }))
    expect(await screen.findByRole('header', { name: `Báo thiếu ${id}?` })).toBeOnTheScreen()
    expect(
      screen.getByText(`Kiện ${id} được báo là không tìm thấy. Điều phối viên sẽ quyết: tìm tiếp, hoặc bỏ kiện khỏi chuyến rồi tối ưu lại. Kho soạn tiếp các kiện khác.`),
    ).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }))
    expect(sheet()).toBeNull()
    expect(await shortagesOf(READY_TRIP)).toStrictEqual([])

    await fireEvent.press(screen.getByRole('button', { name: `Báo thiếu ${id}` }))
    await fireEvent.press(await screen.findByRole('button', { name: 'Báo thiếu' }))
    expect(await screen.findByText('Đã báo thiếu — chờ điều phối')).toBeOnTheScreen()
    expect(screen.getByText('Thiếu 1 kiện — chờ điều phối viên quyết. Soạn tiếp các kiện còn lại.')).toBeOnTheScreen()
    await waitFor(() => expect(sheet()).toBeNull())
    // Kiện báo thiếu vẫn chưa soạn: ở lại danh sách, không còn nút báo thiếu
    expect(screen.queryByRole('button', { name: `Báo thiếu ${id}` })).toBeNull()
    expect(screen.getByRole('header', { name: 'Kiện chưa soạn (132)' })).toBeOnTheScreen()
    expect(await shortagesOf(READY_TRIP)).toStrictEqual([[id, 'US-0003']])
  })

  test('kho từ chối báo thiếu (máy khác vừa soạn kiện đó): tờ ở lại và nói lỗi, không ghi gì', async () => {
    await renderSession(READY_TRIP)
    const [first] = await labelsInLoadingOrder(READY_TRIP)
    if (first === undefined) throw new Error('chuyến mẫu không có kiện nào')
    const id = first.packageInstanceId

    await fireEvent.press(screen.getByRole('button', { name: `Báo thiếu ${id}` }))
    expect(await screen.findByRole('header', { name: `Báo thiếu ${id}?` })).toBeOnTheScreen()
    await getMockDb().confirmStagingByQr(READY_TRIP, first.qrToken)
    await fireEvent.press(screen.getByRole('button', { name: 'Báo thiếu' }))

    expect(await screen.findByText(`Kiện ${id} đã soạn rồi.`)).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: `Báo thiếu ${id}?` })).toBeOnTheScreen()
    // Lệnh ghi xong — kể cả lỗi — là màn đọc lại: kiện máy khác vừa soạn rời danh sách
    expect(await screen.findByRole('header', { name: 'Kiện chưa soạn (131)' })).toBeOnTheScreen()
    expect(await shortagesOf(READY_TRIP)).toStrictEqual([])

    await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }))
    expect(screen.queryByRole('header', { name: `Báo thiếu ${id}?` })).toBeNull()
  })

  test('giao diện tiếng Anh: tên đọc được của nút báo thiếu bắt đầu bằng đúng chữ trên nút, rồi mới tới mã kiện', async () => {
    await renderSession(READY_TRIP, { locale: 'en' })
    const id = await firstPackage()

    const button = screen.getByRole('button', { name: `Report missing ${id}` })
    expect(button).toHaveTextContent('Report missing')
  })

  test('nguồn dữ liệu không nhận báo thiếu: dòng kiện không có nút báo thiếu', async () => {
    jest.spyOn(warehouseApi, 'warehouseCapabilities').mockReturnValue({ manualConfirm: false, shortages: false, seal: false, notifications: false })
    await renderSession(READY_TRIP)

    expect(screen.getByRole('header', { name: 'Kiện chưa soạn (132)' })).toBeOnTheScreen()
    expect(screen.getByText((await labelsInLoadingOrder(READY_TRIP))[0]?.packageInstanceId ?? '')).toBeOnTheScreen()
    expect(rowButtons()).toHaveLength(0)
  })
})
