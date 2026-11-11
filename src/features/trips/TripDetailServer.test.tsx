import { act, configure, screen } from '@testing-library/react-native'

import { resetMockDb } from '@/data/mock-db'
import { resetNativeMocks } from '@/test/native-mocks'
import { MANAGER_EMAIL, renderOfficeScreen } from '@/test/office-flow'
import { clearStored } from '@/test/render'

import { TripDetailScreen } from './TripDetailScreen'
import * as tripsApi from './trips-api'
import type { ServerTripDetail } from './trips-model'

/*
 * Chi tiết chuyến khi chuyến đọc từ máy chủ (`ServerTripDetail`): màn chỉ vẽ đầu chuyến và các điểm — không thẻ nào của kho mẫu (tiến
 * trình, tóm tắt hàng, phương tiện) được vẽ thiếu số. Lớp dữ liệu giả ở `trips-api`; phần nối máy chủ có test riêng (`trips-http.test.ts`).
 */

jest.mock('./trips-api', () => ({
  ...jest.requireActual<typeof import('./trips-api')>('./trips-api'),
  tripsCapabilities: jest.fn(() => ({ manualConfirms: true, shortages: true, requirements: false, planStatus: false })),
  fetchTripDetail: jest.fn(),
  fetchManualConfirmations: jest.fn(async () => []),
  fetchStagingShortages: jest.fn(async () => []),
}))

configure({ asyncUtilTimeout: 5000 })

const DETAIL: ServerTripDetail = {
  kind: 'server',
  id: 'TRIP-0041',
  name: 'Tuyến Biên Hoà – Thủ Đức',
  status: 'IN_TRANSIT',
  phase: 'delivering',
  departureAt: '2026-09-24T01:00:00.000Z',
  vehicleName: 'Xe tải 5 tấn · 51C-123.45',
  driverName: 'Đặng Hoài Nam',
  depot: { name: 'Kho Long Bình', address: 'KCN Long Bình, Biên Hoà' },
  packageCount: 12,
  cancelReason: 'Khách dời lịch nhận',
  stops: [
    {
      id: '7',
      number: 1,
      name: 'Siêu thị Thủ Đức',
      address: '12 Võ Văn Ngân, Thủ Đức',
      kind: 'DELIVERY',
      status: 'COMPLETED',
      plannedArrival: '2026-09-24T02:30:00.000Z',
      actualArrival: '2026-09-24T02:40:00.000Z',
      deadline: '2026-09-24T04:00:00.000Z',
    },
    { id: '8', number: 2, name: 'Cửa hàng Dĩ An', address: '', kind: 'PICKUP', status: 'PENDING' },
  ],
}

beforeEach(() => {
  resetMockDb()
  clearStored()
  resetNativeMocks()
  jest.mocked(tripsApi.fetchTripDetail).mockResolvedValue(DETAIL)
})

/** Thẻ xác nhận tay đọc riêng sau khi chi tiết hiện: chờ lượt đọc đó xong trong `act`. */
function settle() {
  return act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))
}

test('đầu chuyến, lý do huỷ, câu nói màn chỉ có phần máy chủ trả, và các điểm theo thứ tự đi', async () => {
  await renderOfficeScreen(<TripDetailScreen tripId="TRIP-0041" />, { email: MANAGER_EMAIL })
  expect(await screen.findByText('Tuyến Biên Hoà – Thủ Đức')).toBeTruthy()
  expect(screen.getByText('Xuất phát 08:00 24/09/2026 · Xe tải 5 tấn · 51C-123.45 · Tài xế Đặng Hoài Nam · 12 kiện')).toBeTruthy()
  expect(screen.getByText('Chuyến đã huỷ. Lý do: Khách dời lịch nhận')).toBeTruthy()
  expect(screen.getByText(/^Chi tiết chuyến đọc từ máy chủ/)).toBeTruthy()
  expect(screen.getByText('2 điểm giao')).toBeTruthy()
  expect(screen.getByLabelText('Kho xuất phát, Kho Long Bình, KCN Long Bình, Biên Hoà')).toBeTruthy()
  expect(
    screen.getByLabelText('Điểm 1 / 2: Siêu thị Thủ Đức, 12 Võ Văn Ngân, Thủ Đức, Đã giao xong, Đã đến 09:40 24/09, Dự kiến đến 09:30 24/09, Hạn 11:00 24/09'),
  ).toBeTruthy()
  expect(screen.getByLabelText('Điểm 2 / 2: Cửa hàng Dĩ An, Nhận hàng, Chưa đến')).toBeTruthy()
  // Thẻ chỉ kho mẫu có số không được vẽ
  expect(screen.queryByText('Tiến trình')).toBeNull()
  expect(screen.queryByText('Phương tiện')).toBeNull()
  // Chuyến đang vận chuyển: nút chính mở màn Giám sát chuyến
  expect(screen.getByText('Giám sát chuyến')).toBeTruthy()
  await settle()
})

test('chuyến chưa có giờ xuất phát, xe, tài xế: nói rõ thay vì để trống', async () => {
  jest.mocked(tripsApi.fetchTripDetail).mockResolvedValue({
    ...DETAIL,
    status: 'DRAFT',
    phase: 'planning',
    departureAt: null,
    vehicleName: '',
    driverName: null,
    depot: null,
    cancelReason: undefined,
    packageCount: 0,
    stops: [],
  })
  await renderOfficeScreen(<TripDetailScreen tripId="TRIP-0041" />, { email: MANAGER_EMAIL })
  expect(await screen.findByText('Chưa có giờ xuất phát · Chưa gán xe · Chưa gán tài xế · 0 kiện')).toBeTruthy()
  expect(screen.getByText('Chuyến chưa có điểm giao nào.')).toBeTruthy()
  expect(screen.queryByText(/^Chuyến đã huỷ/)).toBeNull()
  expect(screen.queryByText('Giám sát chuyến')).toBeNull()
  await settle()
})
