import { useMutation, useQuery, useQueryClient, type Query, type QueryKey } from '@tanstack/react-query'

import { OFFICE_QUERY_ROOTS } from '@/data/query-roots'
import type { DeadlineRenegotiationInput, TripExceptionInput } from '@/lib/mock-db'
import { pollInterval } from '@/lib/polling'

import {
  confirmReroute,
  escalateTripException,
  fetchLiveTrip,
  fetchMonitoringBoard,
  fetchNotifications,
  fetchTripRequirements,
  listTripMonitoring,
  monitoringCapabilities,
  renegotiateDeadline,
  reportTripException,
  requestReroute,
  resolveTripException,
  type MonitoringCapabilities,
} from './monitoring-api'

const NO_CAPABILITIES: MonitoringCapabilities = { exceptions: false, reroute: false, escalation: false, pickups: false, notifications: false }

/**
 * Việc của màn giám sát làm được với nguồn đang dùng: màn chỉ vẽ nút của việc nguồn làm được. Nguồn chưa nối (`HTTP_NOT_WIRED`) thì không
 * có việc nào — lỗi đó vẫn hiện ở truy vấn của màn, không bị nuốt.
 */
export function useMonitoringCapabilities(): MonitoringCapabilities {
  try {
    return monitoringCapabilities()
  } catch {
    return NO_CAPABILITIES
  }
}

/** Khoá truy vấn của giám sát, sự cố, nhận hàng dọc đường và chuông của điều phối viên, quản lý — mọi khoá nằm dưới `['monitoring']`. */
export const monitoringKeys = {
  all: ['monitoring'] as const,
  board: ['monitoring', 'board'] as const,
  fleet: ['monitoring', 'fleet'] as const,
  live: (tripId: string) => ['monitoring', 'live', tripId] as const,
  requirements: (tripId: string) => ['monitoring', 'requirements', tripId] as const,
  pickups: (tripId: string) => ['monitoring', 'pickups', tripId] as const,
  notifications: ['monitoring', 'notifications'] as const,
}

/** Phần ít đổi của các chuyến đang chạy (xe, tài xế, điểm giao): chuyến bắt đầu, kết thúc ở nơi khác nên mỗi lần mở màn đọc lại. */
export function useMonitoringBoardQuery() {
  return useQuery({ queryKey: monitoringKeys.board, queryFn: fetchMonitoringBoard, staleTime: 0 })
}

/**
 * Vị trí, giờ đến và sự cố của mọi chuyến đang chạy. Kho không tự chạy: nó ghi điểm vị trí mới mỗi lần được đọc, nên màn đọc lại theo
 * chuyến có điểm vị trí kế tiếp sớm nhất (`refreshMs`) bằng `refetchInterval` — không hẹn giờ riêng; không chuyến nào chạy là thôi nhịp.
 */
export function useFleetMonitoringQuery() {
  return useQuery({
    queryKey: monitoringKeys.fleet,
    queryFn: listTripMonitoring,
    staleTime: 0,
    refetchInterval: (query) => {
      const waits = (query.state.data ?? []).flatMap((trip) => (trip.refreshMs === null ? [] : [trip.refreshMs]))
      return pollInterval(query, waits.length > 0 ? Math.min(...waits) : false)
    },
  })
}

/** Giám sát một chuyến; còn chạy thì đọc lại theo nhịp điểm vị trí của nó, thôi chạy (`refreshMs` là `null`) thì đứng yên. */
export function useLiveTripQuery(tripId: string) {
  return useQuery({
    queryKey: monitoringKeys.live(tripId),
    queryFn: () => fetchLiveTrip(tripId),
    staleTime: 0,
    refetchInterval: (query) => pollInterval(query, query.state.data?.live.refreshMs),
  })
}

/** Yêu cầu giao của chuyến, cho tờ gia hạn; chỉ đọc khi tờ mở. */
export function useTripRequirementsQuery(tripId: string, enabled: boolean) {
  return useQuery({ queryKey: monitoringKeys.requirements(tripId), queryFn: () => fetchTripRequirements(tripId), enabled, staleTime: 0 })
}

