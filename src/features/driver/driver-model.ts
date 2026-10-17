import type { DriverNotice } from '@/features/notifications/notifications'
import type { DeliveryIssueKind, LabelVerifyMethod, ManualConfirmReason, StopKind, TripExceptionType } from '@/lib/mock-db'
import type { TripStatus, TripSubStatus } from '@/types/trip'

import type { DeliveryMode } from './delivery-progress'
import type { DeliveryArea, DeliveryLayer } from './driver-plan'
import type { MyTripGroup } from './my-trips'
import type { EtaSource, StopTiming } from './stop-timing'

/*
 * Dữ liệu màn tài xế ở dạng màn cần, không phụ thuộc nguồn. Kho mẫu dựng nó từ logic chép của web (`delivery-progress.ts`,
 * `driver-plan.ts`, `stop-timing.ts`…); backend dựng từ DTO của nó và để trống phần chưa có. Trường vắng nghĩa là nguồn không biết —
 * màn bỏ hẳn phần đó, không điền số thay.
 */

/**
 * Việc tài xế làm được với nguồn dữ liệu đang dùng. Kho mẫu làm được hết; backend hiện chỉ có một phần. Màn ẩn việc nguồn chưa làm được —
 * không nút giả.
 */
export type DriverCapabilities = {
  /** Bấm "Xuất phát" khi kho đã xếp xong. Không có: chuyến chỉ hiện từ lúc đã rời kho. */
  readonly depart: boolean
  /** Bấm "Đã đến" trước khi dỡ. Không có: tới điểm nào là dỡ được ngay. */
  readonly arrive: boolean
  /** Xác nhận tay một kiện khi nhãn không đọc được (chờ điều phối viên duyệt). */
  readonly manualConfirm: boolean
  /** Báo sự cố cho một kiện (hỏng, thiếu, khách từ chối, khác). */
  readonly deliveryIssues: boolean
  /** Báo sự cố trên đường (tắc đường, hỏng xe…) cho cả chuyến. */
  readonly tripExceptions: boolean
  /** Gửi vị trí điện thoại làm vị trí xe. */
  readonly gps: boolean
  /** Chuông thông báo. */
  readonly notifications: boolean
  /** Vị trí GPS chỉ ở lại kho mẫu trong máy (không có máy chủ nào nhận). */
  readonly gpsLocalOnly: boolean
}

/** Một điểm của chuyến trong danh sách điểm: số, tên, loại, số kiện của phương án ở điểm, đã xong chưa, giờ đến / hạn. */
export type DriverTripStop = {
  readonly number: number
  readonly name: string
  readonly kind: StopKind
  /** Vắng khi nguồn không biết số kiện của điểm. */
  readonly packageCount: number | undefined
  readonly done: boolean
  /** Giờ đến dự kiến hoặc giờ đã đến, và hạn; vắng khi điểm đã xong hoặc chuyến chưa có tuyến. */
  readonly timing: StopTiming | undefined
}

/** Một chuyến ở "Chuyến của tôi". */
export type DriverTripRow = {
  /** Mã dùng để mở chuyến (tham số của route). */
  readonly id: string
  /** Mã chuyến hiện trên màn. */
  readonly code: string
  /** Tên tuyến; vắng khi nguồn không có. */
  readonly name: string | undefined
  /** Ngày chạy (`YYYY-MM-DD`) hoặc giờ xuất phát (ISO 8601). */
  readonly date: string | undefined
  readonly vehicleName: string
  readonly status: TripStatus
  readonly sub: TripSubStatus | null
  readonly manualSub: TripSubStatus | null
  readonly stopCount: number
  readonly packageCount: number | undefined
  /** Đang vận chuyển: điểm chưa hoàn tất đầu tiên. */
  readonly currentStop: number | undefined
  readonly completedAt: string | undefined
  readonly issueCount: number
  /** Xác nhận tay bị điều phối viên từ chối, kiện chưa được kiểm lại. */
  readonly recheck: number
  /** Các điểm theo thứ tự đi — chỉ chuyến đang vận chuyển và xếp xong chờ xuất phát. */
  readonly stops: readonly DriverTripStop[]
  /** Nguồn của các giờ đến dự kiến trong danh sách điểm (một dòng nguồn cho cả thẻ). */
  readonly etaSources: readonly EtaSource[]
}

