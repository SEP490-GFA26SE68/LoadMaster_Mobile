import type { VehicleConfig } from '@/domain/models'
import type {
  AuditEvent,
  DeliveryRequirement,
  ManualConfirmReason,
  RequirementStatus,
  Revision,
  Trip,
  TripEta,
  TripPhase,
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
  /** Dòng phụ của phương án và tiến độ kho trên danh sách: số "cần bạn xử lý", số hổ phách của tab Đã lập kế hoạch. */
  readonly planStatus: boolean
}

/** Người trong nhật ký của chuyến: người làm từng bước của tiến trình, người sửa làm phương án lỗi thời. */
export type TripPerson = Pick<User, 'id' | 'fullName'>

/** Chi tiết một chuyến (chỉ đọc) của kho mẫu: chuyến, xe, tài xế, trạng thái, revision, nhật ký và tuyến đã tối ưu của nó. */
export type FullTripDetail = {
  readonly kind: 'full'
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

/** Một điểm của chuyến theo máy chủ: số điểm là `stopSequence`; mốc giờ ISO 8601. */
export type ServerTripStop = {
  readonly id: string
  readonly number: number
  readonly name: string
  readonly address: string
  readonly lat?: number
  readonly lng?: number
  readonly kind: 'DELIVERY' | 'PICKUP'
  readonly status: 'PENDING' | 'ARRIVED' | 'COMPLETED'
  readonly requirementId?: string
  readonly plannedArrival?: string
  readonly actualArrival?: string
  readonly deadline?: string
}

/**
 * Chi tiết một chuyến theo máy chủ (`GET /api/trips/{id}/detail`): đầu chuyến và các điểm. Máy chủ không trả phương án, nhật ký, tiến độ
 * kho hay tóm tắt hàng nên màn chỉ vẽ phần này — không thẻ nào của kho mẫu được vẽ thiếu số.
 */
export type ServerTripDetail = {
  readonly kind: 'server'
  /** Mã chuyến. */
  readonly id: string
  readonly name: string
  readonly status: TripStatus
  readonly phase: TripPhase
  /** ISO 8601; `null` khi chuyến chưa có giờ xuất phát. */
  readonly departureAt: string | null
  /** "Tên xe · biển số"; rỗng khi chưa gán xe. */
  readonly vehicleName: string
  readonly driverName: string | null
  readonly depot: { readonly name: string; readonly address: string; readonly lat?: number; readonly lng?: number } | null
  readonly packageCount: number
  readonly cancelReason?: string
  readonly stops: readonly ServerTripStop[]
}

/** Chi tiết chuyến: đủ thẻ (kho mẫu) hoặc phần máy chủ trả. */
export type TripDetail = FullTripDetail | ServerTripDetail

/** Pha của chuyến, ở cả hai dạng chi tiết. */
export const detailPhase = (detail: TripDetail): TripPhase => (detail.kind === 'full' ? detail.trip.phase : detail.phase)

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
  /** Mã của lần báo thiếu, dùng khi quyết. */
  readonly id: string
  readonly packageInstanceId: string
  readonly packageName: string
  /** Mã kiện của bên gửi. */
  readonly packageCode: string
  /** Vắng khi nguồn không nói kiện thuộc điểm nào. */
  readonly stopNumber?: number
  /** ISO 8601 */
  readonly at: string
  /** Họ tên người báo; `null` khi kho không còn tài khoản đó, hoặc báo thiếu ghi khi không có phiên. */
  readonly reporterName: string | null
}
