import { CircleCheck, Truck } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { ServerLoadingSession, ServerVehiclePresence } from '../warehouse-server-model'
import { isHere, presenceLabel } from './presence-label'
import { useConfirmLoadingPresence, usePresenceWarehouses, useTripVehiclePresence } from './usePresenceQueries'

type VehiclePresenceCheckProps = { readonly session: ServerLoadingSession }

/**
 * Khối "Xe ở kho xuất phát" trong phiên xếp của máy chủ: máy chủ chỉ cho tài xế xuất phát khi xe của chuyến đã được kho ghi nhận có mặt ở
 * kho xuất phát (`DRIVER_VEHICLE_PRESENCE_UNVERIFIED`). Phiên mang xe, kho xuất phát và nơi xe đang ở (`vehiclePresence`) thì dùng thẳng:
 * xe ở kho xuất phát là một dòng xác nhận; chưa ghi nhận, đang trên đường hay ở kho khác đều có nút phụ "Xác nhận xe có ở kho" — máy chủ
 * nhận cả ba. Máy chủ còn từ chối (đang điều chuyển, bận chuyến khác) thì câu lỗi của máy chủ hiện ngay trên nút. Máy chủ cũ không trả các
 * trường đó: tìm xe theo biển số (`LegacyPresenceCheck`).
 */
export function VehiclePresenceCheck({ session }: VehiclePresenceCheckProps) {
  return session.vehiclePresence === null ? (
    <LegacyPresenceCheck tripId={session.tripId} licensePlate={session.licensePlate} />
  ) : (
    <SessionPresenceCheck tripId={session.tripId} plate={session.licensePlate ?? session.vehicle} presence={session.vehiclePresence} />
  )
}

type SessionPresenceCheckProps = { readonly tripId: string; readonly plate: string; readonly presence: ServerVehiclePresence }

/**
 * Nơi xe đang ở theo phiên. Tên kho lấy từ danh sách kho nhân viên được phân công; kho xuất phát không có trong danh sách thì nhân viên
 * không xác nhận được (máy chủ `VEHICLE_WAREHOUSE_FORBIDDEN`): dải cảnh báo, không nút. Danh sách lỗi thì vẫn cho bấm — máy chủ quyết.
 */
function SessionPresenceCheck({ tripId, plate, presence }: SessionPresenceCheckProps) {
  const t = useT()
  const warehouses = usePresenceWarehouses()
  if (warehouses.isPending) return null
  const list = warehouses.data ?? []
  const origin = list.find((warehouse) => warehouse.id === presence.originWarehouseId)
  const names = { plate, warehouse: origin?.name ?? t('vehiclePresence.session.origin') }
  const target = { tripId, warehouseId: presence.originWarehouseId, vehicleId: presence.vehicleId, names }

  if (isHere({ presence: presence.status, warehouseId: presence.warehouseId }, presence.originWarehouseId)) {
    return <PresenceCard {...target} state={{ kind: 'here' }} />
  }
  if (warehouses.isSuccess && origin === undefined) {
    return <PresenceCard {...target} state={{ kind: 'blocked', message: t('vehiclePresence.session.notAssigned', names) }} />
  }
  if (presence.status === 'UNKNOWN' || presence.status === 'OTHER') {
    return <PresenceCard {...target} state={{ kind: 'confirm', message: t('vehiclePresence.session.unknown', names) }} />
  }
  const place = {
    presence: presence.status,
    warehouseId: presence.warehouseId,
    warehouseName: list.find((warehouse) => warehouse.id === presence.warehouseId)?.name ?? null,
  }
  const message = t('vehiclePresence.session.elsewhere', { ...names, presence: presenceLabel(t, place, presence.originWarehouseId) })
  return <PresenceCard {...target} state={{ kind: 'confirm', message }} />
}

type LegacyPresenceCheckProps = { readonly tripId: string; readonly licensePlate: string | null }

/**
 * Máy chủ cũ: phiên không mang mã xe hay mã kho, nên tìm xe bằng biển số ở các kho nhân viên được phân công, đúng xe đang xếp cho chuyến
 * này (`loadingTripId`). Máy chủ cũ chỉ nhận xác nhận khi xe còn "Chưa ghi nhận"; trạng thái khác là câu nhờ điều phối viên. Không tìm
 * thấy xe (kho không phụ trách chuyến, máy chủ chưa có "Xe ở kho") thì không vẽ gì; lỗi đọc là dải cảnh báo kèm nút thử lại.
 */
function LegacyPresenceCheck({ tripId, licensePlate }: LegacyPresenceCheckProps) {
  const t = useT()
  const query = useTripVehiclePresence(tripId, licensePlate)

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
  const target = { tripId, warehouseId: warehouse.id, vehicleId: vehicle.id, names }
  const state: CardState = isHere(vehicle, warehouse.id)
    ? { kind: 'here' }
    : vehicle.presence === 'UNKNOWN'
      ? { kind: 'confirm', message: t('vehiclePresence.session.unknown', names) }
      : { kind: 'blocked', message: t('vehiclePresence.session.blocked', { ...names, presence: presenceLabel(t, vehicle, warehouse.id) }) }
  return <PresenceCard {...target} state={state} />
}

type CardState =
  | { readonly kind: 'here' }
  | { readonly kind: 'confirm'; readonly message: string }
  | { readonly kind: 'blocked'; readonly message: string }

type PresenceCardProps = {
  readonly tripId: string
  readonly warehouseId: string
  readonly vehicleId: string
  readonly names: { readonly plate: string; readonly warehouse: string }
  readonly state: CardState
}

/** Thẻ của khối: dòng xác nhận, câu kèm nút "Xác nhận xe có ở kho", hoặc dải cảnh báo. Xác nhận xong là dải thành công. */
function PresenceCard({ tripId, warehouseId, vehicleId, names, state }: PresenceCardProps) {
  const t = useT()
  const confirm = useConfirmLoadingPresence(tripId)
  const [failure, setFailure] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  async function handleConfirm() {
    setFailure(null)
    try {
      await confirm.mutateAsync({ warehouseId, vehicleId })
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
      {confirmed ? (
        <Banner tone="success">{t('vehiclePresence.session.confirmed', names)}</Banner>
      ) : state.kind === 'here' ? (
        <View style={styles.line}>
          <CircleCheck color={colors.success} size={24} strokeWidth={1.5} />
          <AppText style={styles.flex}>{t('vehiclePresence.session.here', names)}</AppText>
        </View>
      ) : state.kind === 'confirm' ? (
        <>
          <View style={styles.line}>
            <Truck color={colors.warning} size={24} strokeWidth={1.5} />
            <AppText style={styles.flex}>{state.message}</AppText>
          </View>
          {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
          <Button write variant="secondary" icon={Truck} loading={confirm.isPending} onPress={() => void handleConfirm()}>
            {t('vehiclePresence.session.confirm')}
          </Button>
        </>
      ) : (
        <Banner tone="warning">{state.message}</Banner>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  flex: { flex: 1 },
})
