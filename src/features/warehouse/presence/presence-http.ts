import { api, ApiError, isApiError, type ApiClient } from '@/data/http'
import { isoFromBackend, pick, readAllPages } from '@/lib/office-backend'

import type { PresenceApi, VehicleFilter } from './presence-api'
import type { PresenceEventDto, PresenceVehicleDto, PresenceWarehouseDto } from './presence-http-dto'
import {
  PRESENCE_EVENT_TYPES,
  PRESENCE_STATUSES,
  VEHICLE_STATES,
  type PresenceEvent,
  type PresenceStatus,
  type PresenceVehicle,
  type PresenceWarehouse,
} from './presence-model'

/*
 * Nguồn backend của "Xe ở kho" (`VehiclePresenceController`). Hai lệnh ghi gửi header `Idempotency-Key` (UUID) do màn giữ cho mỗi lần
 * thao tác: gửi lại sau khi mất phản hồi thì máy chủ trả đúng kết quả cũ. Mã `VEHICLE_BUSY` của máy chủ ở đây nghĩa là xe đang ở một chuyến
 * Đang xếp hàng / Đang vận chuyển — câu cùng mã của kho mẫu nói chuyện khác (kèm mã xe, mã chuyến), nên đổi sang `PRESENCE_VEHICLE_BUSY`.
 */

const BASE = '/api/warehouse/vehicle-presence'
/** Máy chủ đòi chuỗi tìm 2–80 ký tự (rỗng là mọi xe); một ký tự là `INVALID_INPUT`. */
const MIN_QUERY = 2

const idOf = (value: number | string | null | undefined): string | null =>
  value === null || value === undefined || String(value).trim() === '' ? null : String(value)

function requiredId(value: number | string | null | undefined): string {
  const id = idOf(value)
  if (id === null) throw new ApiError('SERVER_ERROR')
  return id
}

const presenceOf = (value: string | null | undefined): PresenceStatus => pick(PRESENCE_STATUSES, value) ?? 'OTHER'
const presenceOrNull = (value: string | null | undefined): PresenceStatus | null =>
  value === null || value === undefined ? null : presenceOf(value)
const timeOf = (value: string | null | undefined): string | null =>
  value === null || value === undefined || value.trim() === '' ? null : isoFromBackend(value)

export function warehouseOf(dto: PresenceWarehouseDto): PresenceWarehouse {
  const id = requiredId(dto.id)
  return { id, name: dto.name?.trim() || id }
}

export function vehicleOf(dto: PresenceVehicleDto): PresenceVehicle {
  const id = requiredId(dto.id)
  return {
    id,
    name: dto.name?.trim() || null,
    licensePlate: dto.license_plate?.trim() || id,
    state: pick(VEHICLE_STATES, dto.status) ?? 'OTHER',
    presence: presenceOf(dto.presence_status ?? 'UNKNOWN'),
    warehouseId: idOf(dto.current_warehouse_id),
    warehouseName: dto.current_warehouse_name?.trim() || null,
    observedAt: timeOf(dto.observed_at),
    actorName: dto.actor_name?.trim() || null,
    loadingTripId: idOf(dto.loading_trip_id),
    loadingTripCode: dto.loading_trip_code?.trim() || null,
    transferring: Boolean(dto.active_transfer_status),
  }
}

export function eventOf(dto: PresenceEventDto): PresenceEvent {
  const recordedAt = timeOf(dto.recordedAt)
  if (recordedAt === null) throw new ApiError('SERVER_ERROR')
  return {
    id: requiredId(dto.id),
    type: pick(PRESENCE_EVENT_TYPES, dto.eventType) ?? 'OTHER',
    previous: presenceOrNull(dto.previousStatus),
    next: presenceOrNull(dto.newStatus),
    recordedAt,
  }
}

async function write<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    if (isApiError(error) && error.code === 'VEHICLE_BUSY') throw new ApiError('PRESENCE_VEHICLE_BUSY', { status: error.status })
    throw error
  }
}

const seg = (value: string) => encodeURIComponent(value)

export function httpPresenceApi({ client = api }: { readonly client?: () => ApiClient } = {}): PresenceApi {
  async function fetchWarehouses(): Promise<PresenceWarehouse[]> {
    return ((await client().get<readonly PresenceWarehouseDto[] | null>(`${BASE}/warehouses`)) ?? []).map(warehouseOf)
  }

  async function fetchVehicles(warehouseId: string, { query = '', atWarehouse = false }: VehicleFilter = {}): Promise<PresenceVehicle[]> {
    const search = query.trim()
    if (search.length > 0 && search.length < MIN_QUERY) return []
    const path = `${BASE}/${seg(warehouseId)}/vehicles`
    const rows = await readAllPages<PresenceVehicleDto>(client(), path, { query: search, atWarehouse }, { size: 100, maxPages: 5 })
    return rows.map(vehicleOf)
  }

  return {
    fetchWarehouses,
    fetchVehicles,
    async checkIn(warehouseId, vehicleId, key) {
      await write(
        client().post(`${BASE}/${seg(warehouseId)}/check-in`, { body: { vehicleId: Number(vehicleId) }, headers: { 'Idempotency-Key': key } }),
      )
    },
    async confirmLoadingPresence(warehouseId, tripId, vehicleId, key) {
      await write(
        client().post(`${BASE}/${seg(warehouseId)}/loading-trips/${seg(tripId)}/confirm-presence`, {
          body: { vehicleId: Number(vehicleId) },
          headers: { 'Idempotency-Key': key },
        }),
      )
    },
    async fetchEvents(warehouseId, vehicleId) {
      const path = `${BASE}/${seg(warehouseId)}/vehicles/${seg(vehicleId)}/events`
      const rows = (await client().get<readonly PresenceEventDto[] | null>(path)) ?? []
      return rows.map(eventOf).toSorted((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    },
    async fetchTripVehicle(tripId, licensePlate) {
      const plate = licensePlate.trim()
      if (plate.length < MIN_QUERY) return null
      try {
        for (const warehouse of await fetchWarehouses()) {
          const vehicle = (await fetchVehicles(warehouse.id, { query: plate })).find((row) => row.loadingTripId === tripId)
          if (vehicle !== undefined) return { warehouse, vehicle }
        }
        return null
      } catch (error) {
        // Máy chủ cũ chưa có endpoint xe ở kho: 404 không kèm mã — không có gì để xác nhận, phiên xếp vẫn chạy như trước
        if (isApiError(error) && error.status === 404 && error.code === 'SERVER_ERROR') return null
        throw error
      }
    },
  }
}
