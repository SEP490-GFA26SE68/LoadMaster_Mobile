/*
 * Phản hồi của `VehiclePresenceController` (chỉ `presence-http.ts` import). Danh sách kho và danh mục xe là `Map` của SQL: khoá
 * snake_case, mã số là số. Danh mục xe là `PageResponse` (client trả phần `data`).
 */

export type PresenceWarehouseDto = { id?: number | string | null; name?: string | null }

export type PresenceVehicleDto = {
  id?: number | string | null
  name?: string | null
  license_plate?: string | null
  active_transfer_status?: string | null
  loading_trip_id?: number | string | null
  loading_trip_code?: string | null
  status?: string | null
  presence_status?: string | null
  current_warehouse_id?: number | string | null
  current_warehouse_name?: string | null
  observed_at?: string | null
  actor_name?: string | null
}

/** `VehiclePresenceStore.Event`: không mang tên người ghi. */
export type PresenceEventDto = {
  id?: number | string | null
  eventType?: string | null
  previousStatus?: string | null
  newStatus?: string | null
  recordedAt?: string | null
}
