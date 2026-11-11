import { configure, screen } from '@testing-library/react-native'

import { resetMockDb } from '@/data/mock-db'
import { resetNativeMocks } from '@/test/native-mocks'
import { MANAGER_EMAIL, renderOfficeScreen } from '@/test/office-flow'
import { clearStored } from '@/test/render'

import * as dashboardApi from './dashboard-api'
import type { DashboardSummary } from './dashboard-summary'
import { OverviewScreen } from './OverviewScreen'

/*
 * Tab Tổng quan khi số đọc từ máy chủ: không MOCK RESULT, đội xe thêm dòng Ngừng sử dụng, số chuyến của kỳ lấy từ tổng (máy chủ chỉ trả
 * các chuyến gần nhất), và chuyến không mở được khi màn chuyến đọc nguồn khác. Lớp dữ liệu giả ở `dashboard-api`; phần nối máy chủ có test
 * riêng (`dashboard-http.test.ts`).
 */

jest.mock('./dashboard-api', () => ({
  ...jest.requireActual<typeof import('./dashboard-api')>('./dashboard-api'),
  dashboardCapabilities: jest.fn(() => ({ backend: true, tripDetails: false, tripLinks: false, allTrips: false })),
  fetchDashboardSummary: jest.fn(),
}))

configure({ asyncUtilTimeout: 5000 })

const SUMMARY: DashboardSummary = {
  period: { from: '2026-10-14', to: '2026-10-16' },
  tripCount: 25,
  completedCount: 12,
  fill: { averagePercent: 72.5, planCount: 3, isMockResult: false },
  deliveredWeightKg: 1234.57,
  delivery: { cleanPercent: null, cleanItems: 0, finishedItems: 0 },
  vehicles: { inUse: 2, total: 9, byStatus: { available: 5, in_use: 2, maintenance: 1, retired: 1 } },
  fillByDay: [],
  tripsByStatus: [{ status: 'DELIVERED', count: 25 }],
  byVehicle: [],
  trips: [
    {
      id: 'TRIP-0041',
      name: 'Tuyến Biên Hoà',
      scheduledDate: '2026-10-15',
      vehicleName: 'Xe tải 5 tấn',
      driverName: null,
      status: 'DELIVERED',
      volumePercent: 64.25,
    },
  ],
}

beforeEach(() => {
  resetMockDb()
  clearStored()
  resetNativeMocks()
  jest.mocked(dashboardApi.fetchDashboardSummary).mockResolvedValue(SUMMARY)
})

test('số của máy chủ: không MOCK RESULT, xe ngừng sử dụng, tổng chuyến của kỳ, chuyến chỉ để đọc', async () => {
  await renderOfficeScreen(<OverviewScreen />, { email: MANAGER_EMAIL })
  expect(await screen.findByText('Tuyến Biên Hoà')).toBeOnTheScreen()
  expect(screen.queryByText('MOCK RESULT')).toBeNull()
  expect(screen.getByLabelText('Ngừng sử dụng: 1')).toBeOnTheScreen()
  // Thẻ trạng thái và thẻ chuyến trong kỳ cùng nói tổng của kỳ, dù máy chủ chỉ trả một chuyến
  expect(screen.getAllByText('25 chuyến')).toHaveLength(2)
  expect(screen.queryByRole('button', { name: /^Tuyến Biên Hoà/ })).toBeNull()
  expect(screen.getByLabelText(/^Tuyến Biên Hoà, TRIP-0041, Đã giao/)).toBeOnTheScreen()
})
