import { configure, fireEvent, screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { resetReadNotifications } from '@/features/bell/notification-read'
import { tripDetailPath } from '@/features/trips/trip-routes'
import { router } from '@/test/native-mocks'
import { DISPATCHER_EMAIL, MANAGER_EMAIL, renderOfficeScreen } from '@/test/office-flow'
import { clearStored, signInAs } from '@/test/render'

import { LiveTripScreen } from './LiveTripScreen'

configure({ asyncUtilTimeout: 5000 })

/** Chuyến Đang vận chuyển duy nhất của Long Bình trong seed: đã giao điểm 1, xe đang ở điểm 2, còn điểm 3 phía trước. */
const TRIP = 'TRIP-009'
const TRAFFIC = { type: 'TRAFFIC' as const, description: 'Kẹt xe ở ngã tư Vũng Tàu', delayMinutes: 30 }

const renderLive = (email = DISPATCHER_EMAIL, tripId = TRIP) => renderOfficeScreen(<LiveTripScreen tripId={tripId} />, { email })

/**
 * Nút cùng tên ở hai chỗ, theo thứ tự vẽ: tờ báo sự cố nằm trong nội dung cuộn, trước nút "Báo sự cố" ở chân màn (`firstButton`); tờ "Đã
 * xử lý" nằm trong thẻ sự cố, sau nút "Đã xử lý" của sự cố (`lastButton`).
 */
function nthButton(name: string, index: 0 | -1) {
  const button = screen.getAllByRole('button', { name }).at(index)
  if (button === undefined) throw new Error(`Không có nút "${name}"`)
  return button
}
const firstButton = (name: string) => nthButton(name, 0)
const lastButton = (name: string) => nthButton(name, -1)

beforeEach(() => {
  resetMockDb()
  clearStored()
  resetReadNotifications()
})

describe('điều phối viên xử lý sự cố của chuyến', () => {
  test('báo sự cố từ chân màn: kiểm ô, báo xong thẻ sự cố nói mã và có ba việc của điều phối viên', async () => {
    await renderLive()
    expect(await screen.findByText('Tuyến Thủ Dầu Một – Sóng Thần')).toBeOnTheScreen()
    expect(screen.getByText('Chuyến chưa có sự cố nào.')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Báo sự cố' }))
    expect(await screen.findByRole('header', { name: `Báo sự cố chuyến ${TRIP}` })).toBeOnTheScreen()
    await fireEvent.press(firstButton('Báo sự cố'))
    expect(await screen.findByText('Chọn loại sự cố.')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('radio', { name: 'Tắc đường' }))
    await fireEvent.changeText(screen.getByLabelText('Mô tả'), TRAFFIC.description)
    await fireEvent.changeText(screen.getByLabelText('Số phút dự kiến chậm'), '30')
    await fireEvent.press(firstButton('Báo sự cố'))

    expect(await screen.findByText('Đã báo sự cố EXC-001')).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: `Báo sự cố chuyến ${TRIP}` })).toBeNull()
    expect(screen.getByText(TRAFFIC.description)).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Tìm tuyến khác' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Không có tuyến khả thi — chuyển quản lý' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Đã xử lý' })).toBeOnTheScreen()
    expect((await getMockDb().listTripExceptions(TRIP)).map((item) => [item.id, item.type, item.delayMinutes])).toStrictEqual([['EXC-001', 'TRAFFIC', 30]])
  })

  test('chuyển quản lý, chọn tuyến khác (MOCK RESULT), rồi đánh dấu đã xử lý kèm ghi chú', async () => {
    await signInAs(DISPATCHER_EMAIL)
    await getMockDb().reportTripException(TRIP, TRAFFIC)
    await renderLive()

    await fireEvent.press(await screen.findByRole('button', { name: 'Không có tuyến khả thi — chuyển quản lý' }))
    expect(await screen.findByText('Đã chuyển sự cố EXC-001 cho quản lý công ty')).toBeOnTheScreen()
    expect(screen.getByText('Đã chuyển quản lý')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Không có tuyến khả thi — chuyển quản lý' })).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Tìm tuyến khác' }))
    expect(await screen.findByRole('header', { name: `Tìm tuyến khác cho chuyến ${TRIP}` })).toBeOnTheScreen()
    const bypass = await screen.findByRole('radio', { name: /^Đường tránh gần, .+ km · \d+ phút · Đến điểm 3 lúc \d{2}:\d{2}$/ })
    expect(screen.getAllByText('MOCK RESULT').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Chọn tuyến này' })).toBeDisabled()
    await fireEvent.press(bypass)
    await fireEvent.press(screen.getByRole('button', { name: 'Chọn tuyến này' }))
    expect(await screen.findByText(`Chuyến ${TRIP} đi Đường tránh gần`)).toBeOnTheScreen()
    expect(await screen.findByText(/^Tuyến đã chọn lúc \d{2}:\d{2}: Đường tránh gần · .+ km · \d+ phút tới điểm 3$/)).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Đã xử lý' }))
    expect(await screen.findByRole('header', { name: 'Đã xử lý sự cố EXC-001' })).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText('Ghi chú xử lý'), 'Xe đã qua đường tránh, báo khách điểm 3')
    await fireEvent.press(lastButton('Đã xử lý'))

    expect(await screen.findByText('Đã đánh dấu sự cố EXC-001 là đã xử lý')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Tìm tuyến khác' })).toBeNull()
    const [resolved] = await getMockDb().listTripExceptions(TRIP)
    expect([resolved?.status, resolved?.resolution?.note]).toStrictEqual(['RESOLVED', 'Xe đã qua đường tránh, báo khách điểm 3'])
  })

  test('lối sang Chi tiết chuyến', async () => {
    await renderLive()
    await fireEvent.press(await screen.findByRole('button', { name: 'Chi tiết chuyến' }))
    expect(router.push).toHaveBeenCalledWith(tripDetailPath(TRIP))
  })

  test('bản đồ tuyến dùng vị trí giám sát đã có, không endpoint mới', async () => {
    await renderLive()
    expect(await screen.findByLabelText(/^Bản đồ tuyến tới TRIP-009/)).toBeOnTheScreen()
  })
})

