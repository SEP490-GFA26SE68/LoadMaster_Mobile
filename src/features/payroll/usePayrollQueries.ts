import { useQuery } from '@tanstack/react-query'

import { fetchMyPayroll } from './payroll-api'
import type { PayrollPeriodKey } from './payroll-period'

/** Khoá truy vấn của feature lương, nằm dưới `['payroll']` để tự đồng bộ `networkMode` với `FEATURES`. */
export const payrollKeys = {
  all: ['payroll'] as const,
  statement: (period: PayrollPeriodKey) => ['payroll', 'statement', period] as const,
}

export function useMyPayroll(period: PayrollPeriodKey) {
  return useQuery({
    queryKey: payrollKeys.statement(period),
    queryFn: () => fetchMyPayroll(period),
    staleTime: 60_000,
  })
}
