/**
 * Chữ dùng ở nhiều màn: trạng thái tải, lỗi, nút chung, và nhãn của mã nghiệp vụ dùng ở nhiều màn (loại sự cố, mức hạn, cách đối
 * chiếu…) — khai một lần, key trùng mã của kho, câu giống bản web (nhánh `common` của web).
 */
export const common = {
  loading: 'Đang tải…',
  retry: 'Thử lại',
  loadFailed: 'Không tải được dữ liệu',
  back: 'Quay lại',
  close: 'Đóng',
  dismiss: 'Ẩn thông báo',
  stop: 'Điểm {number}',
  /** Liên từ nối hai phần tử cuối của danh sách khi máy không có `Intl.ListFormat` (Hermes): "A, B và C" (`lib/format.ts`). */
  listAnd: 'và',
  /** Loại sự cố giao của một kiện (`DeliveryIssueKind`). */
  deliveryIssueKinds: { damaged: 'Hàng hỏng', missing: 'Thiếu hàng', refused: 'Khách từ chối', other: 'Khác' },
  /** Loại sự cố cấp chuyến (`TripExceptionType`). */
  tripExceptionTypes: { TRAFFIC: 'Tắc đường', ACCIDENT: 'Tai nạn', ROAD_CONSTRUCTION: 'Công trình trên đường', VEHICLE_BREAKDOWN: 'Hỏng xe', OTHER: 'Khác' },
  /** Mức hạn của điểm giao theo giờ đến dự kiến (`DeadlineStatus`). */
  deadlineStatuses: { OK: 'Kịp hạn', AT_RISK: 'Sát hạn', MISSED: 'Trễ hạn dự kiến' },
  /** Giờ đến thật so với hạn giao của điểm. */
  arrivalStatuses: { onTime: 'Đến kịp hạn', late: 'Đến trễ hạn' },
  /** Ba mức đối chiếu kiện (`VerifyMethod`). */
  verifyMethods: { QR: 'Quét QR', CODE: 'Gõ mã', MANUAL: 'Xác nhận tay' },
  /** Lý do xác nhận tay (`ManualConfirmReason`). */
  manualConfirmReasons: { LABEL_DAMAGED: 'Nhãn rách / mất', QR_UNREADABLE: 'QR không đọc được', OTHER: 'Khác' },
} as const
