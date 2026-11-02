import { ChevronRight } from 'lucide-react-native'
import { memo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Chip, MockResultTag } from '@/components/Chip'
import { useFormat, useT } from '@/lib/i18n'
import { colors, radius, shadow, space } from '@/theme/tokens'

import type { LiveMonitoring, MonitoringTrip } from './monitoring-api'
import { DeadlineChip, SourceTag } from './monitoring-chips'
import { tripSummary } from './monitoring-view'

type MonitoringTripCardProps = {
  trip: MonitoringTrip
  /** Lần đọc giám sát mới nhất của chuyến; `undefined` khi lần đọc của cả đội xe chưa có chuyến này. */
  live: LiveMonitoring | undefined
  /** Số yêu cầu nhận hàng dọc đường còn chờ duyệt. */
  pendingPickups: number
  onOpen: (tripId: string) => void
}

/**
 * Một chuyến Đang vận chuyển của tab Giám sát (như một dòng của `MonitoringTripList` web, không bản đồ): mã và tên tuyến, xe · tài xế,
 * vị trí xe kèm nguồn ("Mô phỏng" / "GPS") và giờ của điểm vị trí, điểm tiếp kèm giờ đến, mức hạn xấu nhất bằng chữ, số sự cố chưa xử lý,
 * số yêu cầu nhận hàng chờ duyệt. Giờ đến tính từ vị trí xe là kết quả mock nên thẻ mang MOCK RESULT dưới dòng vị trí (bản web đặt nhãn
 * ở dòng vị trí trên bản đồ). Cả thẻ là một nút mở màn giám sát chuyến. `memo`: lần đọc mới chỉ vẽ lại thẻ của chuyến có điều gì đổi.
 */
export const MonitoringTripCard = memo(function MonitoringTripCard({ trip, live, pendingPickups, onOpen }: MonitoringTripCardProps) {
  const t = useT()
  const format = useFormat()
  const { next, worst, activeExceptions } = tripSummary(trip, live)
  const location = live?.location ?? null
  const driver = trip.driverName === null ? t('monitoring.list.noDriver') : t('monitoring.list.driver', { name: trip.driverName })
  const vehicleLine = trip.vehicleName === '' ? driver : `${trip.vehicleName} · ${driver}`
  const position =
    location === null
      ? t('liveTrip.card.noPosition')
      : location.speedKmh > 0
        ? t('monitoring.location.moving', { time: format.time(location.recordedAt), speed: format.integer(location.speedKmh) })
        : t('monitoring.location.standing', { time: format.time(location.recordedAt) })
  const stopLine =
    next === null
      ? t('monitoring.list.noStop')
      : [
          t(next.arrived ? 'monitoring.list.atStop' : 'monitoring.list.nextStop', { number: format.integer(next.number), name: next.name }),
          t(next.arrived ? 'monitoring.list.arrived' : 'monitoring.list.eta', { time: format.time(next.eta) }),
        ].join(' · ')
  const incidents = activeExceptions > 0 ? t('monitoring.list.incidents', { count: activeExceptions }) : null
  const pickups = pendingPickups > 0 ? t('liveTrip.card.pendingPickups', { count: pendingPickups }) : null
  const worstLabel = worst === null ? t('monitoring.list.noDeadline') : t(`common.deadlineStatuses.${worst}`)
  const source = location === null ? null : t(`monitoring.location.sources.${location.source}`)
  const spoken = [
    trip.tripId,
    ...(trip.name === '' ? [] : [trip.name]),
    vehicleLine,
    ...(source === null ? [] : [source]),
    position,
    stopLine,
    worstLabel,
    ...(incidents === null ? [] : [incidents]),
    ...(pickups === null ? [] : [pickups]),
  ].join(', ')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={t('liveTrip.card.openHint', { id: trip.tripId })}
      onPress={() => onOpen(trip.tripId)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.body}>
        <AppText variant="label" color={colors.text2} style={styles.code}>
          {trip.tripId}
        </AppText>
        {trip.name === '' ? null : <AppText variant="heading">{trip.name}</AppText>}
        <AppText color={colors.text2}>{vehicleLine}</AppText>
        <View style={styles.row}>
          {location === null ? null : <SourceTag source={location.source} />}
          <AppText color={colors.text2} style={styles.shrink}>
            {position}
          </AppText>
        </View>
        {live?.isMockResult === true && location !== null ? <MockResultTag /> : null}
        <AppText>{stopLine}</AppText>
        <View style={styles.row}>
          <DeadlineChip status={worst} />
          {incidents === null ? null : <Chip tone="warning" label={incidents} />}
          {pickups === null ? null : <Chip tone="cyan" label={pickups} />}
        </View>
      </View>
      <ChevronRight color={colors.text3} size={24} strokeWidth={1.5} />
    </Pressable>
  )
})

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    ...shadow.card,
  },
  pressed: { backgroundColor: colors.surface },
  body: { flex: 1, minWidth: 0, gap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[2] },
  shrink: { flexShrink: 1 },
})
