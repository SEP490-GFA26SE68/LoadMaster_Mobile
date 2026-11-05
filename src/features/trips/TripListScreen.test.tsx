import { configure, fireEvent, screen } from '@testing-library/react-native'

import { resetMockDb } from '@/data/mock-db'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { MANAGER_EMAIL, renderOfficeScreen } from '@/test/office-flow'
import { clearStored } from '@/test/render'

import { TripListScreen } from './TripListScreen'

/*
 * Tab Chuyến hàng (`TripListScreen`) trên seed của Long Bình: dòng số đếm dưới tiêu đề (phần "cần bạn xử lý" chỉ cho điều phối viên), hàng
 * tab trạng thái có số, ô tìm bỏ dấu, và chạm một chuyến mở chi tiết.
 */

// Danh sách đọc chuyến, revision, xe và người dùng của cả công ty: cho máy chậm thêm thời gian
configure({ asyncUtilTimeout: 5000 })

beforeEach(() => {
  resetMockDb()
  clearStored()
  resetNativeMocks()
})

/** Thẻ chuyến đang hiện (tên đọc bắt đầu bằng mã chuyến). */
function tripCards() {
  return screen.queryAllByRole('button', { name: /^TRIP-/ })
}

function cardIds(): string[] {
  return tripCards().map((card) => String(card.props.accessibilityLabel).split(', ')[0] ?? '')
}

test('điều phối viên: dòng số đếm có "cần bạn xử lý", tab Đã lập kế hoạch có số hổ phách', async () => {
  await renderOfficeScreen(<TripListScreen />)
  expect(await screen.findByText('15 chuyến · 1 đang vận chuyển · 2 cần bạn xử lý')).toBeOnTheScreen()
  for (const name of ['Tất cả 15', 'Nháp 1', 'Đã lập kế hoạch 3 2 cần bạn xử lý', 'Đang xếp hàng 2', 'Đang vận chuyển 1', 'Đã giao 7', 'Đã huỷ 1']) {
    expect(screen.getByRole('tab', { name })).toBeOnTheScreen()
  }
  expect(screen.getByRole('tab', { name: 'Tất cả 15', selected: true })).toBeOnTheScreen()
  // Chuyến nháp có ngày chạy muộn nhất đứng đầu
  expect(cardIds()[0]).toBe('TRIP-014')
})

test('quản lý công ty chỉ thấy các số thường', async () => {
  await renderOfficeScreen(<TripListScreen />, { email: MANAGER_EMAIL })
  expect(await screen.findByText('15 chuyến · 1 đang vận chuyển')).toBeOnTheScreen()
  expect(screen.getByRole('tab', { name: 'Đã lập kế hoạch 3' })).toBeOnTheScreen()
  expect(screen.queryByText(/cần bạn xử lý/)).toBeNull()
})

test('tab trạng thái lọc danh sách; chạm thẻ mở chi tiết chuyến', async () => {
  await renderOfficeScreen(<TripListScreen />)
  await fireEvent.press(await screen.findByRole('tab', { name: 'Đang vận chuyển 1' }))
  expect(screen.getByRole('tab', { name: 'Đang vận chuyển 1', selected: true })).toBeOnTheScreen()
  const [card] = tripCards()
  expect(tripCards()).toHaveLength(1)
  expect(card?.props.accessibilityLabel).toMatch(/, Đang vận chuyển, /)
  if (card === undefined) throw new Error('thiếu thẻ chuyến')
  await fireEvent.press(card)
  expect(router.push).toHaveBeenCalledWith({ pathname: '/trip-detail/[tripId]', params: { tripId: cardIds()[0] } })
})

test('tìm bỏ dấu; không khớp thì có nút Xoá lọc', async () => {
  await renderOfficeScreen(<TripListScreen />)
  const search = await screen.findByLabelText('Tìm chuyến')
  await fireEvent.changeText(search, 'quoc dung')
  expect(cardIds().toSorted()).toEqual(['TRIP-002', 'TRIP-007', 'TRIP-010', 'TRIP-2026-0914'])
  // Số trên tab theo ô tìm
  expect(screen.getByRole('tab', { name: 'Tất cả 4' })).toBeOnTheScreen()

  await fireEvent.changeText(search, 'không có chuyến này')
  expect(screen.getByText('Không có kết quả khớp bộ lọc')).toBeOnTheScreen()
  await fireEvent.press(screen.getByRole('button', { name: 'Xoá lọc' }))
  expect(screen.getByRole('tab', { name: 'Tất cả 15', selected: true })).toBeOnTheScreen()
  expect(tripCards().length).toBeGreaterThan(0)
})
