import { Clock, Warehouse } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { Chip, MockResultTag } from '@/components/Chip'
import { useCan } from '@/features/auth/AuthProvider'
import { useFormat, useT } from '@/lib/i18n'
import { vnClock, type TripEta } from '@/lib/mock-db'
import { colors, palette, radius, space } from '@/theme/tokens'

import { routeProgress, type RouteProgress } from '../trip-detail'
import { stopRows } from '../trip-summary'
import type { FullTripDetail } from '../trips-model'
import { durationLabel, stopStates } from './route-view'
import { StopItem } from './StopItem'

/**
 * Sơ đồ tuyến của Chi tiết chuyến (như `TripRouteCard` + `RoutePlanBar` + `RouteDiagram` của web, xếp dọc cho điện thoại): kho xuất phát
 * rồi các điểm theo thứ tự đi. Xe chưa rời kho: đầu thẻ là thanh tuyến — tuyến đã tối ưu thì **MOCK RESULT**, quãng đường · thời gian,
 * giờ nghỉ bắt buộc, số điểm trễ hạn và câu nói giờ đến là ước lượng; mỗi điểm có giờ đến dự kiến và mức hạn (`getTripEta`). Xe đã rời
 * kho: đầu thẻ là số tổng hợp của việc giao (điểm đã giao, kiện đã dỡ, sự cố, giờ xuất phát), mỗi điểm có trạng thái giao; giờ đến tính
 * từ vị trí xe nằm ở màn Giám sát chuyến. Không bản đồ, không nút tối ưu tuyến (màn chỉ đọc).
 */
export function RouteCard({ detail }: { detail: FullTripDetail }) {
  const t = useT()
  const can = useCan()
  const { trip, eta } = detail
  const stops = useMemo(() => stopRows(trip.stops, trip.packages), [trip.stops, trip.packages])
  const { delivery } = trip
  const departed = delivery !== undefined && (trip.phase === 'delivering' || trip.phase === 'completed')
  const progress = useMemo(() => (departed && delivery ? routeProgress(stops, delivery) : null), [departed, delivery, stops])
  const states = progress && delivery ? stopStates(stops, delivery, progress) : null
  // Xe chưa rời kho: giờ đến của tuyến đã tối ưu. Đã rời kho: chỉ còn tiến độ giao thật
  const etas = useMemo(() => new Map((departed ? [] : (eta?.stops ?? [])).map((stop) => [stop.stopId, stop])), [departed, eta])
  const planning = trip.phase === 'planning'

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="heading" accessibilityRole="header">
          {t('trips.route.title')}
        </AppText>
        <AppText color={colors.text3}>{t('trips.route.count', { count: stops.length })}</AppText>
      </View>
      {progress ? <DeliverySummary progress={progress} /> : <PlanBar eta={eta} stopCount={stops.length} />}
      {progress && trip.phase === 'delivering' && can('monitoring.view') ? <AppText color={colors.text3}>{t('companyTrips.detail.liveEta')}</AppText> : null}
      <View style={styles.list}>
        <DepotRow name={trip.depot.name} departedAt={progress?.departedAt} departure={vnClock(new Date(trip.departureAt))} />
        {stops.map((stop, index) => (
          <StopItem
            key={stop.id}
            stop={stop}
            total={stops.length}
            state={states?.[index]}
            eta={etas.get(stop.id)}
            missingCoordinates={planning && (stop.lat === undefined || stop.lng === undefined)}
          />
        ))}
      </View>
    </Card>
  )
}

