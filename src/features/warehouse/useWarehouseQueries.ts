import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  completeLoading,
  confirmPlacement,
  fetchLoading,
  fetchWarehouseTasks,
  recordDeviation,
  scanPackage,
  startLoading,
  warehouseCapabilities,
} from './warehouse-api'
import type { DeviationInput, WarehouseCapabilities } from './warehouse-model'

const NO_CAPABILITIES: WarehouseCapabilities = { deviation: false, scan: false }

export function useWarehouseCapabilities(): WarehouseCapabilities {
  try {
    return warehouseCapabilities()
  } catch {
    return NO_CAPABILITIES
  }
}

export const warehouseKeys = {
  all: ['warehouse'] as const,
  tasks: ['warehouse', 'tasks'] as const,
  loading: (tripId: string) => ['warehouse', 'loading', tripId] as const,
  scan: (code: string) => ['warehouse', 'scan', code] as const,
}

export function useWarehouseTasksQuery() {
  return useQuery({ queryKey: warehouseKeys.tasks, queryFn: fetchWarehouseTasks })
}

export function useLoadingQuery(tripId: string) {
  return useQuery({ queryKey: warehouseKeys.loading(tripId), queryFn: () => fetchLoading(tripId) })
}

export function useStartLoading() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: startLoading,
    onSuccess: (session) => {
      void client.invalidateQueries({ queryKey: warehouseKeys.all })
      client.setQueryData(warehouseKeys.loading(session.tripId), session)
    },
  })
}

export function useConfirmPlacement(tripId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (placementId: string) => confirmPlacement(tripId, placementId),
    onSuccess: (session) => client.setQueryData(warehouseKeys.loading(tripId), session),
  })
}

export function useRecordDeviation(tripId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ placementId, input }: { placementId: string; input: DeviationInput }) => recordDeviation(tripId, placementId, input),
    onSuccess: (session) => client.setQueryData(warehouseKeys.loading(tripId), session),
  })
}

export function useCompleteLoading(tripId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => completeLoading(tripId),
    onSuccess: () => void client.invalidateQueries({ queryKey: warehouseKeys.all }),
  })
}

export function useScanPackage(code: string) {
  const trimmed = code.trim()
  return useQuery({
    queryKey: warehouseKeys.scan(trimmed),
    queryFn: () => scanPackage(trimmed),
    enabled: trimmed !== '',
  })
}
