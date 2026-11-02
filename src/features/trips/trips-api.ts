/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`trips-mock.ts` kho mẫu; backend chưa có adapter: nguồn `http` là lỗi
 * `HTTP_NOT_WIRED`).
 *   fetchTripRequirements      GET /api/delivery-requirements (lọc theo chuyến: chưa có ở BE)
 *   chưa có ở BE: fetchTrips, fetchTripDetail (giờ đến của tuyến: GET /api/trips/{id}/eta)
 *   chưa có ở BE (Q-11): fetchManualConfirmations, approveManualConfirmation, rejectManualConfirmation, fetchStagingShortages,
 *   resolveStagingShortage
 */
import { createAdapter } from '@/data/adapter'
import type { ShortageDecision, Trip } from '@/lib/mock-db'

import type { TripRow } from './trip-list'
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
  /** Một chuyến kèm xe, tài xế, revision, nhật ký và tuyến đã tối ưu; chuyến không có (hoặc của công ty khác) là `NOT_FOUND`. */
  fetchTripDetail(tripId: string): Promise<TripDetail>
  /** Yêu cầu giao đã vào chuyến, theo thứ tự điểm giao rồi theo hạn. */
  fetchTripRequirements(tripId: string): Promise<TripRequirementRow[]>
  /** Xác nhận tay còn chờ duyệt của bước đang diễn ra (soạn, xếp lúc kho đang xếp; dỡ, nhận hàng lúc xe đang giao). */
  fetchManualConfirmations(tripId: string): Promise<ManualConfirmRow[]>
  /** Duyệt: kiện giữ kết quả đã ghi. Chỉ điều phối viên (`ROLE_NOT_ALLOWED`). */
  approveManualConfirmation(tripId: string, confirmationId: string): Promise<Trip>
  /** Từ chối kèm lý do bắt buộc: kết quả của kiện bị gỡ, người gửi phải đối chiếu lại. Chỉ điều phối viên. */
  rejectManualConfirmation(tripId: string, confirmationId: string, reason: string): Promise<Trip>
  /** Kiện kho đang báo thiếu lúc soạn hàng, theo thứ tự báo; chuyến không ở bước soạn thì không có dòng nào. */
  fetchStagingShortages(tripId: string): Promise<ShortageRow[]>
  /**
   * `KEEP_SEARCHING`: kho tìm tiếp. `DROP`: bỏ kiện khỏi chuyến — kiện về kho kiện kèm cờ "Không tìm thấy", chuyến về Đã lập kế hoạch với
   * phương án lỗi thời. Chỉ điều phối viên.
   */
  resolveStagingShortage(tripId: string, packageInstanceId: string, decision: ShortageDecision): Promise<Trip>
}

const adapter = createAdapter<TripsApi>('trips', { mock: mockTripsApi })

/** Việc màn chuyến làm được với nguồn đang dùng. */
export function tripsCapabilities(): TripsCapabilities {
  return adapter().capabilities
}

// chưa có ở BE
export function fetchTrips(): Promise<TripRow[]> {
  return adapter().fetchTrips()
}

// chưa có ở BE
export function fetchTripDetail(tripId: string): Promise<TripDetail> {
  return adapter().fetchTripDetail(tripId)
}

// GET /api/delivery-requirements
export function fetchTripRequirements(tripId: string): Promise<TripRequirementRow[]> {
  return adapter().fetchTripRequirements(tripId)
}

// chưa có ở BE (Q-11)
export function fetchManualConfirmations(tripId: string): Promise<ManualConfirmRow[]> {
  return adapter().fetchManualConfirmations(tripId)
}

// chưa có ở BE (Q-11)
export function approveManualConfirmation(tripId: string, confirmationId: string): Promise<Trip> {
  return adapter().approveManualConfirmation(tripId, confirmationId)
}

// chưa có ở BE (Q-11)
export function rejectManualConfirmation(tripId: string, confirmationId: string, reason: string): Promise<Trip> {
  return adapter().rejectManualConfirmation(tripId, confirmationId, reason)
}

// chưa có ở BE (Q-11)
export function fetchStagingShortages(tripId: string): Promise<ShortageRow[]> {
  return adapter().fetchStagingShortages(tripId)
}

// chưa có ở BE (Q-11)
export function resolveStagingShortage(tripId: string, packageInstanceId: string, decision: ShortageDecision): Promise<Trip> {
  return adapter().resolveStagingShortage(tripId, packageInstanceId, decision)
}
