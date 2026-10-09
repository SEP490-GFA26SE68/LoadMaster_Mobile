import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { TripStatusChip, TripSubStatusTag } from '@/components/TripStatus'
import { useFormat, useT } from '@/lib/i18n'
import { colors, radius, shadow, space } from '@/theme/tokens'

import type { MyTripRow } from './my-trips'

/** Một chuyến trong "Chuyến của tôi". Mọi số trên thẻ lấy từ chuyến và phương án của nó. */
export function TripCard({ trip }: { trip: MyTripRow }) {
  const t = useT()
  const format = useFormat()
  const facts = [
    format.date(trip.scheduledDate),
    t('driver.myTrips.stops', { count: trip.stopCount }),
    t('driver.myTrips.packages', { count: trip.packageCount }),
  ]

  return (
    <View style={styles.card} accessible accessibilityLabel={`${trip.name}, ${t(`status.${trip.status}`)}`}>
      <View style={styles.head}>
        <AppText variant="meta" color={colors.text3} style={styles.code}>
          {trip.id}
        </AppText>
        <TripStatusChip status={trip.status} />
      </View>
      <AppText variant="heading">{trip.name}</AppText>
      <AppText color={colors.text2}>{trip.vehicleName}</AppText>
      <AppText color={colors.text2}>{facts.join(' · ')}</AppText>
      {(trip.sub !== null || trip.manualSub !== null) && (
        <View style={styles.tags}>
          {trip.sub !== null && <TripSubStatusTag sub={trip.sub} />}
          {trip.manualSub !== null && <TripSubStatusTag sub={trip.manualSub} />}
        </View>
      )}
      {trip.currentStop !== undefined && <AppText variant="label">{t('driver.myTrips.currentStop', { number: trip.currentStop })}</AppText>}
      {trip.completedAt !== undefined && (
        <AppText color={colors.text2}>{t('driver.myTrips.completedAt', { time: format.time(trip.completedAt), date: format.date(trip.completedAt) })}</AppText>
      )}
      {trip.issueCount > 0 && <AppText color={colors.warning}>{t('driver.myTrips.issues', { count: trip.issueCount })}</AppText>}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: space[1], padding: space[4], borderRadius: radius.lg, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  code: { fontVariant: ['tabular-nums'] },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[1] },
})
