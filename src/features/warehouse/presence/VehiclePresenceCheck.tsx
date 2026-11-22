import { CircleCheck, Truck } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { isHere, presenceLabel } from './presence-label'
import { useConfirmLoadingPresence, useTripVehiclePresence } from './usePresenceQueries'

type VehiclePresenceCheckProps = {
  /** Mã số chuyến của máy chủ (mã của phiên). */
  readonly tripId: string
  /** Biển số xe của chuyến; `null` (máy chủ không trả) thì không có khối này. */
  readonly licensePlate: string | null
}

/**
 * Khối "Xe ở kho xuất phát" trong phiên xếp của máy chủ: máy chủ chỉ cho tài xế xuất phát khi xe của chuyến đã được kho ghi nhận có mặt ở
 * kho xuất phát (`DRIVER_VEHICLE_PRESENCE_UNVERIFIED`). Tìm xe bằng biển số ở các kho nhân viên được phân công, đúng xe đang xếp cho chuyến
 * này (`loadingTripId`). Đã ghi nhận ở kho đó: một dòng xác nhận. Chưa ghi nhận: nút phụ "Xác nhận xe có ở kho" (máy chủ chỉ nhận khi xe còn
 * "Chưa ghi nhận"). Trạng thái khác (đang trên đường, ở kho khác): máy chủ không cho kho xác nhận trong phiên, nên chỉ có câu nhờ điều phối
 * viên. Không tìm thấy xe (máy chủ cũ, kho không phụ trách chuyến) thì không vẽ gì; lỗi đọc là dải cảnh báo kèm nút thử lại.
 */
export function VehiclePresenceCheck({ tripId, licensePlate }: VehiclePresenceCheckProps) {
  const t = useT()
  const query = useTripVehiclePresence(tripId, licensePlate)
  const confirm = useConfirmLoadingPresence(tripId)
  const [failure, setFailure] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  if (licensePlate === null) return null
  if (query.isError) {
    return (
      <Card>
        <Banner tone="warning">{t('vehiclePresence.session.failed', { reason: dataErrorMessage(query.error, t) })}</Banner>
        <Button variant="secondary" loading={query.isFetching} onPress={() => void query.refetch()}>
          {t('vehiclePresence.session.retry')}
        </Button>
      </Card>
    )
  }
  const found = query.data
  if (found === undefined || found === null) return null
  const { warehouse, vehicle } = found
  const names = { plate: vehicle.licensePlate, warehouse: warehouse.name }

  async function handleConfirm() {
    setFailure(null)
    try {
      await confirm.mutateAsync({ warehouseId: warehouse.id, vehicleId: vehicle.id })
      setConfirmed(true)
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  }

  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        {t('vehiclePresence.session.title')}
      </AppText>
      {isHere(vehicle, warehouse.id) ? (
        confirmed ? (
          <Banner tone="success">{t('vehiclePresence.session.confirmed', names)}</Banner>
        ) : (
          <View style={styles.line}>
            <CircleCheck color={colors.success} size={24} strokeWidth={1.5} />
            <AppText style={styles.flex}>{t('vehiclePresence.session.here', names)}</AppText>
          </View>
        )
      ) : vehicle.presence === 'UNKNOWN' ? (
        <>
          <View style={styles.line}>
            <Truck color={colors.warning} size={24} strokeWidth={1.5} />
            <AppText style={styles.flex}>{t('vehiclePresence.session.unknown', names)}</AppText>
          </View>
          {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
          <Button write variant="secondary" icon={Truck} loading={confirm.isPending} onPress={() => void handleConfirm()}>
            {t('vehiclePresence.session.confirm')}
          </Button>
        </>
      ) : (
        <Banner tone="warning">{t('vehiclePresence.session.blocked', { ...names, presence: presenceLabel(t, vehicle, warehouse.id) })}</Banner>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  flex: { flex: 1 },
})
