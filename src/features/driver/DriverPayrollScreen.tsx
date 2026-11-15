import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { DriverPayrollStatement } from './driver-model'
import { useDriverPayrollQuery } from './useDriverQueries'

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftPeriod(period: string, amount: number): string {
  const [yearText, monthText] = period.split('-')
  const date = new Date(Number(yearText), Number(monthText) - 1 + amount, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function shareLabel(value: number, format: ReturnType<typeof useFormat>): string {
  return `${Number.isInteger(value) ? format.integer(value) : format.ratio(value)}%`
}

export function DriverPayrollScreen() {
  const t = useT()
  const [period, setPeriod] = useState(currentPeriod)
  const query = useDriverPayrollQuery(period)

  return (
    <Screen
      title={t('driver.payroll.title')}
      below={
        <View style={styles.periodControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('driver.payroll.previousMonth')}
            onPress={() => setPeriod((value) => shiftPeriod(value, -1))}
            style={styles.periodButton}>
            <AppText variant="label">‹</AppText>
          </Pressable>
          <AppText variant="label">{t('driver.payroll.period', { period })}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('driver.payroll.nextMonth')}
            onPress={() => setPeriod((value) => shiftPeriod(value, 1))}
            style={styles.periodButton}>
            <AppText variant="label">›</AppText>
          </Pressable>
        </View>
      }
      scroll
      refresh={{ refreshing: query.isRefetching, onRefresh: () => void query.refetch() }}>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : query.data.kind === 'notCalculated' ? (
        <EmptyState title={t('driver.payroll.notCalculatedTitle')} description={t('driver.payroll.notCalculatedDescription')} />
      ) : (
        <Statement statement={query.data} />
      )}
    </Screen>
  )
}

function Statement({ statement }: { statement: Extract<DriverPayrollStatement, { kind: 'calculated' }> }) {
  const t = useT()
  const format = useFormat()
  return (
    <View style={styles.content}>
      <Card>
        <AppText variant="meta" color={colors.text2}>{t('driver.payroll.status')}</AppText>
        <AppText>{statement.status === 'LOCKED' ? t('driver.payroll.statusLocked') : t('driver.payroll.statusDraft')}</AppText>
        <AppText variant="meta" color={colors.text2}>{t('driver.payroll.total')}</AppText>
        <AppText variant="display">{format.currency(statement.totalSalaryVnd)}</AppText>
        <Fact
          label={t('driver.payroll.baseSalary')}
          value={format.currency(statement.baseSalaryVnd)}
        />
        <Fact
          label={t('driver.payroll.kgAmount')}
          detail={t('driver.payroll.kgBasis', {
            quantity: format.weight(statement.totalKg),
            rate: format.currency(statement.kgRateVndPerKg),
          })}
          value={format.currency(statement.kgAmountVnd)}
        />
        <Fact
          label={t('driver.payroll.kmAmount')}
          detail={t('driver.payroll.kmBasis', {
            quantity: format.ratio(statement.totalKm),
            rate: format.currency(statement.kmRateVndPerKm),
          })}
          value={format.currency(statement.kmAmountVnd)}
        />
      </Card>

      <AppText variant="heading" accessibilityRole="header">{t('driver.payroll.tripBreakdown')}</AppText>
      {statement.trips.length === 0 ? (
        <AppText color={colors.text2}>{t('driver.payroll.noTrips')}</AppText>
      ) : (
        statement.trips.map((trip) => (
          <Card key={trip.tripId}>
            <View style={styles.tripHeading}>
              <AppText variant="label">{trip.tripCode}</AppText>
              <AppText>{shareLabel(trip.sharePercent, format)}</AppText>
            </View>
            <AppText color={colors.text2}>
              {t('driver.payroll.allocated', {
                kg: format.weight(trip.allocatedKg),
                km: format.ratio(trip.allocatedKm),
              })}
            </AppText>
            <Fact label={t('driver.payroll.kgAmount')} value={format.currency(trip.kgAmountVnd)} compact />
            <Fact label={t('driver.payroll.kmAmount')} value={format.currency(trip.kmAmountVnd)} compact />
          </Card>
        ))
      )}
    </View>
  )
}

function Fact({ label, detail, value, compact = false }: { label: string; detail?: string; value: string; compact?: boolean }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factText}>
        <AppText variant="label">{label}</AppText>
        {detail === undefined ? null : <AppText variant="meta" color={colors.text2}>{detail}</AppText>}
      </View>
      <AppText variant={compact ? 'body' : 'label'}>{value}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { gap: space[4], padding: space[4], paddingBottom: space[8] },
  periodControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  periodButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.bg },
  fact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  factText: { flex: 1, gap: space[1] },
  tripHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
})
