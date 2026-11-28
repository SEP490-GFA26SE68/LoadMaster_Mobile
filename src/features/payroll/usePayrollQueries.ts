import { useQuery } from '@tanstack/react-query'

import { fetchMyPayroll, fetchMyWarehousePayroll } from './payroll-api'
import type { PayrollPeriodKey } from './payroll-period'

/** Khoá truy vấn của feature lương, nằm dưới `['payroll']` để tự đồng bộ `networkMode` với `FEATURES`. */
export const payrollKeys = {
  all: ['payroll'] as const,
  statement: (period: PayrollPeriodKey) => ['payroll', 'statement', period] as const,
  warehouse: (period: PayrollPeriodKey) => ['payroll', 'warehouse', period] as const,
}

export function useMyPayroll(period: PayrollPeriodKey) {
  return useQuery({
    queryKey: payrollKeys.statement(period),
    queryFn: () => fetchMyPayroll(period),
    staleTime: 60_000,
  })
}

/** Phiếu lương của nhân viên kho đang đăng nhập cho một kỳ. */
export function useMyWarehousePayroll(period: PayrollPeriodKey) {
  return useQuery({
    queryKey: payrollKeys.warehouse(period),
    queryFn: () => fetchMyWarehousePayroll(period),
    staleTime: 60_000,
  })
}
