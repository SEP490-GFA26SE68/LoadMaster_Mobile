import { Screen } from '@/components/Screen'
import { ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useT } from '@/lib/i18n'

import { PayrollBreakdownCard } from './PayrollBreakdownCard'
import { PayrollSummaryCard } from './PayrollSummaryCard'
import { PayrollTripList } from './PayrollTripList'
import { PayrollUncalculatedCard } from './PayrollUncalculatedCard'
import { useMyPayroll } from './usePayrollQueries'
import { usePayrollPeriod } from './usePayrollPeriod'

/**
 * Màn Phiếu lương của tài xế: chọn kỳ tháng, xem tổng lương (Bản nháp / Đã chốt), chi tiết các khoản thu nhập và danh sách chuyến.
 * Khi kỳ chưa được quản lý tính (`calculated: false`), hiển thị thẻ thông báo thân thiện thay vì lỗi.
 */
export function PayrollScreen() {
  const t = useT()
  const { period, periodLabel, handlePrevious, actions, below } = usePayrollPeriod()
  const query = useMyPayroll(period)

  return (
    <Screen
      title={t('payroll.title')}
      actions={actions}
      below={below}
      scroll
      refresh={{ refreshing: query.isRefetching, onRefresh: () => void query.refetch() }}>
      {query.isPending ? (
        <LoadingState label={t('payroll.loading')} />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : !query.data.calculated ? (
        <PayrollUncalculatedCard periodLabel={periodLabel} description={t('payroll.uncalculated.description')} onPrevious={handlePrevious} />
      ) : (
        <>
          <PayrollSummaryCard statement={query.data} />
          <PayrollBreakdownCard statement={query.data} />
          <PayrollTripList key={query.data.period} trips={query.data.trips} />
        </>
      )}
    </Screen>
  )
}
