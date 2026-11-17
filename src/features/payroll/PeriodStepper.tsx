import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { useT } from '@/lib/i18n'
import { colors, radius, space, TOUCH } from '@/theme/tokens'

import { comparePayrollPeriod, payrollPeriodParts, type PayrollPeriodKey } from './payroll-period'

type PeriodStepperProps = {
  readonly period: PayrollPeriodKey
  readonly maxPeriod: PayrollPeriodKey
  readonly onPrevious: () => void
  readonly onNext: () => void
}

/** Thanh chọn kỳ lương đặt trong dải trời đầu màn: nút lùi/tiến tháng cao 56, chặn tiến vượt quá tháng hiện tại. */
export function PeriodStepper({ period, maxPeriod, onPrevious, onNext }: PeriodStepperProps) {
  const t = useT()
  const nextDisabled = comparePayrollPeriod(period, maxPeriod) >= 0
  const label = t('payroll.period.label', payrollPeriodParts(period))

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('payroll.period.previous')}
        onPress={onPrevious}
        style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}>
        <ChevronLeft color={colors.skyText} size={22} strokeWidth={1.75} />
      </Pressable>

      <View style={styles.center}>
        <Calendar color={colors.skyText2} size={18} strokeWidth={1.75} />
        <AppText variant="heading" color={colors.skyText} numberOfLines={1}>
          {label}
        </AppText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('payroll.period.next')}
        accessibilityState={{ disabled: nextDisabled }}
        disabled={nextDisabled}
        onPress={onNext}
        style={({ pressed }) => [styles.navButton, nextDisabled && styles.navButtonDisabled, !nextDisabled && pressed && styles.navButtonPressed]}>
        <ChevronRight color={nextDisabled ? colors.skyText2 : colors.skyText} size={22} strokeWidth={1.75} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    padding: space[1],
    borderRadius: radius.lg,
    backgroundColor: colors.skySolid,
    borderWidth: 1,
    borderColor: colors.skySolidBorder,
  },
  navButton: {
    width: TOUCH,
    height: TOUCH - space[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  navButtonPressed: {
    backgroundColor: colors.skySolidPressed,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
})
