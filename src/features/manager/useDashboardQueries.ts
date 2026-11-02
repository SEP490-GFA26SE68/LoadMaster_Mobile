import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { fetchDashboardData } from './dashboard-api'
import { resolvePeriod, type PeriodSelection } from './dashboard-period'
import { summarizeDashboard, type DashboardData } from './dashboard-summary'

/** Khoá của tab Tổng quan, dưới gốc `['dashboard']` (`OFFICE_QUERY_ROOTS`): lệnh ghi của chuyến làm mới khoá này. */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  data: ['dashboard', 'data'] as const,
}

/**
 * Số liệu của kỳ đang chọn (như `useDashboardQuery` của web). Dữ liệu kho nằm ở một khoá; kỳ chỉ đổi phần `select`, nên đổi kỳ tính lại
 * ngay trên máy, không hiện lại trạng thái đang tải. Đọc lại mỗi lần mở: tiến độ kho và giao hàng đổi liên tục.
 */
export function useDashboard({ preset, from, to }: PeriodSelection) {
  const select = useCallback(
    (data: DashboardData) => summarizeDashboard(data, resolvePeriod({ preset, from, to }, data.today)),
    [preset, from, to],
  )
  return useQuery({ queryKey: dashboardKeys.data, queryFn: fetchDashboardData, select, staleTime: 0 })
}

/** Kéo xuống để đọc lại; vòng quay chỉ cho lần kéo của người dùng. */
export function useRefreshDashboard(): { refreshing: boolean; onRefresh: () => void } {
  const client = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    void client.refetchQueries({ queryKey: dashboardKeys.data, type: 'active' }).finally(() => setRefreshing(false))
  }, [client])
  return { refreshing, onRefresh }
}
