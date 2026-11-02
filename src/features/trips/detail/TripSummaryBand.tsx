import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { TripStatusChip, TripSubStatusTag } from '@/components/TripStatus'
import { calendarDate } from '@/lib/calendar-date'
import { useFormat, useT } from '@/lib/i18n'
import { vnClock } from '@/lib/mock-db'
import { colors, space } from '@/theme/tokens'
import type { TripSubStatus } from '@/types/trip'

import type { TripDetail } from '../trips-model'

/**
 * Phần dưới tiêu đề của Chi tiết chuyến, vẫn trong dải trời (như dải `PageHero` của web): tên chuyến; chip trạng thái cùng các dòng phụ
 * (phương án, tiến độ kho, điểm trễ hạn, xác nhận tay chờ duyệt); rồi dòng "Ngày chạy 24/09/2026, xuất phát 08:00 · xe · tài xế" — giờ
 * xuất phát theo giờ Việt Nam. Mã chuyến là tiêu đề của màn.
 */
export function TripSummaryBand({ detail }: { detail: TripDetail }) {
  const t = useT()
  const format = useFormat()
  const { trip, vehicle, driver } = detail
  const subs = [detail.sub, detail.extraSub].filter((sub): sub is TripSubStatus => sub !== null)
  const meta = [
    `${t('trips.detail.runDate')} ${format.date(calendarDate(trip.scheduledDate))}${t('trips.detail.departsAt')} ${vnClock(new Date(trip.departureAt))}`,
    vehicle.name,
    trip.driverId === null ? t('trips.detail.noDriver') : `${t('trips.detail.driver')} ${driver?.fullName ?? trip.driverId}`,
  ].join(' · ')
  return (
    <View style={styles.band}>
      <AppText variant="heading" color={colors.skyText}>
        {trip.name}
      </AppText>
      <View style={styles.chips}>
        <TripStatusChip status={detail.status} />
        {subs.map((sub) => (
          <TripSubStatusTag key={sub.kind} sub={sub} />
        ))}
      </View>
      <AppText color={colors.skyText2}>{meta}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  band: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
})
