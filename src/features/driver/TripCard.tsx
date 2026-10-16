import { useRouter } from 'expo-router'
import { CircleCheck, Clock, TriangleAlert } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { StopDot } from '@/components/StopDot'
import { TripStatusChip, TripSubStatusTag } from '@/components/TripStatus'
import { calendarDate } from '@/lib/calendar-date'
import { useFormat, useT } from '@/lib/i18n'
import { badgeTones, colors, radius, space } from '@/theme/tokens'

import type { DriverTripRow } from './driver-model'
import { myTripGroup } from './my-trips'
import { EtaSourceLine, StopListTime } from './StopTimingParts'

/** Đường mở một chuyến ở màn điểm giao (hoặc tổng kết khi chuyến đã giao). */
export function tripPath(tripId: string) {
  return { pathname: '/trip/[tripId]', params: { tripId } } as const
}

/** Ngày chạy `YYYY-MM-DD` là ngày lịch; giờ xuất phát ISO giữ nguyên. */
function dayOf(value: string): Date | string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? calendarDate(value) : value
}

/**
 * Một chuyến ở "Chuyến của tôi" (như `MyTripCard` của web): mã và chip trạng thái trên một hàng (dòng phụ xuống hàng khi hết chỗ), tuyến
 * là tiêu đề, ngày chạy · số điểm · số kiện, xe, các điểm kèm giờ đến (chỉ nhóm đang vận chuyển và xếp xong) và một nút 56 rộng hết thẻ
 * theo nhóm. Chuyến kho đang soạn / xếp chỉ xem trước. Phần nguồn dữ liệu không có (tên tuyến, số kiện) thì bỏ hẳn, không điền số thay.
 */
export function TripCard({ trip, primary = false }: { trip: DriverTripRow; primary?: boolean }) {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
  const preparing = myTripGroup(trip) === 'preparing'
  const facts = [
    ...(trip.date === undefined ? [] : [format.date(dayOf(trip.date))]),
    t('driver.myTrips.stops', { count: trip.stopCount }),
    ...(trip.packageCount === undefined ? [] : [t('driver.myTrips.packages', { count: trip.packageCount })]),
  ]
  const action = preparing
    ? t('driver.myTrips.preview')
    : trip.status === 'IN_TRANSIT'
      ? t('driver.myTrips.resume')
      : trip.status === 'DELIVERED'
        ? t('driver.myTrips.viewSummary')
        : t('driver.myTrips.open')

  return (
    <Card>
      <View style={styles.head}>
        <AppText variant="label" style={styles.code}>
          {trip.code}
        </AppText>
        <TripStatusChip status={trip.status} />
        {trip.sub === null ? null : <TripSubStatusTag sub={trip.sub} />}
        {trip.manualSub === null ? null : <TripSubStatusTag sub={trip.manualSub} />}
      </View>
      {trip.name === undefined ? null : <AppText variant="heading">{trip.name}</AppText>}
      <AppText color={colors.text2}>{facts.join(' · ')}</AppText>
      {/* Tên xe có biển số: dòng riêng để biển số không bị ngắt. Backend không trả xe thì bỏ dòng */}
      {trip.vehicleName === '' ? null : <AppText color={colors.text3}>{trip.vehicleName}</AppText>}

      {trip.status === 'IN_TRANSIT' && trip.currentStop !== undefined ? (
        <AppText variant="label">{t('driver.myTrips.atStop', { number: trip.currentStop, total: trip.stopCount })}</AppText>
      ) : null}
      {trip.stops.length > 0 ? <TripStops trip={trip} /> : null}
      {trip.recheck > 0 ? (
        <View style={[styles.box, styles.danger]}>
          <TriangleAlert color={badgeTones.danger.fg} size={20} strokeWidth={1.5} style={styles.boxIcon} />
          <AppText variant="label" color={badgeTones.danger.fg} style={styles.boxText}>
            {t('driver.myTrips.recheck', { count: trip.recheck })}
          </AppText>
        </View>
      ) : null}
      {preparing ? (
        <View style={[styles.box, styles.neutral]}>
          <Clock color={colors.text2} size={20} strokeWidth={1.5} style={styles.boxIcon} />
          <AppText color={colors.text2} style={styles.boxText}>
            {t('driver.myTrips.waitingLoading')}
          </AppText>
        </View>
      ) : null}
      {trip.status === 'DELIVERED' && trip.completedAt !== undefined ? (
        <AppText color={colors.text2}>
          {t('driver.myTrips.completedAt', { time: format.time(trip.completedAt), date: format.date(trip.completedAt) })}
          {trip.issueCount > 0 ? (
            <AppText variant="label" color={badgeTones.warning.fg}>
              {' · '}
              {t('driver.myTrips.issues', { count: trip.issueCount })}
            </AppText>
          ) : null}
        </AppText>
      ) : null}

      <Button
        variant={primary ? 'primary' : 'secondary'}
        accessibilityLabel={t('driver.myTrips.openLabel', { action, tripId: trip.code })}
        onPress={() => router.push(tripPath(trip.id))}>
        {action}
      </Button>
    </Card>
  )
}

