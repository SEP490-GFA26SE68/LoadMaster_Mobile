import { CalendarOff } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { Screen } from '@/components/Screen'
import { ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import { PayrollBreakdownCard } from './PayrollBreakdownCard'
import { PayrollSummaryCard } from './PayrollSummaryCard'
import { PayrollTripList } from './PayrollTripList'
import { currentPayrollPeriod, payrollPeriodParts, shiftPayrollPeriod, type PayrollPeriodKey } from './payroll-period'
import { PeriodStepper } from './PeriodStepper'
import { useMyPayroll } from './usePayrollQueries'

/**
 * Màn Phiếu lương của tài xế: chọn kỳ tháng, xem tổng lương (Bản nháp / Đã chốt), chi tiết các khoản thu nhập và danh sách chuyến.
 * Khi kỳ chưa được quản lý tính (`calculated: false`), hiển thị thẻ thông báo thân thiện thay vì lỗi.
 */
export function PayrollScreen() {
  const t = useT()
  const maxPeriod = currentPayrollPeriod()
  const [period, setPeriod] = useState<PayrollPeriodKey>(maxPeriod)
  const query = useMyPayroll(period)

  const isCurrentPeriod = period === maxPeriod
  const periodLabel = t('payroll.period.label', payrollPeriodParts(period))

  const handlePrevious = () => setPeriod((prev) => shiftPayrollPeriod(prev, -1))
  const handleNext = () => {
    setPeriod((prev) => {
      const next = shiftPayrollPeriod(prev, 1)
      return next > maxPeriod ? maxPeriod : next
    })
  }

  const quickCurrentAction = isCurrentPeriod ? undefined : (
    <Pressable
      accessibilityRole="button"
      onPress={() => setPeriod(maxPeriod)}
      style={({ pressed }) => [styles.currentPill, pressed && styles.currentPillPressed]}>
      <AppText variant="meta" color={colors.skyText}>
        {t('payroll.period.currentButton')}
      </AppText>
    </Pressable>
  )

  return (
    <Screen
      title={t('payroll.title')}
      actions={quickCurrentAction}
      below={<PeriodStepper period={period} maxPeriod={maxPeriod} onPrevious={handlePrevious} onNext={handleNext} />}
      scroll
      refresh={{ refreshing: query.isRefetching, onRefresh: () => void query.refetch() }}>
      {query.isPending ? (
        <LoadingState label={t('payroll.loading')} />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : !query.data.calculated ? (
        <Card style={styles.uncalculatedCard}>
          <View style={styles.uncalculatedIcon}>
            <CalendarOff color={colors.text3} size={28} strokeWidth={1.5} />
          </View>
          <Chip tone="neutral" label={t('payroll.status.UNCALCULATED')} />
          <AppText variant="heading" accessibilityRole="header" style={styles.centered}>
            {t('payroll.uncalculated.title', { period: periodLabel })}
          </AppText>
          <AppText variant="body" color={colors.text2} style={styles.centered}>
            {t('payroll.uncalculated.description')}
          </AppText>
          <Button variant="secondary" onPress={handlePrevious} style={styles.uncalculatedAction}>
            {t('payroll.uncalculated.viewPrevious')}
          </Button>
        </Card>
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

const styles = StyleSheet.create({
  currentPill: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    backgroundColor: colors.skySolid,
    borderWidth: 1,
    borderColor: colors.skySolidBorder,
  },
  currentPillPressed: {
    backgroundColor: colors.skySolidPressed,
  },
  uncalculatedCard: {
    alignItems: 'center',
    paddingVertical: space[6],
    gap: space[3],
  },
  uncalculatedIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  uncalculatedAction: {
    marginTop: space[2],
    alignSelf: 'stretch',
  },
})
