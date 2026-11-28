/*
 * Xe ở kho (`/api/warehouse/vehicle-presence`): nhân viên kho ghi nhận xe có mặt ở kho mình được phân công. Máy chủ cần ghi nhận này trước
 * khi tài xế xuất phát (xe phải "Ở kho" đúng kho xuất phát của chuyến). Kiểu của app, không phải DTO.
 */

/** Trạng thái có mặt của xe theo máy chủ; giá trị lạ đọc là `OTHER`. */
export const PRESENCE_STATUSES = ['UNKNOWN', 'AT_WAREHOUSE', 'IN_TRANSIT', 'OTHER'] as const
export type PresenceStatus = (typeof PRESENCE_STATUSES)[number]

/** Trạng thái vận hành của xe trong danh mục (máy chủ tính `IN_TRIP` khi xe đang ở chuyến Đang xếp hàng hoặc Đang vận chuyển). */
export const VEHICLE_STATES = ['AVAILABLE', 'IN_TRIP', 'MAINTENANCE', 'RETIRED', 'OTHER'] as const
export type VehicleState = (typeof VEHICLE_STATES)[number]

export type PresenceWarehouse = { readonly id: string; readonly name: string }

export type PresenceVehicle = {
  readonly id: string
  readonly name: string | null
  readonly licensePlate: string
  readonly state: VehicleState
  readonly presence: PresenceStatus
  /** Kho xe đang có mặt (khi `AT_WAREHOUSE`). */
  readonly warehouseId: string | null
  readonly warehouseName: string | null
  /** Lần ghi nhận gần nhất (ISO), người ghi. */
  readonly observedAt: string | null
  readonly actorName: string | null
  /** Chuyến Đang xếp hàng của xe xuất phát từ kho đang xem (máy chủ chỉ trả khi đúng kho đó). */
  readonly loadingTripId: string | null
  readonly loadingTripCode: string | null
  /** Xe đang được điều chuyển giữa hai kho. */
  readonly transferring: boolean
}

export const PRESENCE_EVENT_TYPES = ['CHECK_IN', 'CHECK_OUT', 'OTHER'] as const
export type PresenceEventType = (typeof PRESENCE_EVENT_TYPES)[number]

export type PresenceEvent = {
  readonly id: string
  readonly type: PresenceEventType
  readonly previous: PresenceStatus | null
  readonly next: PresenceStatus | null
  readonly recordedAt: string
}

/** Xe của một chuyến Đang xếp hàng và kho xuất phát của chuyến, tìm trong các kho nhân viên được phân công. */
export type TripVehiclePresence = { readonly warehouse: PresenceWarehouse; readonly vehicle: PresenceVehicle }
