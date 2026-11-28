import { AppText } from '@/components/AppText'
import { Screen } from '@/components/Screen'
import { ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors } from '@/theme/tokens'

import { PayrollUncalculatedCard } from './PayrollUncalculatedCard'
import { useMyWarehousePayroll } from './usePayrollQueries'
import { usePayrollPeriod } from './usePayrollPeriod'
import { WarehousePayrollBreakdownCard, WarehousePayrollSummaryCard, WarehousePayrollTripList } from './WarehousePayrollCards'

/**
 * Màn Phiếu lương của nhân viên kho (`GET /api/warehouse/payroll`), cùng bố cục với phiếu lương tài xế: chọn kỳ tháng, tổng lương, chi tiết
 * khoản (lương cứng, tiền theo khối lượng xếp, KPI) và các chuyến đã xếp. Máy chủ chỉ trả đủ phiếu khi kỳ đã chốt; kỳ chưa chốt là thẻ "Chưa
 * có phiếu lương" kèm lương cứng của tháng khi máy chủ biết.
 */
export function WarehousePayrollScreen() {
  const t = useT()
  const format = useFormat()
  const { period, periodLabel, handlePrevious, actions, below } = usePayrollPeriod()
  const query = useMyWarehousePayroll(period)

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
        <PayrollUncalculatedCard
          periodLabel={periodLabel}
          description={t(`payroll.warehouse.uncalculated.${query.data.status ?? 'none'}`)}
          onPrevious={handlePrevious}>
          {query.data.baseSalaryVnd === null ? null : (
            <AppText variant="label" color={colors.text}>
              {t('payroll.warehouse.uncalculated.baseSalary', { amount: format.currency(query.data.baseSalaryVnd) })}
            </AppText>
          )}
        </PayrollUncalculatedCard>
      ) : (
        <>
          <WarehousePayrollSummaryCard statement={query.data} />
          <WarehousePayrollBreakdownCard statement={query.data} />
          <WarehousePayrollTripList key={query.data.period} trips={query.data.trips} />
        </>
      )}
    </Screen>
  )
}
