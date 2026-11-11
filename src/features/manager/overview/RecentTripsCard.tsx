import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { TripStatusChip, TripSubStatusTag } from '@/components/TripStatus'
import { tripDetailPath } from '@/features/trips/trip-routes'
import { calendarDate } from '@/lib/calendar-date'
import { useFormat, useT, type TFunction } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'
import type { TripSubStatus } from '@/types/trip'

import type { DashboardTripView } from '../dashboard-summary'

/** Số chuyến hiện trong thẻ, như bảng của web. */
export const RECENT_TRIP_LIMIT = 10

/**
 * "Chuyến trong kỳ" (bảng của web thành danh sách thẻ trên điện thoại): tối đa mười chuyến có ngày chạy gần nhất — tên, mã, trạng thái và
 * dòng phụ, ngày chạy, xe, số kiện, lấp đầy của bản duyệt, khối lượng đã giao ("—" khi chưa có số). Chạm một chuyến mở Chi tiết chuyến.
 * Cột "Phương án" của web (mở Planner) không có: mobile không có Planner. Máy chủ không trả dòng phụ, số kiện, khối lượng đã giao: thẻ bỏ
 * hẳn phần đó, không vẽ 0. Số đầu thẻ là số chuyến của kỳ (`total`) — máy chủ chỉ trả các chuyến gần nhất. Màn chuyến đọc nguồn khác
 * (`linked` tắt) thì dòng chỉ để đọc: mã chuyến của nguồn này không mở được ở đó.
 */
export function RecentTripsCard({ trips, total, linked }: { trips: readonly DashboardTripView[]; total: number; linked: boolean }) {
  const t = useT()
  return (
    <Card>
      <View style={styles.head}>
        <AppText variant="heading" accessibilityRole="header">
          {t('manager.recent.title')}
        </AppText>
        <AppText color={colors.text2} style={styles.number}>
          {t('manager.recent.count', { count: total })}
        </AppText>
      </View>
      <AppText color={colors.text3}>{t('manager.recent.subtitle', { count: RECENT_TRIP_LIMIT })}</AppText>
      {trips.slice(0, RECENT_TRIP_LIMIT).map((trip) => (
        <RecentTrip key={trip.id} trip={trip} linked={linked} />
      ))}
    </Card>
  )
}

function RecentTrip({ trip, linked }: { trip: DashboardTripView; linked: boolean }) {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
  const noValue = t('manager.noValue')
  const { packageCount, deliveredWeightKg } = trip
  const facts = [
    { key: 'date', label: t('manager.recent.date'), value: format.date(calendarDate(trip.scheduledDate)) },
    ...(packageCount === undefined ? [] : [{ key: 'packages', label: t('manager.recent.packages'), value: format.integer(packageCount) }]),
    { key: 'volume', label: t('manager.recent.volume'), value: trip.volumePercent === null ? noValue : format.percent(trip.volumePercent) },
    ...(deliveredWeightKg === undefined
      ? []
      : [{ key: 'delivered', label: t('manager.recent.delivered'), value: deliveredWeightKg > 0 ? format.weight(deliveredWeightKg) : noValue }]),
  ]
  // Kho mẫu ghi mã xe khi xe không còn trong kho (`dashboard-summary.ts`); máy chủ không trả xe thì "—"
  const vehicle = trip.vehicleName === '' ? noValue : trip.vehicleName
  const sub = trip.sub ?? null
  const spoken = [
    trip.name,
    trip.id,
    t(`status.${trip.status}`),
    ...(sub === null ? [] : [subLabel(sub, t)]),
    `${t('manager.recent.vehicle')}: ${vehicle}`,
    ...facts.map((fact) => `${fact.label}: ${fact.value}`),
  ].join(', ')
  const body = (
    <View style={styles.body}>
      <AppText variant="label">{trip.name}</AppText>
      <AppText color={colors.text3} style={styles.number}>
        {trip.id}
      </AppText>
      <View style={styles.chips}>
        <TripStatusChip status={trip.status} />
        {sub === null ? null : <TripSubStatusTag sub={sub} />}
      </View>
      <AppText color={colors.text2}>{vehicle}</AppText>
      <View style={styles.facts}>
        {facts.map((fact) => (
          <View key={fact.key} style={styles.fact}>
            <AppText color={colors.text3}>{fact.label}</AppText>
            <AppText variant="label" style={styles.number}>
              {fact.value}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  )
  if (!linked) {
    return (
      <View accessible accessibilityLabel={spoken} style={styles.trip}>
        {body}
      </View>
    )
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={t('companyTrips.list.openHint')}
      onPress={() => router.push(tripDetailPath(trip.id))}
      style={({ pressed }) => [styles.trip, pressed && styles.pressed]}>
      {body}
      <ChevronRight color={colors.text3} size={20} strokeWidth={1.5} />
    </Pressable>
  )
}

/** Chữ của dòng phụ, như `TripSubStatusTag` vẽ — để ghép vào tên đọc của dòng. */
function subLabel(sub: TripSubStatus, t: TFunction): string {
  if (sub.kind === 'staging' || sub.kind === 'loading') return t(`status.sub.${sub.kind}`, { recorded: sub.recorded, total: sub.total })
  if (sub.kind === 'manualPending') return t('status.sub.manualPending', { count: sub.count })
  return t(`status.sub.${sub.kind}`)
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: space[3] },
  trip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 56,
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    borderRadius: radius.sm,
  },
  pressed: { backgroundColor: colors.surface },
  body: { flex: 1, gap: space[1] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingVertical: space[1] },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[4], rowGap: space[2], paddingTop: space[1] },
  fact: { flexGrow: 1, flexBasis: '40%', minWidth: 0 },
  number: { fontVariant: ['tabular-nums'] },
})