export type DriverTrips = {
  readonly groups: Readonly<Record<MyTripGroup, readonly DriverTripRow[]>>
  /** Bao lâu nữa nên đọc lại giờ đến dự kiến của chuyến đang chạy; `null` khi không cần. */
  readonly refreshMs: number | null
}

/** Cách kiện đã được đối chiếu khi dỡ / nhận. */
export type VerifyVia = LabelVerifyMethod | 'MANUAL_PENDING' | 'MANUAL_APPROVED'

/** Một kiện phải dỡ ở điểm đang giao, theo thứ tự dỡ. */
export type StopItem = {
  /** Mã nguồn dùng để ghi (kho mẫu: mã instance; backend: mã kiện). */
  readonly id: string
  /** Mã in trên nhãn, hiện trên màn. */
  readonly label: string
  readonly name: string
  readonly weightKg: number | undefined
  readonly unloadingOrder: number
  /** Vùng và lớp trong thùng; vắng khi nguồn không có vị trí xếp. */
  readonly place: { readonly area: DeliveryArea; readonly layer: DeliveryLayer } | undefined
  readonly unloaded: boolean
  readonly via: VerifyVia | undefined
  /** Lý do điều phối viên từ chối xác nhận tay — kiện cần kiểm lại. */
  readonly rejectedReason: string | undefined
  readonly issueKind: DeliveryIssueKind | undefined
  /** Khách từ chối: kiện ở lại xe, thành Hoàn trả khi hoàn tất điểm. */
  readonly returned: boolean
}

/** Một kiện nhận dọc đường của điểm: nhận lên xe (`pick`) hoặc dỡ ở điểm giao (`deliver`). */
export type StopPickupItem = {
  readonly id: string
  readonly name: string
  readonly weightKg: number
  readonly requestId: string
  readonly role: 'pick' | 'deliver'
  readonly done: boolean
  readonly via: VerifyVia | undefined
  readonly rejectedReason: string | undefined
}

/** Khoá của một điểm cho lệnh ghi: số điểm (kho mẫu) và mã điểm của nguồn (backend). */
export type StopKey = { readonly number: number; readonly ref: string }

export type StopInfo = StopKey & {
  readonly name: string
  readonly address: string
  readonly phone: string | undefined
  readonly contactName: string | undefined
  readonly kind: StopKind
  readonly lat: number | undefined
  readonly lng: number | undefined
}

/** Tuyến vẽ trên màn chỉ đường trong app (kho + điểm có toạ độ). */
export type DriverRouteMap = {
  readonly depot: { readonly name: string; readonly lat: number; readonly lng: number }
  readonly stops: readonly { readonly id: string; readonly number: number; readonly name: string; readonly lat: number; readonly lng: number }[]
  /** Polyline Goong khi nguồn có; không có thì bản đồ nối thẳng kho → điểm. */
  readonly path?: readonly { readonly lat: number; readonly lng: number }[]
  readonly planVersion?: number
  /** Bước chỉ dẫn của đoạn đang đi (leg trùng số điểm hiện tại). */
  readonly guidanceSteps?: readonly unknown[]
}

/** Hoàn tất điểm sẽ ghi gì — hộp hỏi lại đọc từ đây. */
export type StopCompletionInfo = {
  readonly delivered: number
  readonly returned: readonly { readonly id: string; readonly label: string; readonly name: string }[]
  readonly picked: number
  readonly issues: number
  /** Điểm kế tiếp; vắng là điểm cuối. Vắng cả khi nguồn không biết điểm kế tiếp: `nextKnown` nói rõ. */
  readonly next: { readonly number: number; readonly name: string } | undefined
  readonly nextKnown: boolean
}

