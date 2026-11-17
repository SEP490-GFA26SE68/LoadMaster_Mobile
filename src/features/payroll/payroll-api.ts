/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`payroll-mock.ts` kho mẫu, `payroll-http.ts` backend).
 *   fetchMyPayroll    GET /api/driver/payroll?period=YYYY-MM  (Feat 4: /api/me/payroll)
 */
import { createAdapter } from '@/data/adapter'

import { httpPayrollApi } from './payroll-http'
import { mockPayrollApi } from './payroll-mock'
import type { PayrollStatement } from './payroll-model'
import type { PayrollPeriodKey } from './payroll-period'

export type PayrollApi = {
  fetchMyPayroll(period: PayrollPeriodKey): Promise<PayrollStatement>
}

const adapter = createAdapter<PayrollApi>('payroll', { mock: mockPayrollApi, http: () => httpPayrollApi() })

// GET /api/driver/payroll?period=YYYY-MM
export function fetchMyPayroll(period: PayrollPeriodKey): Promise<PayrollStatement> {
  return adapter().fetchMyPayroll(period)
}
