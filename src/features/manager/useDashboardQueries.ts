import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { vnDate } from '@/lib/mock-db'

import { dashboardCapabilities, fetchDashboardSummary, type DashboardCapabilities } from './dashboard-api'
import { resolvePeriod, type PeriodSelection } from './dashboard-period'

/** Khoá của tab Tổng quan, dưới gốc `['dashboard']` (`OFFICE_QUERY_ROOTS`): lệnh ghi của chuyến làm mới khoá này. */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (from: string, to: string) => ['dashboard', 'summary', from, to] as const,
}

/** Nguồn dữ liệu chưa sẵn (cấu hình sai, backend chưa nối): màn bỏ mọi phần nguồn không nói là có. */
const NO_CAPABILITIES: DashboardCapabilities = { backend: false, tripDetails: false, tripLinks: false, allTrips: false }

export function useDashboardCapabilities(): DashboardCapabilities {
  try {
    return dashboardCapabilities()
  } catch {
    return NO_CAPABILITIES
  }
}

/**
 * Số liệu của kỳ đang chọn (như `useDashboardQuery` của web). Kỳ tính theo "hôm nay" giờ Việt Nam lúc vẽ; mỗi kỳ một khoá. Đổi kỳ giữ số
 * của kỳ trước tới khi số mới về, không hiện lại trạng thái đang tải. Đọc lại mỗi lần mở: tiến độ kho và giao hàng đổi liên tục.
 */
export function useDashboard(selection: PeriodSelection) {
  const { from, to } = resolvePeriod(selection, vnDate(new Date()))
  return useQuery({
    queryKey: dashboardKeys.summary(from, to),
    queryFn: () => fetchDashboardSummary({ from, to }),
    placeholderData: keepPreviousData,
    staleTime: 0,
  })
}

/** Kéo xuống để đọc lại; vòng quay chỉ cho lần kéo của người dùng. */
export function useRefreshDashboard(): { refreshing: boolean; onRefresh: () => void } {
  const client = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    void client.refetchQueries({ queryKey: dashboardKeys.all, type: 'active' }).finally(() => setRefreshing(false))
  }, [client])
  return { refreshing, onRefresh }
}
