/**
 * Hàm → endpoint backend của "Xe ở kho" (`presence-http.ts`). Kho mẫu không có việc này: gọi tới khi nguồn `warehouse` là kho mẫu là
 * `NOT_SUPPORTED` — màn chỉ mở khi nguồn là máy chủ.
 *   fetchPresenceWarehouses   GET  /api/warehouse/vehicle-presence/warehouses
 *   fetchPresenceVehicles     GET  /api/warehouse/vehicle-presence/{warehouseId}/vehicles?query=&atWarehouse=&page=&size=
 *   checkInVehicle            POST /api/warehouse/vehicle-presence/{warehouseId}/check-in (Idempotency-Key)
 *   confirmLoadingPresence    POST /api/warehouse/vehicle-presence/{warehouseId}/loading-trips/{tripId}/confirm-presence (Idempotency-Key)
 *   fetchPresenceEvents       GET  /api/warehouse/vehicle-presence/{warehouseId}/vehicles/{vehicleId}/events
 *   fetchTripVehiclePresence  GET  …/warehouses rồi …/{warehouseId}/vehicles?query=<biển số> từng kho
 */
import { createAdapter } from '@/data/adapter'
import { notSupported } from '@/lib/office-backend'

import { httpPresenceApi } from './presence-http'
import type { PresenceEvent, PresenceVehicle, PresenceWarehouse, TripVehiclePresence } from './presence-model'

export type VehicleFilter = { readonly query?: string; readonly atWarehouse?: boolean }

export type PresenceApi = {
  fetchWarehouses(): Promise<PresenceWarehouse[]>
  fetchVehicles(warehouseId: string, filter?: VehicleFilter): Promise<PresenceVehicle[]>
  checkIn(warehouseId: string, vehicleId: string, idempotencyKey: string): Promise<void>
  confirmLoadingPresence(warehouseId: string, tripId: string, vehicleId: string, idempotencyKey: string): Promise<void>
  fetchEvents(warehouseId: string, vehicleId: string): Promise<PresenceEvent[]>
  /** Xe của chuyến Đang xếp hàng `tripId` (mã số của máy chủ) ở kho xuất phát của chuyến; `null` khi không tìm thấy. */
  fetchTripVehicle(tripId: string, licensePlate: string): Promise<TripVehiclePresence | null>
}

const SAMPLE_SOURCE: PresenceApi = {
  fetchWarehouses: notSupported,
  fetchVehicles: notSupported,
  checkIn: notSupported,
  confirmLoadingPresence: notSupported,
  fetchEvents: notSupported,
  fetchTripVehicle: notSupported,
}

const source = createAdapter<PresenceApi>('warehouse', { mock: () => SAMPLE_SOURCE, http: () => httpPresenceApi() })

// GET /api/warehouse/vehicle-presence/warehouses
export const fetchPresenceWarehouses = () => source().fetchWarehouses()

// GET /api/warehouse/vehicle-presence/{warehouseId}/vehicles
export const fetchPresenceVehicles = (warehouseId: string, filter?: VehicleFilter) => source().fetchVehicles(warehouseId, filter)

// POST /api/warehouse/vehicle-presence/{warehouseId}/check-in
export const checkInVehicle = (warehouseId: string, vehicleId: string, key: string) => source().checkIn(warehouseId, vehicleId, key)

// POST /api/warehouse/vehicle-presence/{warehouseId}/loading-trips/{tripId}/confirm-presence
export const confirmLoadingPresence = (warehouseId: string, tripId: string, vehicleId: string, key: string) =>
  source().confirmLoadingPresence(warehouseId, tripId, vehicleId, key)

// GET /api/warehouse/vehicle-presence/{warehouseId}/vehicles/{vehicleId}/events
export const fetchPresenceEvents = (warehouseId: string, vehicleId: string) => source().fetchEvents(warehouseId, vehicleId)

// GET /api/warehouse/vehicle-presence/warehouses + …/{warehouseId}/vehicles?query=<biển số>
export const fetchTripVehiclePresence = (tripId: string, licensePlate: string) => source().fetchTripVehicle(tripId, licensePlate)
