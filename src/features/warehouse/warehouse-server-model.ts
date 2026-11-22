import type { ManualConfirmReason } from '@/lib/mock-db'

/*
 * Dữ liệu màn kho khi nguồn là máy chủ (như `warehouse-dto.ts` của web, phần kiểu của màn): máy chủ giữ phiên xếp, nên màn không dựng phiên
 * từ chuyến và revision như kho mẫu (`loading-session.ts`) mà đọc thẳng phiên đó. Toạ độ, kích thước kiện và lòng thùng là cm, gốc ở góc
 * trong cùng bên trái sàn thùng (như phương án).
 */

/**
 * Chuyến ở danh sách kho: `waiting` — Đã lập kế hoạch, có phương án đã duyệt, chưa bắt đầu; `loading` — phiên đang dở; `loaded` — đã xếp xong,
 * chờ tài xế xuất phát; `stale` — phiên dừng vì kiện thiếu / hỏng, chờ điều phối viên tối ưu lại (kho chỉ xem).
 */
export type ServerWarehouseStage = 'loading' | 'waiting' | 'loaded' | 'stale'

/** Thứ tự nhóm trên danh sách, như web: việc đang dở trước. */
export const SERVER_WAREHOUSE_STAGES: readonly ServerWarehouseStage[] = ['loading', 'waiting', 'loaded', 'stale']

/** Vì sao chuyến chờ điều phối tối ưu lại: kiện thiếu bị bỏ lúc soạn, hoặc kiện hỏng có kiện tựa lên. */
export type ServerReplanReason = 'shortage' | 'damaged'

export type ServerWarehouseTrip = {
  /** Mã số của máy chủ — mã của phiên trên đường dẫn `/loading/[tripId]`. */
  readonly id: string
  readonly code: string
  readonly vehicle: string
  /** ISO 8601, hoặc `null` khi máy chủ không trả. */
  readonly departureAt: string | null
  readonly packageCount: number | null
  readonly stage: ServerWarehouseStage
  /** Trạng thái chuyến của máy chủ (bỏ yêu cầu giao vừa hết kiện đưa chuyến chờ tối ưu lại về Nháp). */
  readonly status: 'DRAFT' | 'PLANNED' | 'LOADING'
  /** Chỉ với `stale`; `null` khi máy chủ trả lý do lạ. */
  readonly replanReason: ServerReplanReason | null
}

/** Một kiện của phiên xếp, theo thứ tự xếp của phương án đã duyệt. */
export type ServerPlacement = {
  readonly id: string
  /** Mã kho kiện; `null` với chỗ xếp không gắn kiện thật (máy chủ không soạn chỗ đó). */
  readonly packageId: string | null
  readonly name: string
  readonly barcode: string | null
  /** Mã của bên gửi. */
  readonly packageCode: string | null
  /** Mã QR in trên nhãn. */
  readonly qrToken: string | null
  readonly x: number
  readonly y: number
  readonly z: number
  readonly lengthCm: number
  readonly widthCm: number
  readonly heightCm: number
  /** kg; `null` khi máy chủ không trả. */
  readonly weightKg: number | null
  readonly sequence: number
  /** Điểm giao thật của kiện: số thứ tự và tên; `null` khi máy chủ không trả. */
  readonly stopSequence: number | null
  readonly stopName: string | null
}

/** Kết quả từng kiện trong phiên: đã xếp đúng chỗ, đã xếp kèm sai lệch vị trí, hoặc kiện hỏng bị bỏ lại kho. */
export type PlacementOutcome = 'confirmed' | 'deviation' | 'damaged'

/** Xác nhận tay mới nhất của kho với một kiện (bước soạn hoặc xếp). */
export type ServerManualState = {
  readonly status: 'PENDING' | 'APPROVED' | 'REJECTED'
  readonly step: 'STAGING' | 'LOADING'
  readonly rejectReason: string | null
}

/** Tiến độ soạn hàng của một kiện: đã vào khu chờ, báo thiếu còn hiệu lực, xác nhận tay mới nhất. */
export type ServerStagingState = {
  readonly staged: boolean
  /** `open` — chờ điều phối viên quyết; `keepSearching` — điều phối viên bảo kho tìm tiếp. */
  readonly shortage: 'open' | 'keepSearching' | null
  readonly manual: ServerManualState | null
}

