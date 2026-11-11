/*
 * Dữ liệu backend trả cho tài xế (`/api/driver/**`, theo `driver-dto.ts` của web). Kiểu DTO không ra khỏi lớp `driver-http*`: chỉ
 * `driver-http.ts`, `driver-http-mapping.ts`, `driver-http-stop.ts` import file này.
 */

/** `GET /api/driver/trips` — mọi chuyến gán cho tài xế, mọi trạng thái. */
export type DriverTripDto = {
  readonly tripId: number
  readonly tripCode: string | null
  readonly vehicleLicensePlate: string | null
  readonly stopCount: number | null
  /** `LocalDateTime` của backend: không kèm múi giờ. */
  readonly departureTime: string | null
  readonly status: string | null
  /** Kho đã hoàn tất xếp hàng: chỉ khi đó tài xế xuất phát được. */
  readonly loadingCompleted?: boolean | null
  /** Giờ giao xong chuyến `DELIVERED` (`LocalDateTime`); chuyến chưa giao xong: null. */
  readonly completedAt?: string | null
}

export type StopPackageDto = {
  readonly packageId: number | null
  readonly packageName: string | null
  readonly trackingBarcode: string | null
  /** Mã của bên gửi và mã QR in trên nhãn — tài xế quét hoặc gõ được cả hai. */
  readonly packageCode?: string | null
  readonly qrToken?: string | null
  readonly weight: number | null
  readonly unloadOrder: number | null
  /** Kiện đã dỡ ở điểm này (máy chủ đọc từ các lần xác nhận dỡ). */
  readonly unloaded?: boolean | null
  /** Sự cố mới nhất tài xế báo cho kiện ở điểm này: `DAMAGED`, `MISSING`, `REFUSED`, `OTHER`. */
  readonly issueKind?: string | null
  /** Xác nhận tay mới nhất của kiện ở điểm này: `PENDING`, `APPROVED`, `REJECTED`. */
  readonly manualStatus?: string | null
  readonly manualReason?: string | null
  /** Lý do điều phối viên ghi khi từ chối xác nhận tay. */
  readonly manualRejectReason?: string | null
  /** Kiện nhận dọc đường: yêu cầu nhận của kiện. */
  readonly pickupRequestId?: number | null
  /** Điểm nhận: kiện đã đối chiếu lên xe chưa. */
  readonly picked?: boolean | null
}

/** `GET /api/driver/trips/{id}/current-stop` — điểm chưa hoàn tất đầu tiên và kiện của điểm đó theo thứ tự dỡ. */
export type CurrentStopDto = {
  readonly stopId: number
  readonly stopSequence: number
  readonly stopName: string | null
  readonly address: string | null
  /** Giờ đến thật (`LocalDateTime`); `null` khi chưa báo đến. */
  readonly actualArrival?: string | null
  readonly packages: readonly StopPackageDto[] | null
  /** `DELIVERY` hoặc `PICKUP` (điểm nhận dọc đường chèn lúc duyệt); máy chủ cũ không trả thì là điểm giao. */
  readonly stopType?: string | null
  /** Điểm nhận: kiện phải đối chiếu lên xe; điểm giao: rỗng. */
  readonly pickupPackages?: readonly StopPackageDto[] | null
}

/** `GET /api/trips/{id}/route-plans/active` — DRIVER được đọc. */
export type RouteGuidanceStepDto = {
  readonly instruction?: string | null
  readonly maneuver?: string | null
  readonly distanceMeters?: number | null
  readonly durationSeconds?: number | null
  readonly lat?: number | null
  readonly lng?: number | null
}

export type RouteLegDto = {
  readonly legSequence: number
  readonly endStopId?: number | null
  readonly polyline?: string | null
  readonly steps?: readonly RouteGuidanceStepDto[] | null
}

export type RoutePlanDetailDto = {
  readonly planVersion?: number | null
  readonly legs?: readonly RouteLegDto[] | null
}

/** `POST /api/driver/stops/{id}/complete` */
export type CompleteStopDto = { readonly tripCompleted: boolean | null }

/** `POST /api/driver/location` */
export type LocationPointDto = { readonly recordedAt: string }
