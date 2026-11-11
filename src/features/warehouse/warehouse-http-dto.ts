/*
 * DTO của `WarehouseController` và `WarehouseStagingController` backend (`WarehouseTaskResponse`, `StartLoadingResponse`,
 * `PlacementStepResponse`, `StagingResponse`, `DamageResponse`), như `warehouse-dto.ts` của web. Chỉ adapter `http` của kho
 * (`warehouse-http.ts`, `warehouse-http-mapping.ts`) import file này — kiểu DTO không đi ra khỏi adapter. Toạ độ, kích thước kiện và lòng
 * thùng là cm.
 */

export type WarehouseTaskDto = {
  readonly tripId: number
  readonly tripCode: string | null
  readonly vehicleInfo: string | null
  readonly totalPackages: number | null
  readonly departureTime: string | null
  /** Trạng thái chuyến: `PLANNED` (chờ xếp) hoặc `LOADING` (đã có phiên xếp); `DRAFT` khi chuyến chờ tối ưu lại vừa hết yêu cầu giao. */
  readonly status: string | null
  /** `IN_PROGRESS` | `COMPLETED`; vắng khi chưa bắt đầu xếp. */
  readonly executionStatus?: string | null
  /** Chỉ khi gọi kèm `includeAwaitingReplan=true`: phiên xếp dừng vì kiện thiếu / hỏng, chờ điều phối viên duyệt phương án mới. */
  readonly awaitingReplan?: boolean | null
  /** `STAGING_SHORTAGE` | `DAMAGED_PACKAGE`, đi cùng `awaitingReplan`. */
  readonly replanReason?: string | null
}

export type PlacementStepDto = {
  readonly placementId: number
  readonly packageId: number | null
  readonly packageName: string | null
  readonly packageCode?: string | null
  readonly trackingBarcode: string | null
  readonly qrToken?: string | null
  readonly posX: number | null
  readonly posY: number | null
  readonly posZ: number | null
  readonly packedLength: number | null
  readonly packedWidth: number | null
  readonly packedHeight: number | null
  /** Khối lượng thực tế của kiện (kg), không có thì của loại kiện. */
  readonly weightKg?: number | null
  readonly sequence: number | null
  readonly stopSequence?: number | null
  readonly stopName?: string | null
  /** `CONFIRMED` | `DEVIATION` | `DAMAGED` (kiện hỏng bỏ lại kho) | `PENDING`. */
  readonly status?: string | null
  /** Kiện đã vào khu chờ (bước soạn hàng); vắng ở máy chủ cũ. */
  readonly staged?: boolean | null
  /** Báo thiếu còn hiệu lực: `OPEN` (chờ điều phối viên) | `KEEP_SEARCHING` (điều phối viên bảo tìm tiếp). */
  readonly shortageStatus?: string | null
  /** Xác nhận tay mới nhất của kho với kiện: `PENDING` | `APPROVED` | `REJECTED`, bước `STAGING` | `LOADING`. */
  readonly manualStatus?: string | null
  readonly manualStep?: string | null
  readonly manualRejectReason?: string | null
}

/** Phiên xếp: `POST /api/warehouse/tasks/{tripId}/start` và `GET /api/warehouse/tasks/{tripId}` trả cùng dạng. */
export type StartLoadingDto = {
  readonly tripId: number
  readonly tripCode: string | null
  readonly vehicleInfo: string | null
  readonly licensePlate?: string | null
  readonly innerLength?: number | null
  readonly innerWidth?: number | null
  readonly innerHeight?: number | null
  /** `IN_PROGRESS` | `COMPLETED` của phiên xếp. */
  readonly status: string | null
  readonly placements: readonly PlacementStepDto[] | null
  /** Phiên có bước soạn hàng (bắt đầu kèm `staging: true`); vắng ở máy chủ cũ. */
  readonly stagingRequired?: boolean | null
  readonly stagingComplete?: boolean | null
  readonly pendingManualCount?: number | null
  readonly sealNumber?: string | null
  readonly sealedAt?: string | null
  readonly sealedByName?: string | null
}

/** `POST …/staging/packages/{packageId}/confirm`. */
export type StagingDto = {
  readonly alreadyStaged?: boolean | null
  readonly stagingComplete?: boolean | null
}

/** `POST /api/warehouse/placements/{id}/damaged`: `LEFT_OUT` — kiện bỏ lại kho, xếp tiếp; `REPLANNED` — chuyến về Đã lập kế hoạch. */
export type DamageDto = {
  readonly outcome: string | null
  readonly restingCount?: number | null
}
