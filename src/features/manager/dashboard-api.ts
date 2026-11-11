/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`dashboard-mock.ts` kho mẫu, `dashboard-http.ts` backend).
 *   fetchDashboardSummary   GET   /api/manager/dashboard?from=&to=
 */
import { createAdapter } from '@/data/adapter'
import { dataConfig } from '@/data/config'

import { httpDashboardApi } from './dashboard-http'
import { mockDashboardApi } from './dashboard-mock'
import type { DateRange } from './dashboard-period'
import type { DashboardSummary } from './dashboard-summary'

/**
 * Việc tab Tổng quan làm được với nguồn đang dùng (như `DASHBOARD_CAPABILITIES` của web). Kho mẫu có hết. Máy chủ trả số tổng hợp của
 * kỳ, đội xe và các chuyến gần nhất — mỗi chuyến chỉ mã, tên, ngày chạy, trạng thái, xe, tài xế, lấp đầy: phần máy chủ không trả thì màn
 * bỏ hẳn, không vẽ 0.
 */
export type DashboardCapabilities = {
  /** Số do máy chủ tính: không mang MOCK RESULT. */
  readonly backend: boolean
  /** Dòng phụ của trạng thái, số kiện và khối lượng đã giao của từng chuyến. */
  readonly tripDetails: boolean
  /** Chạm một chuyến mở Chi tiết chuyến: chỉ khi màn chuyến đọc cùng nguồn (không thì mã chuyến không tìm được ở đó). */
  readonly tripLinks: boolean
  /** Danh sách chuyến có mọi chuyến của kỳ; máy chủ chỉ trả các chuyến gần nhất. */
  readonly allTrips: boolean
}

/** Hợp đồng dữ liệu của tab Tổng quan (quản lý công ty): số của một kỳ, của công ty người đang đăng nhập. */
export type DashboardApi = {
  readonly capabilities: DashboardCapabilities
  fetchDashboardSummary(period: DateRange): Promise<DashboardSummary>
}

const tripsSource = dataConfig.sources.trips

const adapter = createAdapter<DashboardApi>('dashboard', {
  mock: () => mockDashboardApi({ tripLinks: tripsSource === 'mock' }),
  http: () => httpDashboardApi({ tripLinks: tripsSource === 'http' }),
})

/** Việc của tab Tổng quan làm được với nguồn đang dùng. */
export function dashboardCapabilities(): DashboardCapabilities {
  return adapter().capabilities
}

// GET /api/manager/dashboard
export function fetchDashboardSummary(period: DateRange): Promise<DashboardSummary> {
  return adapter().fetchDashboardSummary(period)
}
