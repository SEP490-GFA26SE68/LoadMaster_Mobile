/**
 * Hàm → endpoint backend của màn kho khi nguồn `warehouse` là máy chủ (`warehouse-http.ts`). Kho mẫu không có các hàm này: máy chủ giữ phiên
 * xếp, kho mẫu dựng phiên từ chuyến và revision (`warehouse-api.ts`) — gọi tới khi nguồn là kho mẫu là `NOT_SUPPORTED`.
 *   fetchServerTasks              GET  /api/warehouse/tasks?includeAwaitingReplan=true
 *   fetchServerSession            GET  /api/warehouse/tasks/{tripId}
 *   startServerLoading            POST /api/warehouse/tasks/{tripId}/start
 *   stageServerPackage            POST /api/warehouse/tasks/{tripId}/staging/packages/{packageId}/confirm
 *   stageServerPackageManually    POST /api/warehouse/tasks/{tripId}/staging/packages/{packageId}/manual
 *   reportServerShortage          POST /api/warehouse/tasks/{tripId}/staging/packages/{packageId}/shortage
 *   confirmServerPlacement        POST /api/warehouse/placements/{id}/confirm
 *   confirmServerPlacementManually POST /api/warehouse/placements/{id}/manual
 *   recordServerDeviation         POST /api/warehouse/placements/{id}/deviation
 *   reportServerDamaged           POST /api/warehouse/placements/{id}/damaged
 *   completeServerLoading         POST /api/warehouse/tasks/{tripId}/complete
 *   recordServerSeal              POST /api/warehouse/tasks/{tripId}/seal
 */
import { createAdapter } from '@/data/adapter'
import { notSupported } from '@/lib/office-backend'

import { httpWarehouseApi } from './warehouse-http'
import type {
  DamageResult,
  DeviationInput,
  ServerLoadingSession,
  ServerManualInput,
  ServerWarehouseTrip,
  StagingResult,
} from './warehouse-server-model'

// Kiểu của phiên máy chủ đọc từ đây như bản web (`server-loading.ts` chép nguyên từ web import chúng từ file này)
export type {
  PlacementOutcome,
  ServerLoadingSession,
  ServerManualState,
  ServerPlacement,
  ServerStagingState,
} from './warehouse-server-model'

/**
 * Hợp đồng dữ liệu của màn kho khi nguồn là máy chủ. Mọi lệnh ghi trả phiên đọc lại sau khi ghi — màn vẽ đúng điều máy chủ đã ghi.
 * `tripId` là mã số chuyến của máy chủ; `packageId` là mã kho kiện của chỗ xếp (bước soạn), `placementId` mã chỗ xếp (bước xếp).
 */
export type ServerWarehouseApi = {
  /** Chuyến chờ xếp, đang xếp, đã xếp xong chờ xuất phát và chờ điều phối tối ưu lại; xuất phát sớm trước. */
  fetchTasks(): Promise<ServerWarehouseTrip[]>
  /** Phiên xếp của chuyến; chuyến không còn ở pha xếp là `TRIP_NOT_LOADING` / `LOADING_EXECUTION_NOT_FOUND`. */
  fetchSession(tripId: string): Promise<ServerLoadingSession>
  /** Bắt đầu phiên kèm bước soạn hàng; phiên đã bắt đầu ở thiết bị khác thì mở lại phiên đó. */
  start(tripId: string): Promise<ServerLoadingSession>
  /** Soạn một kiện vào khu chờ bằng nhãn, không cần thứ tự; kiện đã soạn thì không ghi gì (`alreadyStaged`). */
  stage(tripId: string, packageId: string, method: 'QR' | 'CODE'): Promise<StagingResult>
  /** Soạn bằng xác nhận tay: chỉ tính là đã soạn khi điều phối viên duyệt. */
  stageManually(tripId: string, packageId: string, input: ServerManualInput): Promise<ServerLoadingSession>
  /** Báo một kiện chưa soạn là không tìm thấy: điều phối viên quyết tìm tiếp hay bỏ kiện. */
  reportShortage(tripId: string, packageId: string): Promise<ServerLoadingSession>
  /** Xác nhận đã xếp đúng chỗ (mã đã được app đối chiếu với nhãn trước khi gửi), kèm cách đối chiếu: quét QR hay gõ mã. */
  confirm(tripId: string, placementId: string, method: 'QR' | 'CODE'): Promise<ServerLoadingSession>
  /** Xác nhận tay một kiện của bước xếp: tính là đã xếp, chờ điều phối viên duyệt. */
  confirmManually(tripId: string, placementId: string, input: ServerManualInput): Promise<ServerLoadingSession>
  /** Đã xếp kiện ở vị trí khác phương án: vị trí thật (cm nguyên) và lý do. */
  deviation(tripId: string, placementId: string, input: DeviationInput): Promise<ServerLoadingSession>
  /** Kiện hỏng: bỏ lại kho nếu không kiện nào tựa lên nó, không thì chuyến về Đã lập kế hoạch. */
  damaged(tripId: string, placementId: string): Promise<DamageResult>
  /** Hoàn tất xếp khi mọi kiện đã có kết quả và không còn xác nhận tay chờ duyệt. */
  complete(tripId: string): Promise<ServerLoadingSession>
  /** Ghi / đổi số seal khi đã xếp xong, tới lúc xe rời kho. */
  seal(tripId: string, sealNumber: string): Promise<ServerLoadingSession>
}

