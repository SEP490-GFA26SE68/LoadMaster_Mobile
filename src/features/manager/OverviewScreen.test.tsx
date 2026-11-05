import { configure, fireEvent, screen } from '@testing-library/react-native'

import { resetMockDb } from '@/data/mock-db'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { MANAGER_EMAIL, renderOfficeScreen } from '@/test/office-flow'
import { clearStored } from '@/test/render'

import { OverviewScreen } from './OverviewScreen'

/*
 * Tab Tổng quan (`OverviewScreen`) của quản lý công ty Long Bình trên seed neo 14/09/2026: kỳ 30 ngày mặc định, năm số của kỳ kèm nguồn,
 * chuyến theo trạng thái, đội xe, chuyến gần nhất; đổi kỳ tính lại ngay. Số kỳ vọng lấy từ seed (như test bảng điều khiển của web).
 */

// Màn đọc chuyến, revision, xe và người dùng của cả công ty: cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

/** Chỉ giả `Date` tới `iso`: hẹn giờ vẫn chạy thật (độ trễ của kho, `findBy…`). */
function freezeDate(iso: string) {
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask'],
  })
}

beforeEach(() => {
  // 10:00 giờ Việt Nam ngày neo của seed
  freezeDate('2026-09-14T03:00:00Z')
  resetMockDb()
  clearStored()
  resetNativeMocks()
})

afterEach(() => {
  jest.useRealTimers()
})

function renderOverview() {
  return renderOfficeScreen(<OverviewScreen />, { email: MANAGER_EMAIL })
}

test('kỳ 30 ngày: năm số của kỳ kèm nguồn, lấp đầy mang MOCK RESULT', async () => {
  await renderOverview()
  expect(await screen.findByText('16/08/2026 – 14/09/2026')).toBeOnTheScreen()
  expect(screen.getByRole('tab', { name: '30 ngày', selected: true })).toBeOnTheScreen()
  expect(screen.getByLabelText('Chuyến hoàn thành: 7 / 12 chuyến, Theo ngày chạy, tổng gồm chuyến huỷ')).toBeOnTheScreen()
  expect(screen.getByLabelText(/^Lấp đầy thể tích trung bình: \d{1,3},\d%, Bản duyệt của \d+ chuyến, trừ chuyến huỷ, MOCK RESULT$/)).toBeOnTheScreen()
  expect(screen.getByText('MOCK RESULT')).toBeOnTheScreen()
  expect(screen.getByLabelText(/^Khối lượng đã giao: [\d.]+ kg, Theo các kiện tài xế đã dỡ$/)).toBeOnTheScreen()
  expect(screen.getByLabelText(/^Kiện giao không sự cố: (\d{1,3}(,\d)?%, [\d.]+ \/ [\d.]+ kiện ở điểm đã giao xong|—, Chưa có điểm giao nào xong)$/)).toBeOnTheScreen()
  expect(screen.getByLabelText('Xe đang phục vụ chuyến: 3 / 8 xe, Lúc này, không theo kỳ')).toBeOnTheScreen()
  // Không có số "so với kỳ trước" và không xuất báo cáo
  expect(screen.queryByText(/kỳ trước/)).toBeNull()
  expect(screen.queryByRole('button', { name: 'Xuất báo cáo' })).toBeNull()
})

test('chuyến theo trạng thái, đội xe và chuyến gần nhất', async () => {
  await renderOverview()
  // Tổng của thẻ trạng thái và số chuyến của thẻ chuyến gần nhất
  expect(await screen.findAllByText('12 chuyến')).toHaveLength(2)
  for (const row of ['Đã lập kế hoạch: 1, 8,3%', 'Đang xếp hàng: 2, 16,7%', 'Đang vận chuyển: 1, 8,3%', 'Đã giao: 7, 58,3%', 'Đã huỷ: 1, 8,3%']) {
    expect(screen.getByLabelText(row)).toBeOnTheScreen()
  }
  // Trạng thái không có chuyến nào trong kỳ không có dòng
  expect(screen.queryByLabelText(/^Nháp: /)).toBeNull()
  expect(screen.getByLabelText('Sẵn sàng: 4')).toBeOnTheScreen()
  expect(screen.getByLabelText('Đang phục vụ chuyến: 3')).toBeOnTheScreen()
  expect(screen.getByLabelText('Bảo dưỡng: 1')).toBeOnTheScreen()
  expect(screen.getByText('Tối đa 10 chuyến có ngày chạy gần nhất')).toBeOnTheScreen()
  const recent = screen.getAllByRole('button', { name: /^.+, TRIP-/ })
  expect(recent).toHaveLength(10)
  const main = screen.getByRole('button', { name: /, TRIP-2026-0914, .*Kiện: 132/ })
  await fireEvent.press(main)
  expect(router.push).toHaveBeenCalledWith({ pathname: '/trip-detail/[tripId]', params: { tripId: 'TRIP-2026-0914' } })
})

test('đổi kỳ tính lại ngay, khoảng ngày dưới tiêu đề đổi theo', async () => {
  await renderOverview()
  await screen.findByText('16/08/2026 – 14/09/2026')
  await fireEvent.press(screen.getByRole('tab', { name: '7 ngày' }))
  expect(await screen.findByText('08/09/2026 – 14/09/2026')).toBeOnTheScreen()
  expect(screen.getByRole('tab', { name: '7 ngày', selected: true })).toBeOnTheScreen()
  expect(screen.getByLabelText(/^Chuyến hoàn thành: \d+ \/ 5 chuyến, /)).toBeOnTheScreen()
  await fireEvent.press(screen.getByRole('tab', { name: 'Tháng này' }))
  expect(await screen.findByText('01/09/2026 – 30/09/2026')).toBeOnTheScreen()
  expect(screen.getByLabelText(/^Chuyến hoàn thành: \d+ \/ 10 chuyến, /)).toBeOnTheScreen()
})

test('kỳ không có chuyến: "—" kèm lý do, một câu thay các thẻ của chuyến, đội xe vẫn hiện', async () => {
  freezeDate('2027-03-01T03:00:00Z')
  await renderOverview()
  expect(await screen.findByText('Không có chuyến nào trong kỳ')).toBeOnTheScreen()
  expect(screen.getByText('Chọn kỳ khác để xem số liệu của các chuyến có ngày chạy trong kỳ đó.')).toBeOnTheScreen()
  expect(screen.getByLabelText('Chuyến hoàn thành: 0 / 0 chuyến, Theo ngày chạy, tổng gồm chuyến huỷ')).toBeOnTheScreen()
  expect(screen.getByLabelText('Lấp đầy thể tích trung bình: —, Chưa có chuyến nào được duyệt phương án')).toBeOnTheScreen()
  expect(screen.getByLabelText('Kiện giao không sự cố: —, Chưa có điểm giao nào xong')).toBeOnTheScreen()
  expect(screen.queryByText('Chuyến theo trạng thái')).toBeNull()
  expect(screen.queryByText('Chuyến trong kỳ')).toBeNull()
  expect(screen.getByText('Trạng thái đội xe')).toBeOnTheScreen()
})