/**
 * Các điểm của chuyến trong thẻ (như `MyTripStops` của web): số điểm trên màu điểm giao, tên, số kiện của phương án — điểm nhận dọc đường
 * ghi loại điểm thay số kiện — và dấu kiểm kèm chữ cho điểm đã hoàn tất. Điểm chưa hoàn tất có dòng giờ đến; dưới danh sách một dòng nguồn
 * kèm MOCK RESULT. Trình đọc màn hình đọc mỗi điểm thành một câu.
 */
function TripStops({ trip }: { trip: DriverTripRow }) {
  const t = useT()
  return (
    <View style={styles.stops} accessibilityLabel={t('driver.myTrips.stopsLabel', { tripId: trip.code })}>
      {trip.stops.map((stop) => {
        const amount =
          stop.kind === 'PICKUP'
            ? t('driver.stopKinds.PICKUP')
            : stop.packageCount === undefined
              ? undefined
              : t('driver.myTrips.packages', { count: stop.packageCount })
        const spoken = [
          t('common.stop', { number: stop.number }),
          stop.name,
          ...(amount === undefined ? [] : [amount]),
          ...(stop.done ? [t('driver.stopList.state.done')] : []),
        ].join(', ')
        return (
          <View key={stop.number} style={styles.stop}>
            <View style={styles.stopRow} accessible accessibilityLabel={spoken}>
              <StopDot number={stop.number} />
              <AppText variant="label" style={styles.stopName}>
                {stop.name}
              </AppText>
              {amount === undefined ? null : <AppText color={colors.text2}>{amount}</AppText>}
              {stop.done ? <CircleCheck color={badgeTones.success.fg} size={20} strokeWidth={1.5} /> : null}
            </View>
            {stop.timing === undefined ? null : (
              <View style={styles.stopTime}>
                <StopListTime timing={stop.timing} />
              </View>
            )}
          </View>
        )
      })}
      <EtaSourceLine sources={trip.etaSources} />
    </View>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[3], rowGap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.md, borderWidth: 1 },
  danger: { backgroundColor: badgeTones.danger.bg, borderColor: badgeTones.danger.border },
  neutral: { backgroundColor: colors.surface, borderColor: colors.border },
  boxIcon: { marginTop: 2 },
  boxText: { flex: 1 },
  stops: { gap: space[2], paddingTop: space[2], borderTopWidth: 1, borderTopColor: colors.lineSoft },
  stop: { gap: space[1], paddingBottom: space[2], borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  stopRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: space[3] },
  stopName: { flex: 1, minWidth: 0 },
  // Dòng giờ thẳng mép với tên điểm (chấm số 32 + khe 12)
  stopTime: { paddingLeft: 44 },
})
