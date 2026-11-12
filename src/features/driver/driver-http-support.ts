import { ApiError, isApiError } from '@/data/http'

import type { DriverCapabilities } from './driver-model'

/** Máy chủ không báo nhịp đọc lại: màn chuyến còn việc (đang soạn, xếp, giao) đọc lại mỗi 30 giây để thấy tiến độ ghi từ nơi khác. */
export const SERVER_REFRESH_MS = 30_000

/**
 * Việc tài xế làm được khi nguồn là máy chủ: xuất phát ở thẻ chuyến (máy chủ không mở màn điểm giao trước khi xe chạy), "Đã đến", dỡ và
 * xác nhận tay ở điểm giao, nhận kiện ở điểm nhận (không xác nhận tay — máy chủ chưa có), sự cố theo kiện và sự cố trên đường, vị trí điện
 * thoại. Chưa có ở máy chủ: yêu cầu nhận hàng của tài xế, thông báo.
 */
export const HTTP_DRIVER_CAPABILITIES: DriverCapabilities = {
  depart: false,
  departFromList: true,
  arrive: true,
  manualConfirm: true,
  pickupManualConfirm: false,
  deliveryIssues: true,
  tripExceptions: true,
  pickups: false,
  gps: true,
  notifications: false,
  gpsLocalOnly: false,
}

/**
 * Backend từ chối với mã HTTP `status`: phản hồi không kèm mã nghiệp vụ (client đặt mã chung `SERVER_ERROR`), hoặc kèm đúng mã `code`
 * của `ErrorCode` gây ra nó.
 */
export const refused = (error: unknown, status: number, code?: string): error is ApiError =>
  isApiError(error) && error.status === status && (error.code === 'SERVER_ERROR' || error.code === code)

/** Backend báo mã nghiệp vụ `code` (`AppException`). */
export const coded = (error: unknown, code: string): error is ApiError => isApiError(error) && error.code === code

/** Việc máy chủ chưa có: không âm thầm bỏ qua. */
export const unsupported = async (): Promise<never> => {
  throw new ApiError('NOT_SUPPORTED')
}
