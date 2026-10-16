import { useRouter } from 'expo-router'
import { ArrowLeft, CircleCheck, TriangleAlert } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { StopDot } from '@/components/StopDot'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, radius, shadow, space } from '@/theme/tokens'

import type { TripHead, TripSummaryModel } from './driver-model'

/**
 * Tổng kết chuyến (như `TripSummary` của web) khi giao xong điểm cuối, và khi mở lại một chuyến đã hoàn thành: tên chuyến, bốn ô số (số
 * điểm giao, kiện đã giao, sự cố — nền hổ phách khi có —, thời gian), khối sự cố (loại, kiện, ghi chú) và danh sách điểm (giờ hoàn tất, số
 * kiện, số sự cố, dấu kiểm). Mọi số đọc từ nguồn dữ liệu; nguồn chưa có số liệu tổng kết thì chỉ một câu nói vậy. Chân màn là nút về danh
 * sách chuyến.
 */
export function TripSummaryView({ trip, summary }: { trip: TripHead; summary: TripSummaryModel | undefined }) {
  const t = useT()
  const router = useRouter()
  const toTrips = () => router.dismissTo('/trips')
  return (
    <Screen
      title={t('driver.tripSummary.title')}
      leading={<IconButton icon={ArrowLeft} tone="sky" label={t('driver.toTrips')} onPress={toTrips} />}
      scroll
      footer={<Button onPress={toTrips}>{t('driver.toTrips')}</Button>}>
      <Card>
        <AppText variant="heading" accessibilityRole="header">
          {t('driver.tripSummary.heading', { tripId: trip.code })}
        </AppText>
        {trip.name === undefined ? null : <AppText color={colors.text2}>{trip.name}</AppText>}
      </Card>
      {summary === undefined ? <AppText color={colors.text2}>{t('driver.tripSummary.unavailable', { tripId: trip.code })}</AppText> : <SummaryBody summary={summary} />}
    </Screen>
  )
}

function SummaryBody({ summary }: { summary: TripSummaryModel }) {
  const t = useT()
  const format = useFormat()
  const { startedAt, completedAt, issues, stops } = summary
  return (
    <>
      <View style={styles.facts}>
        <Fact label={t('driver.tripSummary.stops')} value={format.integer(summary.stopCount)} />
        <Fact label={t('driver.tripSummary.delivered')} value={format.integer(summary.delivered)} />
        <Fact label={t('driver.tripSummary.issues')} value={format.integer(issues.length)} warn={issues.length > 0} />
        <Fact
          label={t('driver.tripSummary.time')}
          small
          value={
            startedAt !== undefined && completedAt !== undefined
              ? t('driver.tripSummary.timeRange', { start: format.time(startedAt), end: format.time(completedAt), date: format.date(startedAt) })
              : ''
          }
        />
      </View>

      <Section title={t('driver.tripSummary.issues')}>
        {issues.length === 0 ? (
          <AppText color={colors.text2}>{t('driver.tripSummary.noIssues')}</AppText>
        ) : (
          <View style={[styles.list, styles.issues]}>
            {issues.map((issue, index) => (
              <View key={`${issue.stop}-${issue.item?.id ?? 'stop'}-${index}`} style={[styles.issue, index === issues.length - 1 && styles.last]}>
                <View style={styles.line}>
                  <TriangleAlert color={badgeTones.warning.fg} size={16} strokeWidth={1.5} />
                  <AppText variant="label" color={badgeTones.warning.fg}>
                    {t(`common.deliveryIssueKinds.${issue.kind}`)}
                  </AppText>
                </View>
                <AppText style={styles.code}>
                  {issue.item === undefined ? t('driver.tripSummary.wholeStop', { stop: issue.stop }) : t('driver.tripSummary.issueWhere', { id: issue.item.id, stop: issue.stop })}
                </AppText>
                {issue.item === undefined || issue.item.name === '' ? null : <AppText color={colors.text2}>{issue.item.name}</AppText>}
                {issue.note === '' ? null : <AppText>{issue.note}</AppText>}
              </View>
            ))}
          </View>
        )}
      </Section>

      {stops.length === 0 ? null : (
        <Section title={t('driver.tripSummary.stopsTitle')}>
          <View style={styles.list}>
            {stops.map((stop, index) => {
              const line =
                stop.kind === 'PICKUP'
                  ? t('driver.stopKinds.PICKUP')
                  : stop.completedAt !== undefined
                    ? t('driver.tripSummary.stopLine', { time: format.time(stop.completedAt), count: stop.delivered })
                    : t('driver.stopList.state.waiting')
              const issuesLine = stop.issues > 0 ? t('driver.myTrips.issues', { count: stop.issues }) : undefined
              const done = stop.completedAt !== undefined
              return (
                <View
                  key={stop.number}
                  accessible
                  accessibilityLabel={[t('common.stop', { number: stop.number }), stop.name, line, ...(issuesLine === undefined ? [] : [issuesLine]), ...(done ? [t('driver.stopList.state.done')] : [])].join(', ')}
                  style={[styles.stop, index === stops.length - 1 && styles.last]}>
                  <StopDot number={stop.number} />
                  <View style={styles.flex}>
                    <AppText variant="label">{stop.name}</AppText>
                    <AppText color={colors.text2}>
                      {line}
                      {issuesLine === undefined ? null : <AppText variant="label" color={badgeTones.warning.fg}>{` · ${issuesLine}`}</AppText>}
                    </AppText>
                  </View>
                  {done ? <CircleCheck color={badgeTones.success.fg} size={24} strokeWidth={1.5} /> : null}
                </View>
              )
            })}
          </View>
        </Section>
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  )
}

/** Ô số của tổng kết; `warn` tô hổ phách khi ô nói về sự cố và có sự cố (chữ vẫn nói đủ, màu chỉ nhấn). */
function Fact({ label, value, warn = false, small = false }: { label: string; value: string; warn?: boolean; small?: boolean }) {
  return (
    <View style={[styles.fact, warn && styles.factWarn]} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText color={warn ? badgeTones.warning.fg : colors.text2}>{label}</AppText>
      <AppText variant={small ? 'label' : 'display'} color={warn ? badgeTones.warning.fg : colors.text} style={styles.figure}>
        {value}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  fact: { flexGrow: 1, flexBasis: '40%', gap: space[1], padding: space[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, ...shadow.card },
  factWarn: { borderColor: badgeTones.warning.border, backgroundColor: badgeTones.warning.bg },
  figure: { fontVariant: ['tabular-nums'] },
  section: { gap: space[2] },
  list: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, ...shadow.card },
  issues: { borderColor: badgeTones.warning.border, backgroundColor: badgeTones.warning.bg },
  issue: { gap: space[1], paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: badgeTones.warning.border },
  stop: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[2], borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  last: { borderBottomWidth: 0 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
})
