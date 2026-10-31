import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/react-query'

import { lookupKeys } from '@/features/lookup/useLookupQueries'
import type { ManualConfirmInput } from '@/lib/mock-db'

import {
  completeLoading,
  confirmLoadingByQr,
  confirmLoadingManually,
  confirmStagingByQr,
  confirmStagingManually,
  fetchNotifications,
  fetchTripLabels,
  fetchWarehouseTrip,
  fetchWarehouseTrips,
  recordSeal,
  reportDamagedPackage,
  reportStagingShortage,
  startLoading,
  warehouseCapabilities,
} from './warehouse-api'
import type { VerifyCodeInput, WarehouseCapabilities } from './warehouse-model'

const NO_CAPABILITIES: WarehouseCapabilities = { manualConfirm: false, shortages: false, seal: false, notifications: false }

/**
 * Việc kho làm được với nguồn đang dùng: màn chỉ vẽ nút của việc nguồn làm được. Nguồn chưa nối (`HTTP_NOT_WIRED`) thì không có việc
 * nào — lỗi đó vẫn hiện ở truy vấn của màn, không bị nuốt.
 */
export function useWarehouseCapabilities(): WarehouseCapabilities {
  try {
    return warehouseCapabilities()
  } catch {
    return NO_CAPABILITIES
  }
}

/** Khoá truy vấn của màn kho, mọi khoá nằm dưới `['warehouse']`. */
export const warehouseKeys = {
  all: ['warehouse'] as const,
  trips: ['warehouse', 'trips'] as const,
  trip: (tripId: string) => ['warehouse', 'trip', tripId] as const,
  labels: (tripId: string) => ['warehouse', 'labels', tripId] as const,
  notifications: ['warehouse', 'notifications'] as const,
}

/** Danh sách chuyến của kho: pha của chuyến đổi ở nơi khác (điều phối duyệt, tài xế xuất phát) nên mỗi lần mở màn đọc lại. */
export function useWarehouseTrips() {
  return useQuery({ queryKey: warehouseKeys.trips, queryFn: fetchWarehouseTrips, staleTime: 0 })
}

/** Một chuyến và các revision của nó — nguồn của phiên soạn → xếp (`warehouseSession`). */
export function useWarehouseTrip(tripId: string) {
  return useQuery({ queryKey: warehouseKeys.trip(tripId), queryFn: () => fetchWarehouseTrip(tripId), staleTime: 0 })
}

/** Nhãn QR của chuyến; `tripId` rỗng thì không gọi nguồn. */
export function useWarehouseLabels(tripId: string) {
  return useQuery({ queryKey: warehouseKeys.labels(tripId), queryFn: () => fetchTripLabels(tripId), enabled: tripId !== '' })
}

/** Chuông: mở màn là đọc lại; không gọi nguồn khi nguồn chưa có thông báo. */
export function useWarehouseNotifications() {
  const { notifications } = useWarehouseCapabilities()
  return useQuery({ queryKey: warehouseKeys.notifications, queryFn: fetchNotifications, enabled: notifications, staleTime: 0 })
}

/*
 * Lệnh ghi của kho chỉ chờ đúng thứ màn của phiên đang đọc: chuyến đang xếp, và nhãn của chuyến lúc bắt đầu phiên — không có lúc màn còn
 * hiện kiện vừa ghi như chưa ghi. Danh sách chuyến, chuông và kết quả tra cứu kiện (mỗi bước soạn, xếp đổi trạng thái hoặc cờ của kiện)
 * đọc lại sau, không bắt người xếp chờ. Nhãn không được đọc lại sau mỗi bước ghi: nhãn không đổi trong phiên xếp (chuyến bị khoá từ lúc
 * bắt đầu xếp) — đọc lại hàng trăm nhãn sau mỗi lần quét chỉ làm mỗi bước chậm hơn. Bắt đầu phiên thì đọc lại cả nhãn: dòng kiện có thể
 * đã đổi từ lần đọc trước (lập lại phương án sau một lần quay về Đã lập kế hoạch đánh số lại kiện). Cache xoá sạch lúc đăng nhập, đăng
 * xuất; mở lại màn là đọc lại nhãn.
 */

/** Truy vấn của kho được làm mới mà không chờ: mọi thứ trừ nhãn và chuyến của phiên (chuyến được chờ riêng). */
const inBackground = (tripId: string) => (query: Query) =>
  query.queryKey[1] !== 'labels' && !(query.queryKey[1] === 'trip' && query.queryKey[2] === tripId)

type Refresh = {
  /** Đọc lại cả nhãn QR của chuyến (bắt đầu phiên). */
  readonly labels?: boolean
}

/**
 * Mọi lệnh ghi trên chuyến `tripId` của kho: xong — kể cả lỗi, máy khác có thể vừa ghi trước — thì làm mới chuyến của phiên (và nhãn khi
 * `labels`), phần còn lại của kho trừ nhãn, và mọi kết quả tra cứu kiện. Chỉ chờ phần của phiên: lệnh xong khi màn đã đọc lại chuyến
 * (và nhãn); danh sách chuyến, chuông, tra cứu kiện đọc lại sau.
 */
function useWarehouseMutation<Input, Result>(tripId: string, mutationFn: (input: Input) => Promise<Result>, { labels = false }: Refresh = {}) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => {
      const session = Promise.all([
        client.invalidateQueries({ queryKey: warehouseKeys.trip(tripId) }),
        ...(labels ? [client.invalidateQueries({ queryKey: warehouseKeys.labels(tripId) })] : []),
      ])
      // Không chờ. Chuyến của phiên không làm mới lần nữa ở đây: lần làm mới thứ hai huỷ lần đọc đang chạy và đọc lại từ đầu
      void client.invalidateQueries({ queryKey: warehouseKeys.all, predicate: inBackground(tripId) })
      void client.invalidateQueries({ queryKey: lookupKeys.all })
      return session
    },
  })
}

/** Bắt đầu phiên xếp. Kể cả khi bị từ chối (ví dụ máy khác vừa bắt đầu trước), đọc lại để màn theo đúng pha trong kho. */
export function useStartLoadingMutation(tripId: string) {
  return useWarehouseMutation(tripId, () => startLoading(tripId), { labels: true })
}

export function useConfirmStagingByQrMutation(tripId: string) {
  return useWarehouseMutation(tripId, (input: VerifyCodeInput) => confirmStagingByQr(tripId, input))
}

export function useConfirmStagingManuallyMutation(tripId: string) {
  return useWarehouseMutation(tripId, (input: ManualConfirmInput) => confirmStagingManually(tripId, input))
}

export function useReportShortageMutation(tripId: string) {
  return useWarehouseMutation(tripId, (packageInstanceId: string) => reportStagingShortage(tripId, packageInstanceId))
}

export function useReportDamagedMutation(tripId: string) {
  return useWarehouseMutation(tripId, (packageInstanceId: string) => reportDamagedPackage(tripId, packageInstanceId))
}

export function useCompleteLoadingMutation(tripId: string) {
  return useWarehouseMutation(tripId, () => completeLoading(tripId))
}

export function useConfirmLoadingByQrMutation(tripId: string) {
  return useWarehouseMutation(tripId, (input: VerifyCodeInput) => confirmLoadingByQr(tripId, input))
}

export function useConfirmLoadingManuallyMutation(tripId: string) {
  return useWarehouseMutation(tripId, (input: ManualConfirmInput) => confirmLoadingManually(tripId, input))
}

export function useRecordSealMutation(tripId: string) {
  return useWarehouseMutation(tripId, (sealNumber: string) => recordSeal(tripId, sealNumber))
}
