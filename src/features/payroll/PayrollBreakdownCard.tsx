import { Award, Briefcase, Package, ReceiptText, Route, TrendingUp, Weight, type LucideIcon } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, radius, space, type BadgeTone } from '@/theme/tokens'

import type { CalculatedPayrollStatement } from './payroll-model'

type PayrollBreakdownCardProps = {
  readonly statement: CalculatedPayrollStatement
}

/** Bảng chi tiết từng khoản thu nhập với icon badge theo nhóm màu rõ ràng và khung Tổng thực nhận nổi bật. */
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
    <PayrollBreakdownShell totalVnd={statement.totalSalaryVnd}>
      <BreakdownRow
        icon={Briefcase}
        tone="azure"
        label={t('payroll.breakdown.baseSalary')}
        hint={statement.baseSalaryVnd === 0 ? t('payroll.breakdown.baseSalaryInactiveHint') : undefined}
        amount={format.currency(statement.baseSalaryVnd)}
      />
      <BreakdownRow
        icon={Weight}
        tone="warning"
        label={t('payroll.breakdown.kgAmount')}
        hint={kgFormula}
        amount={format.currency(statement.kgAmountVnd)}
      />
      <BreakdownRow
        icon={Route}
        tone="success"
        label={t('payroll.breakdown.kmAmount')}
        hint={kmFormula}
        amount={format.currency(statement.kmAmountVnd)}
      />

      {statement.kpiTargetKg === undefined ? null : (
        <BreakdownRow
          icon={Award}
          tone={statement.kpiAchieved === true ? 'success' : 'neutral'}
          label={t('payroll.breakdown.kpiMonth')}
          hint={t('payroll.breakdown.kpiProgress', {
            targetKg: format.weight(statement.kpiTargetKg),
            totalKg: format.weight(statement.totalKg),
          })}
          amount={
            statement.kpiAchieved === true
              ? t('payroll.breakdown.kpiAchieved')
              : statement.kpiAchieved === false
                ? t('payroll.breakdown.kpiNotAchieved')
                : undefined
          }
        />
      )}

      {statement.kpiBonusVnd !== undefined && statement.kpiBonusVnd > 0 ? (
        <BreakdownRow
          icon={Award}
          tone="cyan"
          label={t('payroll.breakdown.kpiBonus')}
          amount={format.currency(statement.kpiBonusVnd)}
        />
      ) : null}

      {statement.handlingAmountVnd !== undefined && statement.handlingAmountVnd > 0 ? (
        <BreakdownRow
          icon={Package}
          tone="warning"
          label={t('payroll.breakdown.handlingAmount')}
          amount={format.currency(statement.handlingAmountVnd)}
        />
      ) : null}

      {statement.commissionAmountVnd !== undefined && statement.commissionAmountVnd > 0 ? (
        <BreakdownRow
          icon={TrendingUp}
          tone="success"
          label={t('payroll.breakdown.commissionAmount')}
          amount={format.currency(statement.commissionAmountVnd)}
        />
      ) : null}
    </PayrollBreakdownShell>
  )
}

/** Khung "Chi tiết thu nhập" dùng chung: tiêu đề, các dòng khoản (`BreakdownRow`) và khung Tổng thực nhận. */
export function PayrollBreakdownShell({ totalVnd, children }: { readonly totalVnd: number; readonly children: ReactNode }) {
  const t = useT()
  const format = useFormat()
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.headerBadge, { backgroundColor: badgeTones.cyan.bg }]}>
          <ReceiptText color={badgeTones.cyan.fg} size={18} strokeWidth={1.75} />
        </View>
        <AppText variant="heading" accessibilityRole="header">
          {t('payroll.breakdown.title')}
        </AppText>
      </View>

      <View style={styles.rows}>{children}</View>

      <View style={styles.totalBox}>
        <AppText variant="label" color={badgeTones.cyan.fg}>
          {t('payroll.breakdown.total')}
        </AppText>
        <AppText variant="heading" color={colors.primary} style={styles.tabular}>
          {format.currency(totalVnd)}
        </AppText>
      </View>
    </Card>
  )
}

/** Một dòng khoản thu nhập: ô icon theo nhóm màu, nhãn, gợi ý công thức, số tiền. */
export function BreakdownRow({
  icon: Icon,
  tone,
  label,
  hint,
  amount,
}: {
  readonly icon: LucideIcon
  readonly tone: BadgeTone
  readonly label: string
  readonly hint?: string
  readonly amount?: string
}) {
  const paletteTone = badgeTones[tone]
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: paletteTone.bg }]}>
        <Icon color={paletteTone.fg} size={16} strokeWidth={1.75} />
      </View>
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
      {amount === undefined ? null : (
        <AppText variant="label" color={paletteTone.fg} style={styles.rowAmount}>
          {amount}
        </AppText>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    borderLeftColor: badgeTones.cyan.fg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  headerBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rows: {
    gap: space[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowAmount: {
    textAlign: 'right',
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
  totalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    borderRadius: radius.md,
    backgroundColor: badgeTones.cyan.bg,
    borderWidth: 1,
    borderColor: badgeTones.cyan.border,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
})
