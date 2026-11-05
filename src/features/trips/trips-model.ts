import type { VehicleConfig } from '@/domain/models'
import type {
  AuditEvent,
  DeliveryRequirement,
  ManualConfirmReason,
  RequirementStatus,
  Revision,
  Trip,
  TripEta,
  VerifyContext,
} from '@/lib/mock-db'
import type { TripStatus, TripSubStatus } from '@/types/trip'
import type { User } from '@/types/user'

/*
 * Dữ liệu màn chuyến của điều phối viên và quản lý công ty ở dạng màn cần, không phụ thuộc nguồn. Dòng danh sách (`TripRow`), tóm tắt
 * hàng hoá, tiến trình và lý do lỗi thời dùng logic chép từ web (`trip-list.ts`, `trip-summary.ts`, `trip-progress.ts`,
 * `trip-detail.ts`); ở đây chỉ có phần riêng của hợp đồng `TripsApi`.
 */

/**
 * Việc màn chuyến làm được với nguồn dữ liệu đang dùng. Kho mẫu làm được hết; backend chưa có các việc dưới đây. Màn ẩn việc nguồn chưa
 * làm được — không nút giả.
 */
export type TripsCapabilities = {
  /** Thẻ "Xác nhận tay chờ duyệt": đọc, duyệt, từ chối. */
  readonly manualConfirms: boolean
  /** Thẻ "Kiện kho báo thiếu": đọc, tìm tiếp, bỏ kiện khỏi chuyến. */
  readonly shortages: boolean
  /** Thẻ "Yêu cầu giao của chuyến". */
  readonly requirements: boolean
}

/** Người trong nhật ký của chuyến: người làm từng bước của tiến trình, người sửa làm phương án lỗi thời. */
export type TripPerson = Pick<User, 'id' | 'fullName'>

/** Chi tiết một chuyến (chỉ đọc): chuyến, xe, tài xế, trạng thái, revision, nhật ký và tuyến đã tối ưu của nó. */
export type TripDetail = {
  readonly trip: Trip
  readonly vehicle: VehicleConfig
  /** `null` khi chưa gán tài xế, hoặc tài khoản không còn trong kho. */
  readonly driver: Pick<User, 'id' | 'fullName' | 'phone'> | null
  readonly status: TripStatus
  /** Dòng phụ dưới chip: phương án chờ duyệt / đã duyệt / lỗi thời, hoặc tiến độ kho. */
  readonly sub: TripSubStatus | null
  /** Dòng phụ thứ hai: tuyến có điểm trễ hạn dự kiến, hoặc xác nhận tay chờ duyệt. */
  readonly extraSub: TripSubStatus | null
  /** Theo thứ tự kho trả (cũ trước). */
  readonly revisions: readonly Revision[]
  /** Nhật ký của chuyến, mới nhất trước. */
  readonly events: readonly AuditEvent[]
  readonly people: readonly TripPerson[]
  /** Giờ đến dự kiến và mức hạn của tuyến đã tối ưu; `null` khi chưa tối ưu tuyến. */
  readonly eta: TripEta | null
}

/** Một yêu cầu giao đã vào chuyến, kèm trạng thái đọc từ kiện của nó và số điểm giao trong chuyến. */
export type TripRequirementRow = {
  readonly requirement: DeliveryRequirement
  readonly status: RequirementStatus
  /** Vắng khi chưa kiện nào của yêu cầu nằm ở một điểm của chuyến. */
  readonly stopNumber?: number
}

/** Một xác nhận tay còn chờ duyệt, kèm tên kiện và tên người gửi để đọc. */
export type ManualConfirmRow = {
  readonly id: string
  readonly context: VerifyContext
  /** Điểm giao khi xác nhận lúc dỡ hoặc lúc nhận hàng dọc đường. */
  readonly stopNumber?: number
  readonly packageInstanceId: string
  readonly packageName: string
  readonly reason: ManualConfirmReason
  readonly note?: string
  /** ISO 8601 */
  readonly at: string
  /** Họ tên người gửi; `null` khi kho không còn tài khoản đó, hoặc xác nhận ghi khi không có phiên. */
  readonly senderName: string | null
}

/** Một kiện kho đang báo thiếu, kèm tên kiện và tên người báo để đọc. */
export type ShortageRow = {
  readonly packageInstanceId: string
  readonly packageName: string
  /** Mã kiện của bên gửi. */
  readonly packageCode: string
  readonly stopNumber: number
  /** ISO 8601 */
  readonly at: string
  /** Họ tên người báo; `null` khi kho không còn tài khoản đó, hoặc báo thiếu ghi khi không có phiên. */
  readonly reporterName: string | null
}