describe('quản lý công ty chỉ xem', () => {
  test('không báo sự cố, không xử lý — một câu nói ai làm', async () => {
    await signInAs(DISPATCHER_EMAIL)
    await getMockDb().reportTripException(TRIP, TRAFFIC)
    await renderLive(MANAGER_EMAIL)

    expect(await screen.findByText(TRAFFIC.description)).toBeOnTheScreen()
    expect(screen.getByText('Điều phối viên xử lý sự cố của chuyến; bạn chỉ xem.')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Báo sự cố' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tìm tuyến khác' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Đã xử lý' })).toBeNull()
    // Sự cố chưa chuyển lên thì quản lý chưa có việc gia hạn
    expect(screen.queryByRole('button', { name: 'Nhập hạn mới' })).toBeNull()
  })

  test('sự cố đã chuyển lên: quản lý mở tờ gia hạn ngay ở màn chuyến', async () => {
    await signInAs(DISPATCHER_EMAIL)
    const db = getMockDb()
    const { id } = await db.reportTripException(TRIP, TRAFFIC)
    await db.escalateTripException(TRIP, id)
    await renderLive(MANAGER_EMAIL)

    await fireEvent.press(await screen.findByRole('button', { name: 'Nhập hạn mới' }))
    expect(await screen.findByRole('header', { name: 'Liên hệ khách và nhập hạn mới' })).toBeOnTheScreen()
    expect(await screen.findByText('Chuyến này không có yêu cầu giao nào đang giao để gia hạn.')).toBeOnTheScreen()
  })
})

test('chuyến đã giao xong: màn nói chuyến thôi chạy, không có nút báo sự cố', async () => {
  await renderLive(DISPATCHER_EMAIL, 'TRIP-001')
  expect(await screen.findByText('Chuyến TRIP-001 không còn đang vận chuyển: vị trí xe và giờ đến thôi cập nhật.')).toBeOnTheScreen()
  expect(screen.queryByRole('button', { name: 'Báo sự cố' })).toBeNull()
})
