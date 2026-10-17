/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`warehouse-mock.ts` kho mẫu, `warehouse-http.ts` backend).
 *   fetchTasks         GET  /api/warehouse/tasks
 *   startLoading       POST /api/warehouse/tasks/{tripId}/start
 *   fetchLoading       phiên xếp đang mở (HTTP: bộ nhớ lần start; kho mẫu: GET chuyến)
 *   confirmPlacement   POST /api/warehouse/placements/{id}/confirm
 *   recordDeviation    POST /api/warehouse/placements/{id}/deviation
 *   completeLoading    POST /api/warehouse/tasks/{id}/complete
 *   scanPackage        GET  /api/packages/scan/{qrToken}
 */
import { createAdapter } from '@/data/adapter'

import type { DeviationInput, LoadingComplete, LoadingSession, PackageLookup, WarehouseCapabilities, WarehouseTask } from './warehouse-model'
import { httpWarehouseApi } from './warehouse-http'
import { mockWarehouseApi } from './warehouse-mock'

export type WarehouseApi = {
  readonly capabilities: WarehouseCapabilities
  fetchTasks(): Promise<readonly WarehouseTask[]>
  startLoading(tripId: string): Promise<LoadingSession>
  fetchLoading(tripId: string): Promise<LoadingSession>
  confirmPlacement(tripId: string, placementId: string): Promise<LoadingSession>
  recordDeviation(tripId: string, placementId: string, input: DeviationInput): Promise<LoadingSession>
  completeLoading(tripId: string): Promise<LoadingComplete>
  scanPackage(code: string): Promise<PackageLookup>
}

const adapter = createAdapter<WarehouseApi>('warehouse', { mock: mockWarehouseApi, http: () => httpWarehouseApi() })

export function warehouseCapabilities(): WarehouseCapabilities {
  return adapter().capabilities
}

// GET /api/warehouse/tasks
export function fetchWarehouseTasks(): Promise<readonly WarehouseTask[]> {
  return adapter().fetchTasks()
}

// POST /api/warehouse/tasks/{tripId}/start
export function startLoading(tripId: string): Promise<LoadingSession> {
  return adapter().startLoading(tripId)
}

export function fetchLoading(tripId: string): Promise<LoadingSession> {
  return adapter().fetchLoading(tripId)
}

// POST /api/warehouse/placements/{id}/confirm
export function confirmPlacement(tripId: string, placementId: string): Promise<LoadingSession> {
  return adapter().confirmPlacement(tripId, placementId)
}

// POST /api/warehouse/placements/{id}/deviation
export function recordDeviation(tripId: string, placementId: string, input: DeviationInput): Promise<LoadingSession> {
  return adapter().recordDeviation(tripId, placementId, input)
}

// POST /api/warehouse/tasks/{id}/complete
export function completeLoading(tripId: string): Promise<LoadingComplete> {
  return adapter().completeLoading(tripId)
}

// GET /api/packages/scan/{qrToken}
export function scanPackage(code: string): Promise<PackageLookup> {
  return adapter().scanPackage(code)
}
