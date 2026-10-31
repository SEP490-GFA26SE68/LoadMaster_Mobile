/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`warehouse-mock.ts` kho mẫu; backend chưa có adapter: nguồn `http` là lỗi
 * `HTTP_NOT_WIRED`).
 *   startLoading            POST /api/trips/{id}/start-loading
 *   confirmStagingByQr      POST /api/warehouse/verify-package
 *   confirmLoadingByQr      POST /api/warehouse/placements/{id}/confirm
 *   reportDamagedPackage    POST /api/warehouse/placements/{id}/deviation
 *   completeLoading         POST /api/trips/{id}/complete-loading
 *   chưa có ở BE: fetchWarehouseTrips, fetchWarehouseTrip, fetchTripLabels, fetchNotifications
 *   chưa có ở BE (Q-11): confirmStagingManually, reportStagingShortage, recordSeal, confirmLoadingManually
 *   tên sẽ đổi khi nối BE: confirmStagingByQr → verifyPackage; confirmLoadingByQr → confirmPlacement;
 *   reportDamagedPackage → reportPlacementDeviation
 */
import { createAdapter } from '@/data/adapter'
import type { ManualConfirmInput, ScanResult, StagingScanResult, Trip, TripLabel } from '@/lib/mock-db'

import { mockWarehouseApi } from './warehouse-mock'
import type { VerifyCodeInput, WarehouseCapabilities, WarehouseNotification, WarehouseTrip } from './warehouse-model'
import type { WarehouseTripRow } from './warehouse-trips'

/**
 * Hợp đồng dữ liệu của màn kho. Màn và hook chỉ biết hợp đồng này, không biết nguồn. Kho chỉ làm theo phương án **đã duyệt**; mọi kiện
 * được ghi "đã soạn" / "đã xếp" qua đối chiếu — bằng nhãn, hoặc xác nhận tay chờ điều phối viên duyệt — không có lệnh ghi không đối
 * chiếu. Việc nguồn chưa làm được thì `capabilities` nói rõ để màn ẩn nút đó.
 */
export type WarehouseApi = {
  readonly capabilities: WarehouseCapabilities
  /** Chuyến kho cần thấy: chờ soạn (bản duyệt còn hiệu lực), đang xếp, xếp xong chờ xuất phát, chờ điều phối tối ưu lại. */
  fetchWarehouseTrips(): Promise<WarehouseTripRow[]>
  /** Một chuyến và các revision của nó; chuyến không có (hoặc của công ty khác) là `NOT_FOUND`. */
  fetchWarehouseTrip(tripId: string): Promise<WarehouseTrip>
  /** Bắt đầu theo bản duyệt mới nhất: Đã lập kế hoạch → Đang xếp hàng, ở bước soạn hàng. */
  startLoading(tripId: string): Promise<Trip>
  /** Soạn một kiện vào khu chờ bằng nhãn, không cần thứ tự; kiện đã soạn thì không ghi gì (`alreadyStaged`). */
  confirmStagingByQr(tripId: string, input: VerifyCodeInput): Promise<StagingScanResult<Trip>>
  /** Soạn một kiện bằng xác nhận tay: ghi "đã soạn" kèm xác nhận tay chờ điều phối viên duyệt. */
  confirmStagingManually(tripId: string, input: ManualConfirmInput): Promise<ScanResult<Trip>>
  /** Báo một kiện chưa soạn là không tìm thấy: điều phối viên quyết tìm tiếp hay bỏ kiện khỏi chuyến. */
  reportStagingShortage(tripId: string, packageInstanceId: string): Promise<Trip>
  /**
   * Đối chiếu kiện của bước xếp hiện tại bằng nhãn. Kiện cuối cùng có kết quả thì nguồn hoàn tất xếp luôn (Đang xếp → xếp xong) — trừ
   * khi còn xác nhận tay (lúc soạn hoặc lúc xếp) chờ duyệt: chuyến ở lại "đang xếp".
   */
  confirmLoadingByQr(tripId: string, input: VerifyCodeInput): Promise<ScanResult<Trip>>
  /** Xác nhận tay kiện của bước xếp hiện tại: ghi "đã xếp" kèm xác nhận tay chờ duyệt. Không bao giờ tự hoàn tất xếp. */
  confirmLoadingManually(tripId: string, input: ManualConfirmInput): Promise<ScanResult<Trip>>
  /**
   * Báo kiện của bước xếp hiện tại bị hỏng. Không kiện nào tựa lên nó trong phương án: kiện bị bỏ lại kho, chuyến vẫn đang xếp — và là
   * kiện cuối cùng thì hoàn tất xếp luôn, như `confirmLoadingByQr`. Có kiện tựa lên: chuyến về Đã lập kế hoạch (`phase` trả về nói).
   */
  reportDamagedPackage(tripId: string, packageInstanceId: string): Promise<Trip>
  /** Hoàn tất xếp khi mọi kiện đã có kết quả và không còn xác nhận tay chờ duyệt. */
  completeLoading(tripId: string): Promise<Trip>
  /** Ghi số seal khi đã xếp xong, trước khi xe chạy: số trống hoặc quá dài là `SEAL_INVALID`, chuyến chưa xếp xong `TRIP_PHASE_INVALID`. */
  recordSeal(tripId: string, sealNumber: string): Promise<Trip>
  /** Nhãn QR mọi kiện của chuyến: tên kiện cho câu báo sai kiện, mã của bên gửi cho ô gõ mã. */
  fetchTripLabels(tripId: string): Promise<TripLabel[]>
  fetchNotifications(): Promise<WarehouseNotification[]>
}

