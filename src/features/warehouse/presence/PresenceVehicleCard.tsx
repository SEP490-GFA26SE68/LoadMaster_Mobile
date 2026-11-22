import { History, Truck } from 'lucide-react-native'
import { memo } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { checkInBlocker, isHere, presenceLabel, presenceTone } from './presence-label'
import type { PresenceVehicle } from './presence-model'

type PresenceVehicleCardProps = {
  readonly vehicle: PresenceVehicle
  readonly warehouseId: string
  readonly onCheckIn: (vehicle: PresenceVehicle) => void
  readonly onHistory: (vehicle: PresenceVehicle) => void
}

/**
 * Một xe của danh sách "Xe ở kho": biển số, tên xe, chip có mặt (so với kho đang xem) và chip trạng thái xe khi xe không sẵn sàng, chuyến
 * đang xếp ở kho này, lần ghi nhận gần nhất. Hai nút phụ 56: "Ghi nhận có ở kho" (không có khi xe đã ở kho này; mờ kèm lý do ngay dưới nút
 * khi máy chủ sẽ từ chối) và "Lịch sử".
 */
export const PresenceVehicleCard = memo(function PresenceVehicleCard({ vehicle, warehouseId, onCheckIn, onHistory }: PresenceVehicleCardProps) {
  const t = useT()
  const format = useFormat()
  const here = isHere(vehicle, warehouseId)
  const blocker = here ? null : checkInBlocker(t, vehicle, warehouseId)
  const observed =
    vehicle.observedAt === null
      ? null
      : vehicle.actorName === null
        ? t('vehiclePresence.observedNoActor', { time: `${format.time(vehicle.observedAt)} ${format.date(vehicle.observedAt)}` })
        : t('vehiclePresence.observed', { time: `${format.time(vehicle.observedAt)} ${format.date(vehicle.observedAt)}`, name: vehicle.actorName })

  return (
    <Card>
      <View style={styles.head}>
        <Truck color={colors.text2} size={24} strokeWidth={1.5} />
        <View style={styles.flex}>
          <AppText variant="heading">{vehicle.licensePlate}</AppText>
          {vehicle.name === null ? null : <AppText color={colors.text2}>{vehicle.name}</AppText>}
        </View>
      </View>
      <View style={styles.chips}>
        <Chip tone={presenceTone(vehicle, warehouseId)} label={presenceLabel(t, vehicle, warehouseId)} />
        {vehicle.state === 'AVAILABLE' ? null : (
          <Chip tone={vehicle.state === 'IN_TRIP' ? 'azure' : 'neutral'} label={t(`vehiclePresence.state.${vehicle.state}`)} />
        )}
      </View>
      {vehicle.loadingTripCode === null ? null : <AppText>{t('vehiclePresence.loadingTrip', { code: vehicle.loadingTripCode })}</AppText>}
      {vehicle.transferring ? <AppText color={colors.warning}>{t('vehiclePresence.transferring')}</AppText> : null}
      {observed === null ? null : <AppText color={colors.text3}>{observed}</AppText>}
      {here ? null : (
        <>
          <Button write variant="secondary" icon={Truck} disabled={blocker !== null} accessibilityHint={blocker ?? undefined} onPress={() => onCheckIn(vehicle)}>
            {t('vehiclePresence.checkIn')}
          </Button>
          {blocker === null ? null : (
            <AppText color={colors.text2} importantForAccessibility="no" accessibilityElementsHidden>
              {blocker}
            </AppText>
          )}
        </>
      )}
      <Button variant="secondary" icon={History} onPress={() => onHistory(vehicle)}>
        {t('vehiclePresence.history')}
      </Button>
    </Card>
  )
})

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  flex: { flex: 1 },
})
