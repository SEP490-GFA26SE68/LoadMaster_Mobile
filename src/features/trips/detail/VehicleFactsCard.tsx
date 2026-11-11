import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { FullTripDetail } from '../trips-model'

/**
 * Mục "Phương tiện" của Chi tiết chuyến (như `VehicleCard` của web, chỉ đọc): xe kèm biển số, tài xế kèm số điện thoại, lòng thùng,
 * cửa, số vật cản. Không có "Đổi xe": trên điện thoại không sửa chuyến. Tài khoản tài xế không còn trong kho thì hiện mã như web.
 */
export function VehicleFactsCard({ detail }: { detail: FullTripDetail }) {
  const t = useT()
  const format = useFormat()
  const { trip, vehicle, driver } = detail
  const driverText =
    trip.driverId === null
      ? t('trips.vehicleCard.unassigned')
      : driver?.phone
        ? t('trips.vehicleCard.driverPhone', { name: driver.fullName, phone: driver.phone })
        : (driver?.fullName ?? trip.driverId)
  const rows = [
    { key: 'vehicle', label: t('trips.vehicleCard.vehicle'), value: vehicle.name },
    { key: 'driver', label: t('trips.vehicleCard.driver'), value: driverText },
    { key: 'space', label: t('trips.vehicleCard.cargoSpace'), value: format.dimensions(vehicle.innerLengthCm, vehicle.innerWidthCm, vehicle.innerHeightCm) },
    { key: 'door', label: t('trips.vehicleCard.door'), value: format.widthByHeight(vehicle.doorWidthCm, vehicle.doorHeightCm) },
    { key: 'obstacles', label: t('trips.vehicleCard.obstacles'), value: format.integer(vehicle.obstacles.length) },
  ]
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        {t('trips.vehicle')}
      </AppText>
      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.key} accessible accessibilityLabel={`${row.label}: ${row.value}`} style={styles.row}>
            <AppText color={colors.text3}>{row.label}</AppText>
            <AppText variant="label" style={styles.value}>
              {row.value}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  rows: { gap: space[2] },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: space[3] },
  value: { flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
})
