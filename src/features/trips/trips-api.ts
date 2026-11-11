/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`trips-mock.ts` kho mẫu, `trips-http.ts` backend).
 *   fetchTrips                  GET  /api/trips (mọi trang)
 *   fetchTripDetail             GET  /api/trips?search= · GET /api/trips/{id}/detail
 *   fetchManualConfirmations    GET  /api/trips/{id}/manual-confirmations
 *   approveManualConfirmation   POST /api/trips/{id}/manual-confirmations/{cid}/approve
 *   rejectManualConfirmation    POST /api/trips/{id}/manual-confirmations/{cid}/reject
 *   fetchStagingShortages       GET  /api/trips/{id}/staging-shortages
 *   resolveStagingShortage      POST /api/trips/{id}/staging-shortages/{sid}/resolve
 *   fetchTripRequirements       chưa có ở BE (lọc yêu cầu giao theo chuyến)
 */
import { createAdapter } from '@/data/adapter'
import type { ShortageDecision } from '@/lib/mock-db'

import type { TripRow } from './trip-list'
import { httpTripsApi } from './trips-http'
import { mockTripsApi } from './trips-mock'
import type { ManualConfirmRow, ShortageRow, TripDetail, TripRequirementRow, TripsCapabilities } from './trips-model'

/**
 * Hợp đồng dữ liệu của màn chuyến (điều phối viên, quản lý công ty). Màn và hook chỉ biết hợp đồng này, không biết nguồn. Trên điện thoại
 * chuyến chỉ để xem; hai việc ghi là quyết định của điều phối viên với xác nhận tay và kiện kho báo thiếu — nguồn tự kiểm vai trò. Việc
 * nguồn chưa làm được thì `capabilities` nói rõ để màn ẩn thẻ đó.
 */
export type TripsApi = {
  readonly capabilities: TripsCapabilities
  /** Mọi chuyến của công ty người đang đăng nhập, kèm xe, tài xế, trạng thái và dòng phụ. */
  fetchTrips(): Promise<TripRow[]>
  /**
   * Một chuyến theo mã chuyến: kho mẫu kèm xe, tài xế, revision, nhật ký và tuyến đã tối ưu; máy chủ chỉ đầu chuyến và các điểm. Chuyến
   * không có (hoặc của công ty khác) là `NOT_FOUND` / `TRIP_NOT_FOUND`.
   */
  fetchTripDetail(tripId: string): Promise<TripDetail>
  /** Yêu cầu giao đã vào chuyến, theo thứ tự điểm giao rồi theo hạn. */
  fetchTripRequirements(tripId: string): Promise<TripRequirementRow[]>
  /** Xác nhận tay còn chờ duyệt của bước đang diễn ra (soạn, xếp lúc kho đang xếp; dỡ, nhận hàng lúc xe đang giao). */
  fetchManualConfirmations(tripId: string): Promise<ManualConfirmRow[]>
  /** Duyệt: kiện giữ kết quả đã ghi. Chỉ điều phối viên (`ROLE_NOT_ALLOWED`). */
  approveManualConfirmation(tripId: string, confirmationId: string): Promise<void>
  /** Từ chối kèm lý do bắt buộc: kết quả của kiện bị gỡ, người gửi phải đối chiếu lại. Chỉ điều phối viên. */
  rejectManualConfirmation(tripId: string, confirmationId: string, reason: string): Promise<void>
  /** Kiện kho đang báo thiếu lúc soạn hàng, theo thứ tự báo; chuyến không ở bước soạn thì không có dòng nào. */
  fetchStagingShortages(tripId: string): Promise<ShortageRow[]>
  /**
   * `KEEP_SEARCHING`: kho tìm tiếp. `DROP`: bỏ kiện khỏi chuyến — kiện về kho kiện kèm cờ "Không tìm thấy", chuyến về Đã lập kế hoạch với
   * phương án lỗi thời. Chỉ điều phối viên.
   */
  resolveStagingShortage(tripId: string, shortageId: string, decision: ShortageDecision): Promise<void>
}

const adapter = createAdapter<TripsApi>('trips', { mock: mockTripsApi, http: () => httpTripsApi() })

/** Việc màn chuyến làm được với nguồn đang dùng. */
export function tripsCapabilities(): TripsCapabilities {
  return adapter().capabilities
}

// GET /api/trips
export function fetchTrips(): Promise<TripRow[]> {
  return adapter().fetchTrips()
}

// GET /api/trips/{id}/detail
export function fetchTripDetail(tripId: string): Promise<TripDetail> {
  return adapter().fetchTripDetail(tripId)
}

// chưa có ở BE
export function fetchTripRequirements(tripId: string): Promise<TripRequirementRow[]> {
  return adapter().fetchTripRequirements(tripId)
}

// GET /api/trips/{id}/manual-confirmations
export function fetchManualConfirmations(tripId: string): Promise<ManualConfirmRow[]> {
  return adapter().fetchManualConfirmations(tripId)
}

// POST /api/trips/{id}/manual-confirmations/{cid}/approve
export function approveManualConfirmation(tripId: string, confirmationId: string): Promise<void> {
  return adapter().approveManualConfirmation(tripId, confirmationId)
}

// POST /api/trips/{id}/manual-confirmations/{cid}/reject
export function rejectManualConfirmation(tripId: string, confirmationId: string, reason: string): Promise<void> {
  return adapter().rejectManualConfirmation(tripId, confirmationId, reason)
}

// GET /api/trips/{id}/staging-shortages
export function fetchStagingShortages(tripId: string): Promise<ShortageRow[]> {
  return adapter().fetchStagingShortages(tripId)
}

// POST /api/trips/{id}/staging-shortages/{sid}/resolve
export function resolveStagingShortage(tripId: string, shortageId: string, decision: ShortageDecision): Promise<void> {
  return adapter().resolveStagingShortage(tripId, shortageId, decision)
}
