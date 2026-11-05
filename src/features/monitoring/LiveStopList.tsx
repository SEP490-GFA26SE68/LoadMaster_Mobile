import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { Chip, MockResultTag } from '@/components/Chip'
import { StopDot } from '@/components/StopDot'
import { useFormat, useT } from '@/lib/i18n'
import type { TripLiveStop } from '@/lib/mock-db'
import { colors, space } from '@/theme/tokens'

import type { LiveMonitoring, MonitoringStop, MonitoringTrip } from './monitoring-api'
import { DeadlineChip } from './monitoring-chips'
import { useMoment } from './useMoment'

/**
 * "Giờ đến từng điểm" của màn giám sát một chuyến (bảng điểm của `MonitoringTripPanel` web, thành danh sách trên điện thoại): mọi điểm theo
 * thứ tự tuyến, số điểm trên màu của điểm kèm tên, nhãn "Nhận hàng" cho điểm nhận dọc đường; mỗi điểm một dòng giờ — đã giao xong, đã đến,
 * dự kiến đến (tính từ vị trí xe, MOCK RESULT) — và với điểm chưa giao: hạn giao kèm mức hạn bằng chữ. Trình đọc màn hình đọc mỗi điểm một lần.
 */
export function LiveStopList({ trip, live }: { trip: MonitoringTrip; live: LiveMonitoring }) {
  const t = useT()
  const etaOf = new Map(live.stops.map((stop) => [stop.stopId, stop]))
  return (
    <Card>
      <View style={styles.head}>
        <AppText variant="heading" accessibilityRole="header" style={styles.flex}>
          {t('monitoring.panel.stops.title')}
        </AppText>
        {live.isMockResult && live.stops.length > 0 ? <MockResultTag /> : null}
      </View>
      <View>
        {trip.stops.map((stop, index) => (
          <StopRow key={stop.id} stop={stop} eta={etaOf.get(stop.id)} divider={index > 0} />
        ))}
      </View>
    </Card>
  )
}

function StopRow({ stop, eta, divider }: { stop: MonitoringStop; eta: TripLiveStop | undefined; divider: boolean }) {
  const t = useT()
  const format = useFormat()
  const moment = useMoment()
  const done = stop.completedAt !== undefined
  const name = `${t('common.stop', { number: stop.number })} · ${stop.name}`
  const pickup = stop.kind === 'PICKUP' ? t('trips.route.pickupTag') : null
  const time =
    stop.completedAt !== undefined
      ? t('monitoring.panel.stops.completed', { time: format.time(stop.completedAt) })
      : eta === undefined
        ? t('liveTrip.stops.noEta')
        : eta.arrived
          ? t('monitoring.panel.stops.arrived', { time: format.time(eta.eta) })
          : t('monitoring.list.eta', { time: moment(eta.eta) })
  // Hạn chỉ đọc được từ giờ đến của điểm chưa giao: điểm đã giao xong, hay chưa có giờ đến, thì không có dòng hạn
  const deadline =
    done || eta === undefined
      ? null
      : eta.deadline === undefined
        ? t('monitoring.panel.stops.noDeadline')
        : t('monitoring.escalations.deadline', { time: moment(eta.deadline) })
  const status = done ? undefined : eta?.deadlineStatus
  const label = [name, pickup, time, deadline, status === undefined ? null : t(`common.deadlineStatuses.${status}`)].filter((part) => part !== null).join(', ')

  return (
    <View style={[styles.row, divider && styles.divider]} accessible accessibilityLabel={label}>
      <StopDot number={stop.number} />
      <View style={styles.body}>
        <AppText variant="label">{stop.name}</AppText>
        {pickup === null ? null : (
          <View style={styles.chips}>
            <Chip tone="azure" label={pickup} />
          </View>
        )}
        <AppText color={done ? colors.success : colors.text}>{time}</AppText>
        {deadline === null ? null : <AppText color={colors.text2}>{deadline}</AppText>}
        {status === undefined ? null : (
          <View style={styles.chips}>
            <DeadlineChip status={status} />
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingVertical: space[3] },
  divider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  body: { flex: 1, minWidth: 0, gap: space[1] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
})
