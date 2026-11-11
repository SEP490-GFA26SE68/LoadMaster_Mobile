import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { TripStatusChip } from '@/components/TripStatus'
import { useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { ServerTripDetail } from '../trips-model'

/**
 * Phần dưới tiêu đề của Chi tiết chuyến khi chuyến đọc từ máy chủ (như dải `PageHero` của `BackendTripDetailPage` web): tên chuyến, chip
 * trạng thái, rồi dòng "Xuất phát 08:00 24/09/2026 · xe · tài xế · số kiện". Máy chủ không trả phương án hay tiến độ kho nên không có dòng
 * phụ nào dưới chip.
 */
export function ServerSummaryBand({ detail }: { detail: ServerTripDetail }) {
  const t = useT()
  const format = useFormat()
  const { departureAt } = detail
  const meta = [
    departureAt === null
      ? t('officeServer.trips.noDeparture')
      : t('officeServer.trips.departure', { time: format.time(departureAt), date: format.date(departureAt) }),
    detail.vehicleName === '' ? t('officeServer.trips.noVehicle') : detail.vehicleName,
    detail.driverName === null ? t('trips.detail.noDriver') : `${t('trips.detail.driver')} ${detail.driverName}`,
    t('companyTrips.packageCount', { count: detail.packageCount }),
  ].join(' · ')
  return (
    <View style={styles.band}>
      <AppText variant="heading" color={colors.skyText}>
        {detail.name}
      </AppText>
      <View style={styles.chips}>
        <TripStatusChip status={detail.status} />
      </View>
      <AppText color={colors.skyText2}>{meta}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  band: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
})
