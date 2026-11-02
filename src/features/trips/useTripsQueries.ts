import { useMutation, useQuery, useQueryClient, type InvalidateQueryFilters, type Query, type QueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { OFFICE_QUERY_ROOTS } from '@/data/query-roots'
import type { ShortageDecision } from '@/lib/mock-db'

import {
  approveManualConfirmation,
  fetchManualConfirmations,
  fetchStagingShortages,
  fetchTripDetail,
  fetchTripRequirements,
  fetchTrips,
  rejectManualConfirmation,
  resolveStagingShortage,
  tripsCapabilities,
} from './trips-api'
import type { TripsCapabilities } from './trips-model'

/** Nguồn dữ liệu chưa sẵn (cấu hình sai, backend chưa nối): màn ẩn mọi thẻ của việc nguồn chưa làm được. */
const NO_CAPABILITIES: TripsCapabilities = { manualConfirms: false, shortages: false, requirements: false }

export function useTripsCapabilities(): TripsCapabilities {
  try {
    return tripsCapabilities()
  } catch {
    return NO_CAPABILITIES
  }
}

/**
 * Khoá truy vấn của màn chuyến, dưới gốc `['trips']` (`OFFICE_QUERY_ROOTS`). Mọi dữ liệu của một chuyến nằm dưới `['trips', mã chuyến]`:
 * một lệnh ghi của chuyến làm mới cả chi tiết, yêu cầu giao lẫn hai thẻ chờ duyệt.
 */
export const tripKeys = {
  all: ['trips'] as const,
  list: ['trips', 'list'] as const,
  trip: (tripId: string) => ['trips', tripId] as const,
  detail: (tripId: string) => ['trips', tripId, 'detail'] as const,
  requirements: (tripId: string) => ['trips', tripId, 'requirements'] as const,
  manualConfirms: (tripId: string) => ['trips', tripId, 'manual-confirms'] as const,
  shortages: (tripId: string) => ['trips', tripId, 'shortages'] as const,
}

// Chuyến đổi theo việc của kho, tài xế và điều phối viên ở máy khác: mọi truy vấn của màn đọc lại mỗi lần mở (`staleTime: 0`)

export function useTripRows() {
  return useQuery({ queryKey: tripKeys.list, queryFn: fetchTrips, staleTime: 0 })
}

export function useTripDetail(tripId: string) {
  return useQuery({ queryKey: tripKeys.detail(tripId), queryFn: () => fetchTripDetail(tripId), enabled: tripId !== '', staleTime: 0 })
}

export function useTripRequirements(tripId: string, enabled: boolean) {
  return useQuery({ queryKey: tripKeys.requirements(tripId), queryFn: () => fetchTripRequirements(tripId), enabled: enabled && tripId !== '', staleTime: 0 })
}

export function useManualConfirmations(tripId: string, enabled: boolean) {
  return useQuery({ queryKey: tripKeys.manualConfirms(tripId), queryFn: () => fetchManualConfirmations(tripId), enabled: enabled && tripId !== '', staleTime: 0 })
}

export function useStagingShortages(tripId: string, enabled: boolean) {
  return useQuery({ queryKey: tripKeys.shortages(tripId), queryFn: () => fetchStagingShortages(tripId), enabled: enabled && tripId !== '', staleTime: 0 })
}

/**
 * Kéo xuống để đọc lại chi tiết chuyến: đọc lại trong một lượt mọi truy vấn đang hiện của chuyến (chi tiết, yêu cầu giao, hai thẻ chờ
 * duyệt); truy vấn đang tắt — thẻ không có việc ở pha này — không đọc. Vòng quay chỉ cho lần kéo của người dùng: lần đọc lại sau mỗi lần
 * duyệt không làm vòng quay hiện lên đầu màn.
 */
export function useRefreshTrip(tripId: string): { refreshing: boolean; onRefresh: () => void } {
  const client = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    void client.refetchQueries({ queryKey: tripKeys.trip(tripId), type: 'active' }).finally(() => setRefreshing(false))
  }, [client, tripId])
  return { refreshing, onRefresh }
}

/**
 * Sau một lệnh ghi: chờ đọc lại mọi khoá của chuyến đang mở — màn không bao giờ hiện trạng thái cũ sau khi ghi xong, kể cả khi lỗi —, còn
 * danh sách chuyến, các chuyến khác và hai gốc kia của `OFFICE_QUERY_ROOTS` (giám sát, số liệu) làm mới ngầm, không chờ. Khoá của chuyến
 * đang mở bị loại khỏi lượt ngầm: đánh dấu lại một khoá đang đọc là huỷ lượt đọc đang chạy.
 */
function useTripMutation<Input, Result>(tripId: string, mutationFn: (input: Input) => Promise<Result>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => {
      const shown = client.invalidateQueries({ queryKey: tripKeys.trip(tripId) })
      refreshInBackground(client, tripId)
      return shown
    },
  })
}

function refreshInBackground(client: QueryClient, tripId: string): void {
  const otherTrips = (query: Query) => query.queryKey[1] !== tripId
  for (const queryKey of OFFICE_QUERY_ROOTS) {
    const filters: InvalidateQueryFilters = queryKey[0] === tripKeys.all[0] ? { queryKey, predicate: otherTrips } : { queryKey }
    void client.invalidateQueries(filters)
  }
}

/** Duyệt một xác nhận tay: kiện giữ kết quả đã ghi. */
export function useApproveManualConfirm(tripId: string) {
  return useTripMutation(tripId, (confirmationId: string) => approveManualConfirmation(tripId, confirmationId))
}

/** Từ chối một xác nhận tay kèm lý do: kết quả của kiện bị gỡ, người gửi đối chiếu lại. */
export function useRejectManualConfirm(tripId: string) {
  return useTripMutation(tripId, ({ confirmationId, reason }: { confirmationId: string; reason: string }) =>
    rejectManualConfirmation(tripId, confirmationId, reason))
}

/** Quyết một kiện kho báo thiếu: tìm tiếp, hoặc bỏ kiện khỏi chuyến. */
export function useResolveShortage(tripId: string) {
  return useTripMutation(tripId, ({ packageInstanceId, decision }: { packageInstanceId: string; decision: ShortageDecision }) =>
    resolveStagingShortage(tripId, packageInstanceId, decision))
}