const SAMPLE_SOURCE: ServerWarehouseApi = {
  fetchTasks: notSupported,
  fetchSession: notSupported,
  start: notSupported,
  stage: notSupported,
  stageManually: notSupported,
  reportShortage: notSupported,
  confirm: notSupported,
  confirmManually: notSupported,
  deviation: notSupported,
  damaged: notSupported,
  complete: notSupported,
  seal: notSupported,
}

const adapter = createAdapter<ServerWarehouseApi>('warehouse', { mock: () => SAMPLE_SOURCE, http: () => httpWarehouseApi() })

// GET /api/warehouse/tasks?includeAwaitingReplan=true
export function fetchServerTasks(): Promise<ServerWarehouseTrip[]> {
  return adapter().fetchTasks()
}

// GET /api/warehouse/tasks/{tripId}
export function fetchServerSession(tripId: string): Promise<ServerLoadingSession> {
  return adapter().fetchSession(tripId)
}

// POST /api/warehouse/tasks/{tripId}/start
export function startServerLoading(tripId: string): Promise<ServerLoadingSession> {
  return adapter().start(tripId)
}

// POST /api/warehouse/tasks/{tripId}/staging/packages/{packageId}/confirm
export function stageServerPackage(tripId: string, packageId: string, method: 'QR' | 'CODE'): Promise<StagingResult> {
  return adapter().stage(tripId, packageId, method)
}

// POST /api/warehouse/tasks/{tripId}/staging/packages/{packageId}/manual
export function stageServerPackageManually(tripId: string, packageId: string, input: ServerManualInput): Promise<ServerLoadingSession> {
  return adapter().stageManually(tripId, packageId, input)
}

// POST /api/warehouse/tasks/{tripId}/staging/packages/{packageId}/shortage
export function reportServerShortage(tripId: string, packageId: string): Promise<ServerLoadingSession> {
  return adapter().reportShortage(tripId, packageId)
}

// POST /api/warehouse/placements/{id}/confirm
export function confirmServerPlacement(tripId: string, placementId: string, method: 'QR' | 'CODE'): Promise<ServerLoadingSession> {
  return adapter().confirm(tripId, placementId, method)
}

// POST /api/warehouse/placements/{id}/manual
export function confirmServerPlacementManually(tripId: string, placementId: string, input: ServerManualInput): Promise<ServerLoadingSession> {
  return adapter().confirmManually(tripId, placementId, input)
}

// POST /api/warehouse/placements/{id}/deviation
export function recordServerDeviation(tripId: string, placementId: string, input: DeviationInput): Promise<ServerLoadingSession> {
  return adapter().deviation(tripId, placementId, input)
}

// POST /api/warehouse/placements/{id}/damaged
export function reportServerDamaged(tripId: string, placementId: string): Promise<DamageResult> {
  return adapter().damaged(tripId, placementId)
}

// POST /api/warehouse/tasks/{tripId}/complete
export function completeServerLoading(tripId: string): Promise<ServerLoadingSession> {
  return adapter().complete(tripId)
}

// POST /api/warehouse/tasks/{tripId}/seal
export function recordServerSeal(tripId: string, sealNumber: string): Promise<ServerLoadingSession> {
  return adapter().seal(tripId, sealNumber)
}
