import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { pollInterval } from '@/lib/polling'

import {
  arriveAtStop,
  cancelClaim,
  claimTrip,
  completeStop,
  confirmUnload,
  confirmUnloadManually,
  driverCapabilities,
  fetchMyTrips,
  fetchOpenTrips,
  fetchPayroll,
  fetchNotifications,
  fetchTripDetail,
  fetchTripExceptions,
  fetchTripScreen,
  markNotificationsRead,
  reportDeliveryIssue,
  reportTripException,
  startDelivery,
} from './driver-api'
import type { DeliveryIssueRequest, DriverCapabilities, ManualConfirmRequest, StopKey, TripExceptionRequest, VerifyCodeInput } from './driver-model'

const NO_CAPABILITIES: DriverCapabilities = {
  payroll: false,
  depart: false,
  departFromList: false,
  arrive: false,
  manualConfirm: false,
  deliveryIssues: false,
  tripExceptions: false,
  gps: false,
  notifications: false,
  gpsLocalOnly: false,
  tripClaims: false,
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
  payroll: (period: string) => ['driver', 'payroll', period] as const,
  trip: (tripId: string) => ['driver', 'trip', tripId] as const,
  detail: (tripId: string) => ['driver', 'trip-detail', tripId] as const,
  exceptions: (tripId: string) => ['driver', 'trip-exceptions', tripId] as const,
  notifications: ['driver', 'notifications'] as const,
  openTrips: ['driver', 'open-trips'] as const,
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
    refetchInterval: (query) => pollInterval(query, query.state.data?.refreshMs),
  })
}

/** Phiếu lương đã tính của tháng đang xem; backend trả trạng thái chưa tính riêng, không dựng số liệu tạm. */
export function useDriverPayrollQuery(period: string) {
  return useQuery({
    queryKey: driverKeys.payroll(period),
    queryFn: () => fetchPayroll(period),
    staleTime: 60_000,
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
      return pollInterval(query, data?.kind === 'stop' ? data.screen.refreshMs : false)
    },
  })
}

/** Chi tiết đầy đủ chuyến đi của tài xế. */
export function useDriverTripDetailQuery(tripId: string) {
  return useQuery({
    queryKey: driverKeys.detail(tripId),
    queryFn: () => fetchTripDetail(tripId),
    staleTime: 0,
    enabled: tripId.length > 0,
  })
}

/** Danh sách sự cố trên đường đã báo cáo của chuyến đang giao. */
export function useTripExceptionsQuery(tripId: string, enabled: boolean) {
  return useQuery({
    queryKey: driverKeys.exceptions(tripId),
    queryFn: () => fetchTripExceptions(tripId),
    staleTime: 0,
    enabled: enabled && tripId.length > 0,
  })
}

/** Chuông: mở màn là đọc lại; `enabled` tắt khi nguồn chưa có thông báo. */
export function useNotificationsQuery(enabled: boolean) {
  return useQuery({ queryKey: driverKeys.notifications, queryFn: fetchNotifications, enabled, staleTime: 0 })
}

/** Đánh dấu đã đọc ở máy chủ: danh sách máy chủ trả lại thay cho danh sách đang hiện, không đọc lại. */
export function useMarkNotificationsReadMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (ids: readonly string[]) => markNotificationsRead(ids),
    onSuccess: (list) => client.setQueryData(driverKeys.notifications, list),
  })
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

/** Danh sách chuyến đang mở (chưa có tài xế) của công ty. */
export function useOpenTripsQuery() {
  return useQuery({
    queryKey: driverKeys.openTrips,
    queryFn: fetchOpenTrips,
    staleTime: 0,
  })
}

/** Xin nhận một chuyến đang mở. */
export function useClaimTripMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, note }: { tripId: string; note?: string }) => claimTrip(tripId, note),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: driverKeys.openTrips })
    },
  })
}

/** Rút phiếu xin chuyến đang chờ duyệt. */
export function useCancelClaimMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tripId: string) => cancelClaim(tripId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: driverKeys.openTrips })
    },
  })
}
