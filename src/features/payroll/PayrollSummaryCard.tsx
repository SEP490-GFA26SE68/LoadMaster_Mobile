import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { useFormat, useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import type { CalculatedPayrollStatement } from './payroll-model'
import { payrollPeriodParts } from './payroll-period'

type PayrollSummaryCardProps = {
  readonly statement: CalculatedPayrollStatement
}

/** Hero card tổng lương tháng: tổng thực nhận, trạng thái kỳ (Bản nháp / Đã chốt) và 3 chỉ số sản lượng chính. */
export function PayrollSummaryCard({ statement }: PayrollSummaryCardProps) {
  const t = useT()
  const format = useFormat()
  const periodLabel = t('payroll.period.label', payrollPeriodParts(statement.period))
  const statusTone = statement.status === 'LOCKED' ? 'success' : 'warning'

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <AppText variant="meta" color={colors.text3}>
            {t('payroll.summary.totalLabel', { period: periodLabel })}
          </AppText>
          {statement.driverName !== '' ? (
            <AppText variant="label" color={colors.text2} numberOfLines={1}>
              {statement.driverName}
            </AppText>
          ) : null}
        </View>
        <Chip tone={statusTone} label={t(`payroll.status.${statement.status}`)} />
      </View>

      <AppText variant="display" color={colors.primary} style={styles.amount}>
        {format.currency(statement.totalSalaryVnd)}
      </AppText>

      <View style={styles.metricsRow}>
        <MetricCell label={t('payroll.summary.trips')} value={format.integer(statement.trips.length)} />
        <View style={styles.metricDivider} />
        <MetricCell label={t('payroll.summary.totalKg')} value={format.weight(statement.totalKg)} />
        <View style={styles.metricDivider} />
        <MetricCell label={t('payroll.summary.totalKm')} value={t('payroll.trips.kmUnit', { value: format.lengthValue(statement.totalKm) })} />
      </View>

      {statement.status === 'DRAFT' ? <Banner tone="warning">{t('payroll.summary.draftNotice')}</Banner> : null}
    </Card>
  )
}

function MetricCell({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={styles.metricCell}>
      <AppText variant="meta" color={colors.text3} numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="label" color={colors.text} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[2],
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  amount: {
    letterSpacing: -0.4,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: space[3],
    paddingHorizontal: space[2],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[1],
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: space[1],
  },
})
