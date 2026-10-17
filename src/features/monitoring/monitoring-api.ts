/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`monitoring-mock.ts` kho mẫu, `monitoring-http.ts` backend).
 *   fetchBoard            GET /api/trips/monitoring + GET /api/dispatcher/dashboard
 *   fetchTrip             GET /api/trips/{id}/monitoring
 *   resolveException      POST /api/trips/{id}/exceptions/{exceptionId}/resolve
 *   escalateException     POST /api/trips/{id}/exceptions/{exceptionId}/escalate
 *   proposeReroute        POST /api/trips/{id}/reroute
 *   confirmReroute        POST /api/trips/{id}/reroute/{routeIndex}/confirm
 */
import { createAdapter } from '@/data/adapter'

import type {
  BoardTrip,
  MonitoringCapabilities,
  MonitoringDetail,
  RerouteProposal,
  ResolveInput,
} from './monitoring-model'
import { httpMonitoringApi } from './monitoring-http'
import { mockMonitoringApi } from './monitoring-mock'

export type MonitoringApi = {
  readonly capabilities: MonitoringCapabilities
  fetchBoard(): Promise<readonly BoardTrip[]>
  fetchTrip(tripId: string): Promise<MonitoringDetail>
  resolveException(tripId: string, exceptionId: string, input?: ResolveInput): Promise<void>
  escalateException(tripId: string, exceptionId: string): Promise<void>
  proposeReroute(tripId: string): Promise<RerouteProposal>
  confirmReroute(tripId: string, routeIndex: number): Promise<void>
}

const adapter = createAdapter<MonitoringApi>('monitoring', { mock: mockMonitoringApi, http: () => httpMonitoringApi() })

export function monitoringCapabilities(): MonitoringCapabilities {
  return adapter().capabilities
}

// GET /api/trips/monitoring
export function fetchMonitoringBoard(): Promise<readonly BoardTrip[]> {
  return adapter().fetchBoard()
}

// GET /api/trips/{id}/monitoring
export function fetchMonitoringTrip(tripId: string): Promise<MonitoringDetail> {
  return adapter().fetchTrip(tripId)
}

// POST /api/trips/{id}/exceptions/{exceptionId}/resolve
export function resolveException(tripId: string, exceptionId: string, input?: ResolveInput): Promise<void> {
  return adapter().resolveException(tripId, exceptionId, input)
}

// POST /api/trips/{id}/exceptions/{exceptionId}/escalate
export function escalateException(tripId: string, exceptionId: string): Promise<void> {
  return adapter().escalateException(tripId, exceptionId)
}

// POST /api/trips/{id}/reroute
export function proposeReroute(tripId: string): Promise<RerouteProposal> {
  return adapter().proposeReroute(tripId)
}

// POST /api/trips/{id}/reroute/{routeIndex}/confirm
export function confirmReroute(tripId: string, routeIndex: number): Promise<void> {
  return adapter().confirmReroute(tripId, routeIndex)
}