const adapter = createAdapter<WarehouseApi>('warehouse', { mock: mockWarehouseApi })

/** Việc kho làm được với nguồn đang dùng. */
export function warehouseCapabilities(): WarehouseCapabilities {
  return adapter().capabilities
}

// chưa có ở BE
export function fetchWarehouseTrips(): Promise<WarehouseTripRow[]> {
  return adapter().fetchWarehouseTrips()
}

// chưa có ở BE
export function fetchWarehouseTrip(tripId: string): Promise<WarehouseTrip> {
  return adapter().fetchWarehouseTrip(tripId)
}

// POST /api/trips/{id}/start-loading
export function startLoading(tripId: string): Promise<Trip> {
  return adapter().startLoading(tripId)
}

// POST /api/warehouse/verify-package
export function confirmStagingByQr(tripId: string, input: VerifyCodeInput): Promise<StagingScanResult<Trip>> {
  return adapter().confirmStagingByQr(tripId, input)
}

// chưa có ở BE (Q-11)
export function confirmStagingManually(tripId: string, input: ManualConfirmInput): Promise<ScanResult<Trip>> {
  return adapter().confirmStagingManually(tripId, input)
}

// chưa có ở BE (Q-11)
export function reportStagingShortage(tripId: string, packageInstanceId: string): Promise<Trip> {
  return adapter().reportStagingShortage(tripId, packageInstanceId)
}

// POST /api/warehouse/placements/{id}/confirm
export function confirmLoadingByQr(tripId: string, input: VerifyCodeInput): Promise<ScanResult<Trip>> {
  return adapter().confirmLoadingByQr(tripId, input)
}

// chưa có ở BE (Q-11)
export function confirmLoadingManually(tripId: string, input: ManualConfirmInput): Promise<ScanResult<Trip>> {
  return adapter().confirmLoadingManually(tripId, input)
}

// POST /api/warehouse/placements/{id}/deviation
export function reportDamagedPackage(tripId: string, packageInstanceId: string): Promise<Trip> {
  return adapter().reportDamagedPackage(tripId, packageInstanceId)
}

// POST /api/trips/{id}/complete-loading
export function completeLoading(tripId: string): Promise<Trip> {
  return adapter().completeLoading(tripId)
}

// chưa có ở BE (Q-11)
export function recordSeal(tripId: string, sealNumber: string): Promise<Trip> {
  return adapter().recordSeal(tripId, sealNumber)
}

// chưa có ở BE
export function fetchTripLabels(tripId: string): Promise<TripLabel[]> {
  return adapter().fetchTripLabels(tripId)
}

// chưa có ở BE
export function fetchNotifications(): Promise<WarehouseNotification[]> {
  return adapter().fetchNotifications()
}