/** Màn điểm giao của một chuyến. */
export type StopScreen = {
  readonly mode: DeliveryMode
  readonly stop: StopInfo
  /** Mọi điểm của chuyến theo thứ tự đi (dải tiến độ, danh sách điểm); có thể chỉ có điểm hiện tại khi nguồn không biết cả tuyến. */
  readonly stops: readonly DriverTripStop[]
  readonly stopCount: number
  /** Đã bấm "Đã đến" (hoặc nguồn không có bước này). */
  readonly arrived: boolean
  readonly arrivedAt: string | undefined
  /** Giờ đến / hạn của điểm đang giao; vắng khi nguồn không có. */
  readonly timing: StopTiming | undefined
  readonly items: readonly StopItem[]
  readonly pickupItems: readonly StopPickupItem[]
  /** Kiện của điểm hỏng lúc xếp, bị bỏ lại kho. */
  readonly leftAtWarehouse: number
  readonly total: number
  readonly doneCount: number
  readonly issueCount: number
  /** Chưa dỡ và chưa báo sự cố: còn thì chưa hoàn tất được điểm. */
  readonly remaining: number
  /** Còn đối chiếu được: chưa dỡ và khách không từ chối. */
  readonly verifiable: number
  /** Xác nhận tay của điểm còn chờ điều phối viên duyệt. */
  readonly pendingConfirms: number
  readonly completion: StopCompletionInfo
  /** Tên kiện theo mã nguồn, cho câu "kiện này thuộc điểm khác". */
  readonly names: Readonly<Record<string, string>>
  /** Chuyến có điểm nhận dọc đường: màn hiện danh sách điểm. */
  readonly hasPickupStops: boolean
  /** Bao lâu nữa nên đọc lại (vị trí xe, giờ đến); `null` khi không cần. */
  readonly refreshMs: number | null
  /** Kho + điểm có toạ độ để vẽ chỉ đường trong app; vắng khi nguồn không biết. */
  readonly routeMap: DriverRouteMap | undefined
}

export type SummaryIssue = {
  readonly stop: number
  readonly kind: DeliveryIssueKind
  /** Vắng là sự cố của cả điểm. */
  readonly item: { readonly id: string; readonly name: string } | undefined
  readonly note: string
}

export type TripSummaryModel = {
  readonly stopCount: number
  readonly delivered: number
  readonly startedAt: string | undefined
  readonly completedAt: string | undefined
  readonly issues: readonly SummaryIssue[]
  readonly stops: readonly { readonly number: number; readonly name: string; readonly kind: StopKind; readonly completedAt: string | undefined; readonly delivered: number; readonly issues: number }[]
}

export type TripHead = { readonly id: string; readonly code: string; readonly name: string | undefined }

/** Một chuyến của tài xế theo pha: màn nói lý do khi chưa / không còn giao được. */
export type DriverTripScreen =
  | { readonly kind: 'cancelled'; readonly trip: TripHead; readonly reason: string }
  | { readonly kind: 'noPlan'; readonly trip: TripHead }
  | { readonly kind: 'planning'; readonly trip: TripHead; readonly replan: 'DAMAGED' | 'SHORTAGE' | undefined }
  | { readonly kind: 'noStops'; readonly trip: TripHead }
  | { readonly kind: 'completed'; readonly trip: TripHead; readonly summary: TripSummaryModel | undefined }
  | { readonly kind: 'stop'; readonly trip: TripHead; readonly screen: StopScreen }

/** Đối chiếu một kiện bằng nhãn: quét (`QR`) hoặc gõ mã in trên nhãn (`CODE`). */
export type VerifyCodeInput = { readonly stop: StopKey; readonly method: LabelVerifyMethod; readonly code: string }

export type ManualConfirmRequest = { readonly stop: StopKey; readonly itemId: string; readonly reason: ManualConfirmReason; readonly note: string | undefined }

export type DeliveryIssueRequest = { readonly stop: StopKey; readonly itemId: string; readonly kind: DeliveryIssueKind; readonly note: string | undefined }

export type TripExceptionRequest = { readonly type: TripExceptionType; readonly description: string; readonly delayMinutes: number }

/** Vị trí điện thoại gửi làm vị trí xe: độ, km/h, độ (0–360). */
export type LocationRequest = { readonly lat: number; readonly lng: number; readonly speedKmh?: number; readonly heading?: number }

/** Kiện vừa được ghi (dỡ hoặc nhận). */
export type RecordedItem = { readonly id: string }

/** Câu của một thông báo ở chuông tài xế: việc của chuyến mình, xác nhận tay của mình bị từ chối, trả lời yêu cầu hỗ trợ. */
export type DriverNotificationKind = DriverNotice | 'manualRejected' | 'ticketReplied'

export type DriverNotification = {
  readonly id: string
  /** ISO 8601 */
  readonly at: string
  readonly kind: DriverNotificationKind
  /** Đối tượng: mã chuyến kèm tên tuyến, hoặc mã yêu cầu hỗ trợ. */
  readonly target: { readonly id: string; readonly label: string | undefined }
  /** Mã chuyến mở được từ thông báo; vắng khi tài xế không còn mở được chuyến đó. */
  readonly tripId: string | undefined
  /** Chi tiết tài xế cần đọc: lý do, số kiện, mã kiện… (chỉ tham số của câu). */
  readonly details: Readonly<Record<string, string | number>>
}
