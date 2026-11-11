import type { AuditAction, StopKind, TripMonitoring } from '@/lib/mock-db'

/**
 * Kiểu dữ liệu của màn giám sát, cùng hình với bản web (`features/monitoring/monitoring-api.ts`): hàm thuần chép từ web
 * (`monitoring-view.ts`) đọc đúng các kiểu này qua `./monitoring-api`. Phần mobile thêm — việc nguồn làm được, một chuyến kèm giám sát của
 * nó, yêu cầu giao của chuyến, thông báo của văn phòng — nằm cuối file.
 */

/** Giám sát một chuyến đang chạy: vị trí xe, giờ đến và mức hạn từng điểm, cảnh báo, sự cố. Kết quả của máy chủ không mang MOCK RESULT. */
export type LiveMonitoring = Omit<TripMonitoring, 'isMockResult'> & { readonly isMockResult: boolean }

export type MonitoringStop = {
  readonly id: string
  readonly number: number
  readonly name: string
  /** Điểm nhận hàng dọc đường; vắng là điểm giao. */
  readonly kind?: StopKind
  readonly lat?: number
  readonly lng?: number
  readonly arrivedAt?: string
  readonly completedAt?: string
}

export type MonitoringTrip = {
  readonly tripId: string
  readonly name: string
  readonly vehicleName: string
  /** `null` khi chuyến chưa gán tài xế, hoặc kho không còn tài khoản đó. */
  readonly driverName: string | null
  /** Vắng khi nguồn dữ liệu không có toạ độ kho của tuyến; kho mẫu luôn có. */
  readonly depot?: { readonly name: string; readonly lat: number; readonly lng: number }
  readonly stops: readonly MonitoringStop[]
}

export type MonitoringBoard = {
  /** Chuyến Đang vận chuyển của công ty, theo thứ tự tạo chuyến — cùng thứ tự với danh sách giám sát. */
  readonly trips: readonly MonitoringTrip[]
  /** Họ tên theo mã người dùng, để đọc người báo và người xử lý sự cố. */
  readonly userNames: Readonly<Record<string, string>>
  /**
   * Mobile: số yêu cầu nhận hàng dọc đường còn chờ duyệt (Chờ duyệt, Đạt mười luật) theo mã chuyến, cho thẻ của chuyến. Bản web không có
   * trường này — nó đọc yêu cầu ở thẻ của chuyến đang chọn. Nguồn chưa có nhận hàng dọc đường thì rỗng.
   */
  readonly pendingPickups: Readonly<Record<string, number>>
}

/** Việc của màn giám sát mà nguồn dữ liệu đang dùng làm được; màn ẩn việc nguồn chưa làm được — không nút giả. */
export type MonitoringCapabilities = {
  /** Báo sự cố cấp chuyến và đánh dấu đã xử lý. */
  readonly exceptions: boolean
  /** Tìm tuyến khác tới điểm kế tiếp và chọn một tuyến. */
  readonly reroute: boolean
  /** Chuyển sự cố cho quản lý công ty; quản lý liên hệ khách và nhập hạn mới. */
  readonly escalation: boolean
  /** Yêu cầu nhận hàng dọc đường: xem, gửi, kiểm lại mười luật, duyệt, từ chối. */
  readonly pickups: boolean
  /** Chuông của điều phối viên và quản lý công ty. */
  readonly notifications: boolean
}

/**
 * Mobile: một chuyến cho màn giám sát một chuyến — phần ít đổi của chuyến (như một dòng của `MonitoringBoard`, nhưng đọc được cả khi chuyến
 * đã thôi chạy), họ tên người dùng và lần đọc giám sát mới nhất, trong **một** lần đọc: điểm đã đến, đã giao xong và giờ đến luôn khớp nhau.
 */
export type LiveTrip = {
  readonly trip: MonitoringTrip
  /** Chuyến còn Đang vận chuyển; thôi chạy thì giám sát không còn giờ đến và không đọc lại theo nhịp. */
  readonly running: boolean
  readonly userNames: Readonly<Record<string, string>>
  readonly live: LiveMonitoring
}

/**
 * Một yêu cầu giao của chuyến còn gia hạn được (để quản lý chọn yêu cầu cần gia hạn), như `RenegotiableRequirement` của web: còn đang
 * giao và còn một điểm giao chưa hoàn tất trong chuyến.
 */
export type RenegotiableRequirement = {
  readonly id: string
  /** Tên điểm giao; nguồn không có thì tên khách hay địa chỉ. */
  readonly destinationName: string
  /** Hạn hiện tại, ISO 8601. */
  readonly deadline: string
  /** Số điểm giao của yêu cầu trong chuyến. */
  readonly stopNumber: number
}

/**
 * Thông báo của điều phối viên và quản lý công ty: sự kiện nhật ký đã lọc theo vai trò người đọc (`selectNotifications`). Tham số giữ
 * nguyên mã như kho ghi; `names` là họ tên của những người mà tham số nêu mã (người gửi, tài xế) — vắng khi kho không còn tài khoản đó.
 */
export type OfficeNotification = {
  readonly id: string
  /** ISO 8601 */
  readonly at: string
  readonly action: AuditAction
  /** Họ tên người làm; `null` là việc của hệ thống, hoặc kho không còn tài khoản đó (`actorId` vẫn còn). */
  readonly actorName: string | null
  readonly actorId: string | null
  readonly target: { readonly type: string; readonly id: string; readonly label: string | undefined }
  readonly params: Readonly<Record<string, string | number>>
  readonly names: Readonly<Record<string, string>>
}