/** Chuông của điều phối viên và quản lý: mở màn là đọc lại; không gọi nguồn khi nguồn chưa có thông báo. */
export function useOfficeNotificationsQuery() {
  const { notifications } = useMonitoringCapabilities()
  return useQuery({ queryKey: monitoringKeys.notifications, queryFn: fetchNotifications, enabled: notifications, staleTime: 0 })
}

/** Khoá `key` là tiền tố của khoá truy vấn (cách Query so khoá, mọi phần ở đây là chữ). */
const startsWith = (query: Query, key: QueryKey) => key.every((part, index) => query.queryKey[index] === part)

/**
 * Mọi lệnh ghi của điều phối viên và quản lý: xong — kể cả lỗi, nơi khác có thể vừa ghi trước — thì đọc lại thứ màn đang hiện (`shown`) và
 * chờ nó, để màn không bao giờ còn hiện trạng thái cũ sau một lần ghi thành công; mọi gốc khác của `OFFICE_QUERY_ROOTS` (danh sách chuyến,
 * bảng điều khiển, phần còn lại của giám sát, chuông) làm mới ngầm, không bắt người dùng chờ. Khoá đã chờ không làm mới lần nữa: lần làm
 * mới thứ hai huỷ lần đọc đang chạy và đọc lại từ đầu.
 */
export function useOfficeMutation<Input, Result>(shown: readonly QueryKey[], mutationFn: (input: Input) => Promise<Result>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => {
      const awaited = Promise.all(shown.map((queryKey) => client.invalidateQueries({ queryKey })))
      for (const root of OFFICE_QUERY_ROOTS) {
        void client.invalidateQueries({ queryKey: root, predicate: (query) => !shown.some((key) => startsWith(query, key)) })
      }
      return awaited
    },
  })
}

/** Báo sự cố từ màn giám sát một chuyến (điều phối viên). */
export function useReportExceptionMutation(tripId: string) {
  return useOfficeMutation([monitoringKeys.live(tripId)], (input: TripExceptionInput) => reportTripException(tripId, input))
}

export function useEscalateExceptionMutation(tripId: string) {
  return useOfficeMutation([monitoringKeys.live(tripId)], (exceptionId: string) => escalateTripException(tripId, exceptionId))
}

export function useResolveExceptionMutation(tripId: string) {
  return useOfficeMutation([monitoringKeys.live(tripId)], ({ exceptionId, note }: { exceptionId: string; note: string | undefined }) =>
    resolveTripException(tripId, exceptionId, note),
  )
}

/**
 * "Tìm tuyến khác": kho giữ lần tìm gần nhất để xác nhận và ghi bù vị trí xe, nên đây là lệnh ghi — nhưng màn không hiện gì của lần tìm ngoài
 * tờ đang mở, nên không chờ đọc lại gì; phần còn lại làm mới ngầm.
 */
export function useRequestRerouteMutation(tripId: string) {
  return useOfficeMutation([], () => requestReroute(tripId))
}

export function useConfirmRerouteMutation(tripId: string) {
  return useOfficeMutation([monitoringKeys.live(tripId)], (routeIndex: number) => confirmReroute(tripId, routeIndex))
}

/**
 * Gia hạn của quản lý: mở từ tab "Sự cố cần xử lý" (giám sát cả đội xe) hoặc từ màn một chuyến — chờ cả hai; khoá không có màn nào đang
 * mở thì không đọc lại, nên chờ thêm khoá kia không tốn gì.
 */
export function useRenegotiateDeadlineMutation(tripId: string) {
  return useOfficeMutation(
    [monitoringKeys.fleet, monitoringKeys.live(tripId)],
    ({ exceptionId, input }: { exceptionId: string; input: DeadlineRenegotiationInput }) => renegotiateDeadline(tripId, exceptionId, input),
  )
}
