/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`dashboard-mock.ts` kho mẫu; backend chưa có adapter: nguồn `http` là lỗi
 * `HTTP_NOT_WIRED`).
 *   chưa có ở BE: fetchDashboardData
 */
import { createAdapter } from '@/data/adapter'

import { mockDashboardApi } from './dashboard-mock'
import type { DashboardData } from './dashboard-summary'

/**
 * Hợp đồng dữ liệu của tab Tổng quan (quản lý công ty). Nguồn trả dữ liệu thô của công ty người đang đăng nhập; số của kỳ tính trên máy
 * (`summarizeDashboard`), nên đổi kỳ không đọc lại.
 */
export type DashboardApi = {
  /** Ngày hôm nay (giờ Việt Nam), mọi chuyến kèm revision, xe, trạng thái xe và tên người dùng của công ty. */
  fetchDashboardData(): Promise<DashboardData>
}

const adapter = createAdapter<DashboardApi>('dashboard', { mock: mockDashboardApi })

// chưa có ở BE
export function fetchDashboardData(): Promise<DashboardData> {
  return adapter().fetchDashboardData()
}