/** Lòng thùng của phiên, cm; `null` khi xe chưa gắn loại hoặc loại chưa khai lòng thùng — khi đó không có sơ đồ thùng. */
export type ServerCargoBox = { readonly innerLengthCm: number; readonly innerWidthCm: number; readonly innerHeightCm: number }

export type ServerLoadingSession = {
  readonly tripId: string
  readonly code: string
  readonly vehicle: string
  /** Biển số xe của chuyến (`licensePlate` của phiên); `null` khi máy chủ không trả — khi đó màn không có khối xe ở kho. */
  readonly licensePlate: string | null
  readonly box: ServerCargoBox | null
  readonly placements: readonly ServerPlacement[]
  /** Kết quả từng kiện theo máy chủ; kiện chưa xử lý không có mục. */
  readonly outcomes: Readonly<Record<string, PlacementOutcome>>
  /** Tiến độ soạn và xác nhận tay theo mã chỗ xếp của kiện. */
  readonly staging: Readonly<Record<string, ServerStagingState>>
  /** Phiên có bước soạn hàng (phiên bắt đầu ở thiết bị khác có thể không có). */
  readonly stagingRequired: boolean
  /** Soạn đủ: mọi kiện đã vào khu chờ và không còn báo thiếu chờ quyết. Phiên không có bước soạn luôn đủ. */
  readonly stagingComplete: boolean
  /** Xác nhận tay của kho còn chờ điều phối viên duyệt: còn thì chưa hoàn tất xếp được. */
  readonly pendingManual: number
  readonly completed: boolean
}

/** Vị trí kiện thật sự đặt, cm, và lý do lệch khỏi phương án. */
export type DeviationInput = { readonly x: number; readonly y: number; readonly z: number; readonly reason: string }

/** Xác nhận tay khi nhãn không đọc được: lý do (`OTHER` bắt buộc ghi chú). */
export type ServerManualInput = { readonly reason: ManualConfirmReason; readonly note?: string }

/** Kết quả soạn một kiện: `alreadyStaged` — kiện đã soạn từ trước, máy chủ không ghi thêm. */
export type StagingResult = { readonly session: ServerLoadingSession; readonly alreadyStaged: boolean }

/** Kết quả ghi kiện hỏng: `leftOut` — kiện bỏ lại kho, xếp tiếp; `replanned` — chuyến về Đã lập kế hoạch, không còn phiên để đọc. */
export type DamageResult =
  | { readonly outcome: 'leftOut'; readonly session: ServerLoadingSession }
  | { readonly outcome: 'replanned'; readonly resting: number }

const normalized = (value: string | null | undefined) => value?.trim().toLocaleUpperCase('vi') ?? ''

/** Nhãn đã đối chiếu gửi lên máy chủ: cách đối chiếu và đúng mã đã quét / gõ. */
export type LabelInput = { readonly method: 'QR' | 'CODE'; readonly code: string }

/**
 * Mã quét hoặc gõ có khớp kiện không, theo cùng luật máy chủ kiểm (`WarehouseLabelVerifier`, như `codeMatches` của web): gõ mã (`CODE`)
 * chỉ so mã kiện in trên nhãn (Package Code); quét (`QR`) so mã QR hoặc mã vạch. Mã nội bộ không bao giờ tính là bằng chứng nhãn. Không phân
 * biệt hoa thường (mã QR của máy chủ là chữ thường, máy quét hay người gõ có thể đưa chữ hoa). App kiểm trước cho người dùng biết ngay; máy
 * chủ vẫn kiểm lại mã gửi lên (`PACKAGE_CODE_MISMATCH`).
 */
export function codeMatches(placement: ServerPlacement, code: string, method: 'QR' | 'CODE' = 'CODE'): boolean {
  const typed = normalized(code)
  return typed !== '' && (method === 'CODE' ? [placement.packageCode] : [placement.qrToken, placement.barcode]).some((value) => typed === normalized(value))
}
