import type { LabelVerifyMethod } from '@/lib/mock-db'

import type { TripRevisions } from './warehouse-trips'

/*
 * Dữ liệu màn kho ở dạng màn cần, không phụ thuộc nguồn. Danh sách chuyến (`WarehouseTripRow`) và phiên soạn → xếp
 * (`loading-session.ts`) dùng logic chép từ web; ở đây chỉ có phần riêng của hợp đồng `WarehouseApi`.
 */

/**
 * Việc kho làm được với nguồn dữ liệu đang dùng. Kho mẫu làm được hết; backend chưa có các việc dưới đây. Màn ẩn việc nguồn chưa làm
 * được — không nút giả.
 */
import type { TripStatus } from '@/types/trip'

export type WarehouseCapabilities = {
  /** Xác nhận tay một kiện lúc soạn hoặc lúc xếp khi nhãn không đọc được (chờ điều phối viên duyệt). */
  readonly manualConfirm: boolean
  /** Báo thiếu một kiện chưa soạn (điều phối viên quyết tìm tiếp hay bỏ kiện). */
  readonly shortages: boolean
  /** Ghi số seal niêm phong khi đã xếp xong. */
  readonly seal: boolean
  /** Chuông thông báo. */
  readonly notifications: boolean
  readonly deviation: boolean
  readonly scan: boolean
}

export type WarehouseTask = {
  readonly id: string
  readonly code: string
  readonly vehicleInfo: string
  readonly packageCount: number
  readonly departureAt?: string
  readonly status: TripStatus
  readonly inProgress: boolean
}
/** Một chuyến của kho và các revision của nó (cũ trước): phiên soạn → xếp tính từ đây (`warehouseSession`). */
export type WarehouseTrip = TripRevisions

/** Đối chiếu một kiện bằng nhãn: quét (`QR`) hoặc gõ (`CODE` — mã QR in dưới hình, hoặc mã của bên gửi duy nhất trong chuyến). */
export type VerifyCodeInput = { readonly method: LabelVerifyMethod; readonly code: string }

export type WarehousePlacement = {
/**
 * Câu của một thông báo ở chuông kho: xác nhận tay của mình bị từ chối, quyết định của điều phối viên với kiện mình báo thiếu (tìm tiếp
 * hoặc bỏ kiện), chuyến bị huỷ lúc đang xếp, trả lời yêu cầu hỗ trợ của mình.
 */
export type WarehouseNotificationKind = 'manualRejected' | 'shortageKept' | 'shortageDropped' | 'cancelled' | 'ticketReplied'

export type WarehouseNotification = {
  readonly id: string
  readonly packageName: string
  readonly barcode?: string
  readonly sequence: number
  readonly posX?: number
  readonly posY?: number
  readonly posZ?: number
  readonly confirmed: boolean
}

export type LoadingSession = {
  readonly tripId: string
  readonly tripCode: string
  readonly vehicleInfo: string
  readonly status: string
  readonly totalPackages: number
  readonly placements: readonly WarehousePlacement[]
  readonly nextId: string | null
}

export type LoadingComplete = {
  readonly tripId: string
  readonly tripCode: string
  readonly packageCount: number
  readonly deviationCount: number
}

export type DeviationInput = {
  readonly actualPosX: number
  readonly actualPosY: number
  readonly actualPosZ: number
  readonly reason: string
}

export type PackageLookup = {
  readonly id: string
  readonly code: string
  readonly status: string
  readonly destination: string
  readonly weightKg?: number
  readonly tripCode?: string
  readonly stopNumber?: number
  readonly stopName?: string
  /** ISO 8601 */
  readonly at: string
  readonly kind: WarehouseNotificationKind
  /** Đối tượng: mã chuyến kèm tên tuyến, hoặc mã yêu cầu hỗ trợ. */
  readonly target: { readonly id: string; readonly label: string | undefined }
  /** Mã chuyến mở được từ thông báo; vắng khi đối tượng không phải chuyến. */
  readonly tripId: string | undefined
  /** Chi tiết kho cần đọc (chỉ tham số của câu): mã kiện, lý do, số kiện đã lên xe. */
  readonly details: Readonly<Record<string, string | number>>
}
