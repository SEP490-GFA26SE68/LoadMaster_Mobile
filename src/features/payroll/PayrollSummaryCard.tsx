import { Package, Route, Truck, Wallet } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, radius, space, type BadgeTone } from '@/theme/tokens'

import type { CalculatedPayrollStatement, PayrollPeriodStatus } from './payroll-model'
import { payrollPeriodParts, type PayrollPeriodKey } from './payroll-period'

type PayrollHeroProps = {
  readonly period: PayrollPeriodKey
  readonly status: PayrollPeriodStatus
  /** Tên người nhận lương; rỗng thì không có dòng tên. */
  readonly name: string
  readonly totalVnd: number
  /** Hàng ô chỉ số dưới tổng tiền (`MetricTile`). */
  readonly metrics: ReactNode
}

/**
 * Khung tổng lương tháng dùng chung của tài xế và nhân viên kho: nền trắng, viền nhấn trái theo trạng thái, khung tổng tiền cyan dịu, hàng ô
 * chỉ số pastel; kỳ Bản nháp có thêm dải cảnh báo số liệu còn đổi.
 */
export function PayrollHero({ period, status, name, totalVnd, metrics }: PayrollHeroProps) {
  const t = useT()
  const format = useFormat()
  const periodLabel = t('payroll.period.label', payrollPeriodParts(period))
  const statusTone: BadgeTone = status === 'LOCKED' ? 'success' : 'warning'
  const accent = badgeTones[statusTone]

  return (
    <View style={styles.wrap}>
      <Card style={[styles.heroCard, { borderLeftColor: accent.fg }]}>
        <View style={styles.topRow}>
          <View style={styles.titleRow}>
            <View style={styles.walletBadge}>
              <Wallet color={badgeTones.cyan.fg} size={20} strokeWidth={1.75} />
            </View>
            <View style={styles.titleBlock}>
              <AppText variant="meta" color={colors.text3}>
                {t('payroll.summary.totalLabel', { period: periodLabel })}
              </AppText>
              {name !== '' ? (
                <AppText variant="label" color={colors.text} numberOfLines={1}>
                  {name}
                </AppText>
              ) : null}
            </View>
          </View>
          <View style={styles.chipWrap}>
            <Chip tone={statusTone} label={t(`payroll.status.${status}`)} />
          </View>
        </View>

        <View style={styles.amountBox}>
          <AppText variant="display" color={colors.primary} numberOfLines={1} adjustsFontSizeToFit style={styles.amount}>
            {format.currency(totalVnd)}
          </AppText>
        </View>

        <View style={styles.metricsRow}>{metrics}</View>
      </Card>

      {status === 'DRAFT' ? <Banner tone="warning">{t('payroll.summary.draftNotice')}</Banner> : null}
    </View>
  )
}

type PayrollSummaryCardProps = {
  readonly statement: CalculatedPayrollStatement
}

/** Tổng lương tháng của tài xế: số chuyến, khối lượng, quãng đường. */
export function PayrollSummaryCard({ statement }: PayrollSummaryCardProps) {
  const t = useT()
  const format = useFormat()
  return (
    <PayrollHero
      period={statement.period}
      status={statement.status}
      name={statement.driverName}
      totalVnd={statement.totalSalaryVnd}
      metrics={
        <>
          <MetricTile
            tone="azure"
            icon={<Truck color={badgeTones.azure.fg} size={15} strokeWidth={1.75} />}
            label={t('payroll.summary.trips')}
            value={format.integer(statement.trips.length)}
          />
          <MetricTile
            tone="warning"
            icon={<Package color={badgeTones.warning.fg} size={15} strokeWidth={1.75} />}
            label={t('payroll.summary.totalKg')}
            value={format.weight(statement.totalKg)}
          />
          <MetricTile
            tone="success"
            icon={<Route color={badgeTones.success.fg} size={15} strokeWidth={1.75} />}
            label={t('payroll.summary.totalKm')}
            value={t('payroll.trips.kmUnit', { value: format.lengthValue(statement.totalKm) })}
          />
        </>
      }
    />
  )
}

/** Một ô chỉ số của `PayrollHero`. */
export function MetricTile({
  tone,
  icon,
  label,
  value,
}: {
  readonly tone: BadgeTone
  readonly icon: ReactNode
  readonly label: string
  readonly value: string
}) {
  const paletteTone = badgeTones[tone]
  return (
    <View style={[styles.metricTile, { backgroundColor: paletteTone.bg, borderColor: paletteTone.border }]}>
      <View style={styles.metricHead}>
        {icon}
        <AppText variant="meta" color={colors.text2} numberOfLines={2} style={styles.metricLabel}>
          {label}
        </AppText>
      </View>
      <AppText variant="label" color={paletteTone.fg} numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>
        {value}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[3],
  },
  heroCard: {
    gap: space[3],
    borderRadius: radius.xl,
    borderLeftWidth: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[2],
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  chipWrap: {
    flexShrink: 0,
  },
  walletBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: badgeTones.cyan.bg,
    borderWidth: 1,
    borderColor: badgeTones.cyan.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  amountBox: {
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    backgroundColor: badgeTones.cyan.bg,
    borderWidth: 1,
    borderColor: badgeTones.cyan.border,
  },
  amount: {
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space[2],
  },
  metricTile: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
    gap: space[1],
    paddingVertical: space[2],
    paddingHorizontal: space[2],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  metricHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[1],
  },
  metricLabel: {
    flex: 1,
    minWidth: 0,
  },
  metricValue: {
    fontVariant: ['tabular-nums'],
  },
})
