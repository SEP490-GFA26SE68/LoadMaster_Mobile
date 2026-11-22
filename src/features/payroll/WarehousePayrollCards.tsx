import { Award, Briefcase, Package, Truck, Weight } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, radius, space } from '@/theme/tokens'

import { BreakdownRow, PayrollBreakdownShell } from './PayrollBreakdownCard'
import { MetricTile, PayrollHero } from './PayrollSummaryCard'
import { PayrollLineList } from './PayrollTripList'
import type { CalculatedWarehousePayroll, WarehousePayrollTripLine } from './warehouse-payroll-model'

type CardProps = {
  readonly statement: CalculatedWarehousePayroll
}

/** Tổng lương tháng của nhân viên kho: số chuyến, số kiện, khối lượng đã xếp. */
export function WarehousePayrollSummaryCard({ statement }: CardProps) {
  const t = useT()
  const format = useFormat()
  return (
    <PayrollHero
      period={statement.period}
      status={statement.status}
      name={statement.workerName}
      totalVnd={statement.totalSalaryVnd}
      metrics={
        <>
          <MetricTile
            tone="azure"
            icon={<Truck color={badgeTones.azure.fg} size={15} strokeWidth={1.75} />}
            label={t('payroll.warehouse.summary.trips')}
            value={format.integer(statement.trips.length)}
          />
          <MetricTile
            tone="success"
            icon={<Package color={badgeTones.success.fg} size={15} strokeWidth={1.75} />}
            label={t('payroll.warehouse.summary.packages')}
            value={format.integer(statement.loadedPackages)}
          />
          <MetricTile
            tone="warning"
            icon={<Weight color={badgeTones.warning.fg} size={15} strokeWidth={1.75} />}
            label={t('payroll.warehouse.summary.loadedKg')}
            value={format.weight(statement.loadedKg)}
          />
        </>
      }
    />
  )
}

/** Chi tiết thu nhập của nhân viên kho: lương cứng, tiền theo khối lượng xếp, KPI tháng và thưởng KPI. */
export function WarehousePayrollBreakdownCard({ statement }: CardProps) {
  const t = useT()
  const format = useFormat()
  const kpiTargetKg = statement.kpiTargetKg
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
        label={t('payroll.warehouse.breakdown.loadedAmount')}
        hint={t('payroll.breakdown.kgFormula', { kg: format.weight(statement.loadedKg), rate: format.currency(statement.rateVndPerKg) })}
        amount={format.currency(statement.loadedAmountVnd)}
      />
      {kpiTargetKg === undefined ? null : (
        <BreakdownRow
          icon={Award}
          tone={statement.kpiAchieved === true ? 'success' : 'neutral'}
          label={t('payroll.breakdown.kpiMonth')}
          hint={t('payroll.warehouse.breakdown.kpiProgress', { totalKg: format.weight(statement.loadedKg), targetKg: format.weight(kpiTargetKg) })}
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
        <BreakdownRow icon={Award} tone="cyan" label={t('payroll.breakdown.kpiBonus')} amount={format.currency(statement.kpiBonusVnd)} />
      ) : null}
    </PayrollBreakdownShell>
  )
}

/** Danh sách chuyến nhân viên kho đã xếp trong kỳ; chỉ đọc (nhân viên kho không mở được chi tiết chuyến). */
export function WarehousePayrollTripList({ trips }: { readonly trips: readonly WarehousePayrollTripLine[] }) {
  const t = useT()
  return (
    <PayrollLineList
      trips={trips}
      keyOf={(line) => line.tripId}
      renderLine={(line) => <WarehousePayrollTripRow line={line} />}
      empty={t('payroll.warehouse.trips.empty')}
    />
  )
}

function WarehousePayrollTripRow({ line }: { readonly line: WarehousePayrollTripLine }) {
  const t = useT()
  const format = useFormat()
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <AppText variant="label" style={styles.code}>
          {line.tripCode}
        </AppText>
        {line.loadedDate === null ? null : (
          // Ngày xếp là ngày lịch Việt Nam: neo giữa trưa giờ Việt Nam để múi giờ của máy không đẩy sang ngày khác
          <AppText variant="meta" color={colors.text3}>
            {t('payroll.warehouse.trips.loadedOn', { date: format.date(`${line.loadedDate}T12:00:00+07:00`) })}
          </AppText>
        )}
      </View>
      <View style={styles.rowFigures}>
        <AppText color={colors.text2}>{t('payroll.warehouse.trips.packages', { count: format.integer(line.loadedPackages) })}</AppText>
        <AppText variant="label" color={badgeTones.warning.fg} style={styles.tabular}>
          {format.weight(line.loadedKg)}
        </AppText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: space[1],
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderLeftWidth: 4,
    borderLeftColor: badgeTones.cyan.fg,
    backgroundColor: colors.bg,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space[2],
  },
  code: {
    flexShrink: 1,
  },
  rowFigures: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
})
