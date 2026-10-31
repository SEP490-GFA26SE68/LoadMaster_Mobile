import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  confirmReroute,
  escalateException,
  fetchMonitoringBoard,
  fetchMonitoringTrip,
  monitoringCapabilities,
  proposeReroute,
  resolveException,
} from './monitoring-api'
import type { MonitoringCapabilities, ResolveInput } from './monitoring-model'

const NO_CAPABILITIES: MonitoringCapabilities = { resolve: false, escalate: false, reroute: false }

export function useMonitoringCapabilities(): MonitoringCapabilities {
  try {
    return monitoringCapabilities()
  } catch {
    return NO_CAPABILITIES
  }
}

export const monitoringKeys = {
  all: ['monitoring'] as const,
  board: ['monitoring', 'board'] as const,
  trip: (tripId: string) => ['monitoring', 'trip', tripId] as const,
}

export function useMonitoringBoardQuery() {
  return useQuery({ queryKey: monitoringKeys.board, queryFn: fetchMonitoringBoard, refetchInterval: (query) => query.state.data?.[0]?.refreshMs ?? false })
}

export function useMonitoringTripQuery(tripId: string) {
  return useQuery({
    queryKey: monitoringKeys.trip(tripId),
    queryFn: () => fetchMonitoringTrip(tripId),
    refetchInterval: (query) => query.state.data?.refreshMs ?? false,
  })
}

export function useResolveException(tripId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ exceptionId, input }: { exceptionId: string; input?: ResolveInput }) => resolveException(tripId, exceptionId, input),
    onSuccess: () => void client.invalidateQueries({ queryKey: monitoringKeys.all }),
  })
}

export function useEscalateException(tripId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (exceptionId: string) => escalateException(tripId, exceptionId),
    onSuccess: () => void client.invalidateQueries({ queryKey: monitoringKeys.all }),
  })
}

export function useProposeReroute(tripId: string) {
  return useMutation({ mutationFn: () => proposeReroute(tripId) })
}

export function useConfirmReroute(tripId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (routeIndex: number) => confirmReroute(tripId, routeIndex),
    onSuccess: () => void client.invalidateQueries({ queryKey: monitoringKeys.all }),
  })
}
