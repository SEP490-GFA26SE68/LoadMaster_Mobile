import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { AppText } from '@/components/AppText'
import { useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import { currentPayrollPeriod, payrollPeriodParts, shiftPayrollPeriod, type PayrollPeriodKey } from './payroll-period'
import { PeriodStepper } from './PeriodStepper'

export type PayrollPeriodControls = {
  readonly period: PayrollPeriodKey
  /** "Tháng 10/2026" của kỳ đang xem. */
  readonly periodLabel: string
  readonly handlePrevious: () => void
  /** Nút "Tháng này" trên dải trời khi đang xem tháng khác; tháng này thì `undefined`. */
  readonly actions: ReactNode
  /** Bộ chọn tháng đặt ở `below` của `Screen`. */
  readonly below: ReactNode
}

/**
 * Bộ chọn kỳ tháng dùng chung cho phiếu lương của tài xế và nhân viên kho: mở ở tháng này (giờ Việt Nam), lùi / tiến từng tháng, không
 * tiến quá tháng này, nút "Tháng này" khi đang xem tháng khác.
 */
export function usePayrollPeriod(): PayrollPeriodControls {
  const t = useT()
  const maxPeriod = currentPayrollPeriod()
  const [period, setPeriod] = useState<PayrollPeriodKey>(maxPeriod)

  const handlePrevious = () => setPeriod((prev) => shiftPayrollPeriod(prev, -1))
  const handleNext = () => {
    setPeriod((prev) => {
      const next = shiftPayrollPeriod(prev, 1)
      return next > maxPeriod ? maxPeriod : next
    })
  }

  const actions =
    period === maxPeriod ? undefined : (
      <Pressable
        accessibilityRole="button"
        onPress={() => setPeriod(maxPeriod)}
        style={({ pressed }) => [styles.currentPill, pressed && styles.currentPillPressed]}>
        <AppText variant="meta" color={colors.skyText}>
          {t('payroll.period.currentButton')}
        </AppText>
      </Pressable>
    )

  return {
    period,
    periodLabel: t('payroll.period.label', payrollPeriodParts(period)),
    handlePrevious,
    actions,
    below: <PeriodStepper period={period} maxPeriod={maxPeriod} onPrevious={handlePrevious} onNext={handleNext} />,
  }
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
})