/** Thanh tuyến khi xe chưa rời kho: tuyến đã tối ưu (số của mock), hoặc một câu nói vì sao chưa có giờ đến. */
function PlanBar({ eta, stopCount }: { eta: TripEta | null; stopCount: number }) {
  const t = useT()
  const format = useFormat()
  if (!eta) {
    return <AppText color={colors.text3}>{t(stopCount === 0 ? 'trips.routePlan.noStops' : 'companyTrips.detail.routeNotOptimized')}</AppText>
  }
  const late = eta.missedStopIds.length
  return (
    <View style={styles.plan}>
      <View style={styles.line}>
        <AppText variant="label">{t('trips.routePlan.optimized')}</AppText>
        {eta.isMockResult ? <MockResultTag /> : null}
      </View>
      <AppText color={colors.text2} style={styles.number}>
        {t('trips.routePlan.summary', { km: format.decimal(eta.totalKm), duration: durationLabel(eta.totalMinutes, t, format) })}
      </AppText>
      {eta.restCount ? (
        <AppText color={colors.text3} style={styles.number}>
          {t('trips.routePlan.rests', { count: eta.restCount, duration: durationLabel(eta.restMinutes ?? 0, t, format) })}
        </AppText>
      ) : null}
      {late > 0 ? <Chip tone="danger" label={t('trips.routePlan.late', { count: late })} /> : null}
      <AppText color={colors.text3}>{t('trips.routePlan.basis')}</AppText>
    </View>
  )
}

/** Số tổng hợp của việc giao (như đầu sơ đồ tuyến của web khi chuyến đang giao / đã giao): mỗi số một dòng "nhãn — giá trị". */
function DeliverySummary({ progress }: { progress: RouteProgress }) {
  const t = useT()
  const format = useFormat()
  const n = format.integer
  const { stops, packages, issues, departedAt, completedAt } = progress
  const ratio = (done: number, total: number) => t('trips.route.summary.ratio', { done: n(done), total: n(total) })
  const items: { key: string; label: string; value: string; color?: string }[] = [
    {
      key: 'stops',
      label: t('trips.route.summary.stops'),
      value: `${ratio(stops.done, stops.total)} ${t('trips.route.summary.stopsUnit')}`,
      ...(stops.done === stops.total ? { color: colors.success } : {}),
    },
    { key: 'packages', label: t('trips.route.summary.packages'), value: `${ratio(packages.done, packages.total)} ${t('trips.route.summary.packagesUnit')}` },
    { key: 'issues', label: t('trips.route.summary.issues'), value: n(issues), ...(issues > 0 ? { color: colors.warning } : {}) },
    completedAt
      ? { key: 'window', label: t('trips.route.summary.window'), value: t('trips.route.summary.windowValue', { from: format.time(departedAt), to: format.time(completedAt) }) }
      : { key: 'departed', label: t('trips.route.summary.departed'), value: format.time(departedAt) },
  ]
  return (
    <View style={styles.summary}>
      {items.map((item) => (
        <View key={item.key} accessible accessibilityLabel={`${item.label}: ${item.value}`} style={styles.summaryItem}>
          <AppText color={colors.text3}>{item.label}</AppText>
          <AppText variant="label" color={item.color ?? colors.text} style={styles.number}>
            {item.value}
          </AppText>
        </View>
      ))}
    </View>
  )
}

/** Kho xuất phát ở đầu tuyến: tên kho và giờ xuất phát — giờ xe đã rời kho, hoặc giờ dự kiến (giờ Việt Nam). */
function DepotRow({ name, departedAt, departure }: { name: string; departedAt: string | undefined; departure: string }) {
  const t = useT()
  const format = useFormat()
  const time = departedAt ? t('trips.route.departed', { time: format.time(departedAt) }) : t('trips.route.plannedDeparture', { time: departure })
  return (
    <View accessible accessibilityLabel={[t('trips.route.depot'), name, time].join(', ')} style={styles.row}>
      <View style={styles.depotMark}>
        <Warehouse color={colors.text2} size={18} strokeWidth={1.5} />
      </View>
      <View style={styles.body}>
        <AppText variant="label">{t('trips.route.depot')}</AppText>
        <AppText color={colors.text3}>{name}</AppText>
        <View style={styles.line}>
          <Clock color={colors.text3} size={16} strokeWidth={1.75} />
          <AppText color={colors.text2} style={styles.number}>
            {time}
          </AppText>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { gap: space[1] },
  plan: { gap: space[1], paddingVertical: space[3], borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.lineSoft },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  summaryItem: {
    flexGrow: 1,
    flexBasis: 140,
    gap: 2,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: palette.neutral[50],
  },
  list: { gap: space[4] },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  body: { flex: 1, gap: space[1] },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[2], rowGap: space[1] },
  number: { fontVariant: ['tabular-nums'] },
  depotMark: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: palette.neutral[50],
  },
})
