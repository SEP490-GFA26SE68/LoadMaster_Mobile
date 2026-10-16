import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  arriveAtStop,
  completeStop,
  confirmUnload,
  confirmUnloadManually,
  driverCapabilities,
  fetchMyTrips,
  fetchNotifications,
  fetchTripScreen,
  reportDeliveryIssue,
  reportTripException,
  startDelivery,
} from './driver-api'
import type { DeliveryIssueRequest, DriverCapabilities, ManualConfirmRequest, StopKey, TripExceptionRequest, VerifyCodeInput } from './driver-model'

const NO_CAPABILITIES: DriverCapabilities = {
  depart: false,
  arrive: false,
  manualConfirm: false,
  deliveryIssues: false,
  tripExceptions: false,
  gps: false,
  notifications: false,
  gpsLocalOnly: false,
}

/**
 * Việc tài xế làm được với nguồn đang dùng: màn chỉ vẽ nút của việc nguồn làm được. Nguồn chưa nối (`HTTP_NOT_WIRED`) thì không có việc
 * nào — lỗi đó vẫn hiện ở truy vấn của màn, không bị nuốt.
 */
export function useDriverCapabilities(): DriverCapabilities {
  try {
    return driverCapabilities()
  } catch {
    return NO_CAPABILITIES
  }
}

/** Khoá truy vấn của feature tài xế, mọi khoá nằm dưới `['driver']`: một lần ghi làm mới hết. */
export const driverKeys = {
  all: ['driver'] as const,
  myTrips: ['driver', 'my-trips'] as const,
  trip: (tripId: string) => ['driver', 'trip', tripId] as const,
  notifications: ['driver', 'notifications'] as const,
}

/**
 * "Chuyến của tôi": pha của chuyến đổi ở nơi khác (kho xếp xong, điều phối huỷ) nên mỗi lần mở màn đọc lại; giờ đến dự kiến của chuyến
 * đang chạy đọc lại theo nhịp nguồn trả (`refreshMs`), không có hẹn giờ riêng.
 */
export function useMyTripsQuery() {
  return useQuery({
    queryKey: driverKeys.myTrips,
    queryFn: fetchMyTrips,
    staleTime: 0,
    refetchInterval: (query) => query.state.data?.refreshMs ?? false,
  })
}

/** Màn của một chuyến; đang giao thì đọc lại theo nhịp vị trí xe (`refreshMs`). */
export function useTripScreenQuery(tripId: string) {
  return useQuery({
    queryKey: driverKeys.trip(tripId),
    queryFn: () => fetchTripScreen(tripId),
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data
      return data?.kind === 'stop' ? (data.screen.refreshMs ?? false) : false
    },
  })
}

/** Chuông: mở màn là đọc lại; `enabled` tắt khi nguồn chưa có thông báo. */
export function useNotificationsQuery(enabled: boolean) {
  return useQuery({ queryKey: driverKeys.notifications, queryFn: fetchNotifications, enabled, staleTime: 0 })
}

/** Mọi lệnh ghi của tài xế: xong (kể cả lỗi — kho có thể đã đổi ở nơi khác) thì đọc lại mọi thứ của tài xế. */
function useDriverMutation<Input, Result>(mutationFn: (input: Input) => Promise<Result>) {
  const client = useQueryClient()
  return useMutation({ mutationFn, onSettled: () => client.invalidateQueries({ queryKey: driverKeys.all }) })
}

export function useStartDeliveryMutation(tripId: string) {
  return useDriverMutation(() => startDelivery(tripId))
}

export function useArriveMutation(tripId: string) {
  return useDriverMutation((stop: StopKey) => arriveAtStop(tripId, stop))
}

export function useConfirmUnloadMutation(tripId: string) {
  return useDriverMutation((input: VerifyCodeInput) => confirmUnload(tripId, input))
}

export function useConfirmManuallyMutation(tripId: string) {
  return useDriverMutation((input: ManualConfirmRequest) => confirmUnloadManually(tripId, input))
}

export function useReportIssueMutation(tripId: string) {
  return useDriverMutation((input: DeliveryIssueRequest) => reportDeliveryIssue(tripId, input))
}

export function useCompleteStopMutation(tripId: string) {
  return useDriverMutation((stop: StopKey) => completeStop(tripId, stop))
}

export function useReportTripExceptionMutation(tripId: string) {
  return useDriverMutation((input: TripExceptionRequest) => reportTripException(tripId, input))
}
