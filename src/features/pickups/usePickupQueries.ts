import { useQuery } from '@tanstack/react-query'

import {
  approvePickupRequest,
  createPickupRequest,
  fetchPickupRows,
  rejectPickupRequest,
  validatePickupRequest,
} from '@/features/monitoring/monitoring-api'
import { monitoringKeys, useMonitoringCapabilities, useOfficeMutation } from '@/features/monitoring/useMonitoringQueries'
import type { PickupApproveInput, PickupRequestInput } from '@/lib/mock-db'

/**
 * Hook của nhận hàng dọc đường ở màn giám sát một chuyến (điều phối viên, quản lý chỉ xem). Khoá nằm dưới `['monitoring']`. Duyệt chèn
 * điểm vào tuyến nên lệnh ghi chờ cả danh sách yêu cầu lẫn giám sát của chuyến; kiểm lại mười luật chỉ đổi yêu cầu.
 */
export function usePickupRowsQuery(tripId: string) {
  const { pickups } = useMonitoringCapabilities()
  return useQuery({ queryKey: monitoringKeys.pickups(tripId), queryFn: () => fetchPickupRows(tripId), enabled: pickups, staleTime: 0 })
}

const shownOf = (tripId: string) => [monitoringKeys.pickups(tripId), monitoringKeys.live(tripId)]

/** Điều phối viên gửi yêu cầu nhận từ màn giám sát một chuyến (cùng tờ với tài xế). */
export function useCreatePickupMutation(tripId: string) {
  return useOfficeMutation(shownOf(tripId), (input: PickupRequestInput) => createPickupRequest(tripId, input))
}

export function useValidatePickupMutation(tripId: string) {
  return useOfficeMutation([monitoringKeys.pickups(tripId)], (pickupId: string) => validatePickupRequest(tripId, pickupId))
}

export function useApprovePickupMutation(tripId: string) {
  return useOfficeMutation(shownOf(tripId), ({ pickupId, input }: { pickupId: string; input: PickupApproveInput }) =>
    approvePickupRequest(tripId, pickupId, input),
  )
}

export function useRejectPickupMutation(tripId: string) {
  return useOfficeMutation(shownOf(tripId), ({ pickupId, reason }: { pickupId: string; reason: string }) => rejectPickupRequest(tripId, pickupId, reason))
}
