import type { BadgeTone } from '@/theme/tokens'
import type { TFunction } from '@/lib/i18n'

import type { PresenceStatus, PresenceVehicle } from './presence-model'

/** Xe đang được ghi là có mặt ở đúng kho đang xem (máy chủ trả trạng thái so với kho của xe, không so với kho đang xem). */
export const isHere = (vehicle: PresenceVehicle, warehouseId: string) => vehicle.presence === 'AT_WAREHOUSE' && vehicle.warehouseId === warehouseId

/** Tên trạng thái có mặt của xe so với kho đang xem: "Ở kho này", "Ở kho <tên>", "Chưa ghi nhận", "Đang trên đường". */
export function presenceLabel(t: TFunction, vehicle: PresenceVehicle, warehouseId: string): string {
  if (vehicle.presence !== 'AT_WAREHOUSE') return t(`vehiclePresence.presence.${vehicle.presence}`)
  if (vehicle.warehouseId === warehouseId) return t('vehiclePresence.presence.here')
  return vehicle.warehouseName === null
    ? t('vehiclePresence.presence.elsewhereUnnamed')
    : t('vehiclePresence.presence.elsewhere', { name: vehicle.warehouseName })
}

const TONE: Record<PresenceStatus, BadgeTone> = { UNKNOWN: 'neutral', AT_WAREHOUSE: 'cyan', IN_TRANSIT: 'azure', OTHER: 'neutral' }

/** Ở kho này là xanh lá (sẵn sàng); ở kho khác là cyan; đang trên đường là xanh lam ("đang chạy"); chưa ghi nhận xám. Luôn đi cùng chữ. */
export const presenceTone = (vehicle: PresenceVehicle, warehouseId: string): BadgeTone =>
  isHere(vehicle, warehouseId) ? 'success' : TONE[vehicle.presence]

/**
 * Lý do nút "Ghi nhận có ở kho" mờ — máy chủ cũng từ chối các trường hợp này: đang điều chuyển (`VEHICLE_TRANSFER_CONFLICT`), ở chuyến Đang
 * xếp hàng / Đang vận chuyển (`VEHICLE_BUSY`), đang được ghi ở kho khác (`VEHICLE_PRESENCE_CONFLICT`). `null` là ghi nhận được.
 */
export function checkInBlocker(t: TFunction, vehicle: PresenceVehicle, warehouseId: string): string | null {
  if (vehicle.transferring) return t('vehiclePresence.checkInBlocked.transferring')
  if (vehicle.state === 'IN_TRIP') return t('vehiclePresence.checkInBlocked.busy')
  if (vehicle.presence === 'AT_WAREHOUSE' && vehicle.warehouseId !== warehouseId) return t('vehiclePresence.checkInBlocked.elsewhere')
  return null
}
