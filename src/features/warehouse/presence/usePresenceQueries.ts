import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'

import { randomUuid } from '@/lib/uuid'

import { serverWarehouseKeys } from '../server/useServerWarehouseQueries'

import {
  checkInVehicle,
  confirmLoadingPresence,
  fetchPresenceEvents,
  fetchPresenceVehicles,
  fetchPresenceWarehouses,
  fetchTripVehiclePresence,
} from './presence-api'

/** Khoá truy vấn của "Xe ở kho", dưới `['warehouse']` như mọi màn kho (cache xoá sạch lúc đăng nhập, đăng xuất). */
export const presenceKeys = {
  all: ['warehouse', 'presence'] as const,
  warehouses: ['warehouse', 'presence', 'warehouses'] as const,
  vehicles: (warehouseId: string, query: string, atWarehouse: boolean) => ['warehouse', 'presence', 'vehicles', warehouseId, query, atWarehouse] as const,
  events: (warehouseId: string, vehicleId: string) => ['warehouse', 'presence', 'events', warehouseId, vehicleId] as const,
  trip: (tripId: string, plate: string) => ['warehouse', 'presence', 'trip', tripId, plate] as const,
}

/** Kho nhân viên được phân công; ít đổi nên giữ một phút. */
export function usePresenceWarehouses() {
  return useQuery({ queryKey: presenceKeys.warehouses, queryFn: fetchPresenceWarehouses, staleTime: 60_000 })
}

/** Xe của công ty kèm trạng thái có mặt so với kho đang xem; `staleTime: 0` — tài xế vừa xuất phát ở máy khác thì đọc lại là thấy. */
export function usePresenceVehicles(warehouseId: string | undefined, query: string, atWarehouse: boolean) {
  return useQuery({
    queryKey: presenceKeys.vehicles(warehouseId ?? '', query, atWarehouse),
    queryFn: () => fetchPresenceVehicles(warehouseId ?? '', { query, atWarehouse }),
    enabled: warehouseId !== undefined,
    staleTime: 0,
  })
}

export function usePresenceEvents(warehouseId: string, vehicleId: string | null) {
  return useQuery({
    queryKey: presenceKeys.events(warehouseId, vehicleId ?? ''),
    queryFn: () => fetchPresenceEvents(warehouseId, vehicleId ?? ''),
    enabled: vehicleId !== null,
    staleTime: 0,
  })
}

/**
 * Xe của chuyến đang xếp ở kho xuất phát. Máy chủ cũ chưa có endpoint xe ở kho (404) thì coi như không có gì để xác nhận; lỗi khác vẫn
 * là lỗi. `retry: false` — một lần đọc gồm nhiều lượt gọi, đọc lại khi người dùng kéo xuống.
 */
export function useTripVehiclePresence(tripId: string, licensePlate: string | null) {
  return useQuery({
    queryKey: presenceKeys.trip(tripId, licensePlate ?? ''),
    queryFn: () => fetchTripVehiclePresence(tripId, licensePlate ?? ''),
    enabled: licensePlate !== null,
    staleTime: 0,
    retry: false,
  })
}

/**
 * Một `Idempotency-Key` cho mỗi việc đang làm (`scope`): gửi lại cùng việc (mất phản hồi, bấm lại sau lỗi) dùng lại khoá cũ để máy chủ không
 * ghi hai lần; ghi xong thì bỏ khoá, lần ghi sau là việc mới.
 */
function useIdempotencyKeys() {
  const keys = useRef(new Map<string, string>())
  return {
    keyOf(scope: string): string {
      const existing = keys.current.get(scope)
      if (existing !== undefined) return existing
      const key = randomUuid()
      keys.current.set(scope, key)
      return key
    },
    done(scope: string) {
      keys.current.delete(scope)
    },
  }
}

/** Ghi nhận xe có mặt ở kho; xong hay lỗi đều đọc lại danh sách xe và lịch sử (máy khác có thể vừa ghi). */
export function useCheckInVehicle(warehouseId: string) {
  const client = useQueryClient()
  const keys = useIdempotencyKeys()
  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const scope = `check-in:${warehouseId}:${vehicleId}`
      await checkInVehicle(warehouseId, vehicleId, keys.keyOf(scope))
      keys.done(scope)
    },
    onSettled: () => client.invalidateQueries({ queryKey: presenceKeys.all }),
  })
}

/**
 * Xác nhận xe của chuyến đang xếp có ở kho xuất phát (máy chủ nhận xe chưa ghi nhận, đang trên đường hay ở kho khác; máy chủ cũ chỉ nhận
 * xe chưa ghi nhận). Xong hay lỗi đều đọc lại xe và phiên — phiên mang nơi xe đang ở.
 */
export function useConfirmLoadingPresence(tripId: string) {
  const client = useQueryClient()
  const keys = useIdempotencyKeys()
  return useMutation({
    mutationFn: async ({ warehouseId, vehicleId }: { readonly warehouseId: string; readonly vehicleId: string }) => {
      const scope = `confirm:${warehouseId}:${tripId}:${vehicleId}`
      await confirmLoadingPresence(warehouseId, tripId, vehicleId, keys.keyOf(scope))
      keys.done(scope)
    },
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: presenceKeys.all }),
        client.invalidateQueries({ queryKey: serverWarehouseKeys.session(tripId) }),
      ]),
  })
}
