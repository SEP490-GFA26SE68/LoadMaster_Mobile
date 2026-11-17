import { ReceiptText } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { CalculatedPayrollStatement } from './payroll-model'

type PayrollBreakdownCardProps = {
  readonly statement: CalculatedPayrollStatement
}

/** Bảng chi tiết từng khoản thu nhập (lương cứng, tiền kg, tiền km và các khoản mở rộng ở Feat 1–3). */
export function PayrollBreakdownCard({ statement }: PayrollBreakdownCardProps) {
  const t = useT()
  const format = useFormat()

  const kgFormula = t('payroll.breakdown.kgFormula', {
    kg: format.weight(statement.totalKg),
    rate: format.currency(statement.rateVndPerKg),
  })
  const kmFormula = t('payroll.breakdown.kmFormula', {
    km: format.lengthValue(statement.totalKm),
    rate: format.currency(statement.rateVndPerKm),
  })

  return (
    <Card>
      <View style={styles.header}>
        <ReceiptText color={colors.primary} size={20} strokeWidth={1.75} />
        <AppText variant="heading" accessibilityRole="header">
          {t('payroll.breakdown.title')}
        </AppText>
      </View>

      <View style={styles.rows}>
        <BreakdownRow
          label={t('payroll.breakdown.baseSalary')}
          hint={statement.baseSalaryVnd === 0 ? t('payroll.breakdown.baseSalaryInactiveHint') : undefined}
          amount={format.currency(statement.baseSalaryVnd)}
        />
        <BreakdownRow
          label={t('payroll.breakdown.kgAmount')}
          hint={kgFormula}
          amount={format.currency(statement.kgAmountVnd)}
        />
        <BreakdownRow
          label={t('payroll.breakdown.kmAmount')}
          hint={kmFormula}
          amount={format.currency(statement.kmAmountVnd)}
        />

        {statement.kpiBonusVnd !== undefined && statement.kpiBonusVnd > 0 ? (
          <BreakdownRow label={t('payroll.breakdown.kpiBonus')} amount={format.currency(statement.kpiBonusVnd)} />
        ) : null}

        {statement.handlingAmountVnd !== undefined && statement.handlingAmountVnd > 0 ? (
          <BreakdownRow label={t('payroll.breakdown.handlingAmount')} amount={format.currency(statement.handlingAmountVnd)} />
        ) : null}

        {statement.commissionAmountVnd !== undefined && statement.commissionAmountVnd > 0 ? (
          <BreakdownRow label={t('payroll.breakdown.commissionAmount')} amount={format.currency(statement.commissionAmountVnd)} />
        ) : null}
      </View>

      <View style={styles.totalRow}>
        <AppText variant="label" color={colors.text}>
          {t('payroll.breakdown.total')}
        </AppText>
        <AppText variant="heading" color={colors.primary}>
          {format.currency(statement.totalSalaryVnd)}
        </AppText>
      </View>
    </Card>
  )
}

function BreakdownRow({ label, hint, amount }: { readonly label: string; readonly hint?: string; readonly amount: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <AppText variant="body" color={colors.text}>
          {label}
        </AppText>
        {hint === undefined ? null : (
          <AppText variant="meta" color={colors.text3}>
            {hint}
          </AppText>
        )}
      </View>
      <AppText variant="label" color={colors.text} style={styles.rowAmount}>
        {amount}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  rows: {
    gap: space[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[3],
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowAmount: {
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
})
