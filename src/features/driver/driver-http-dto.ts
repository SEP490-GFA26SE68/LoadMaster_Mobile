/*
 * Dữ liệu backend trả cho tài xế (`/api/driver/**`, theo `driver-dto.ts` của web). Kiểu DTO không ra khỏi lớp `driver-http*`: chỉ
 * `driver-http.ts`, `driver-http-mapping.ts`, `driver-http-stop.ts` import file này.
 */

/** `GET /api/driver/trips` — mọi chuyến gán cho tài xế, mọi trạng thái. */
export type DriverTripDto = {
  readonly tripId: number
  readonly tripCode: string | null
  /** Tên chuyến điều phối viên đặt; chuyến chưa đặt tên là null (máy chủ cũ không có trường này). */
  readonly tripName?: string | null
  readonly vehicleLicensePlate: string | null
  readonly stopCount: number | null
  readonly totalPackages?: number | null
  readonly totalWeightKg?: number | string | null
  readonly totalDistanceMeters?: number | null
  readonly totalDurationSeconds?: number | null
  readonly estimatedCompletionTime?: string | null
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
  readonly packageTypeName?: string | null
  readonly trackingBarcode: string | null
  /** Mã của bên gửi và mã QR in trên nhãn — tài xế quét hoặc gõ được cả hai. */
  readonly packageCode?: string | null
  readonly qrToken?: string | null
  readonly weight: number | null
  readonly lengthCm?: number | null
  readonly widthCm?: number | null
  readonly heightCm?: number | null
  readonly handlingClass?: string | null
  readonly fragile?: boolean | null
  readonly note?: string | null
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
}

/**
 * `GET /api/driver/trips/{id}/current-stop` — điểm chưa hoàn tất đầu tiên và kiện của điểm đó theo thứ tự dỡ. Máy chủ còn trả `stopType`
 * và `pickupPackages` cho điểm nhận dọc đường cũ; app đã bỏ tính năng đó nên không đọc hai trường này: điểm như vậy là một điểm không có
 * kiện nào phải dỡ — tài xế bấm "Đã đến" rồi hoàn tất như điểm giao.
 */
export type CurrentStopDto = {
  readonly stopId: number
  readonly stopSequence: number
  readonly stopName: string | null
  readonly address: string | null
  /** Giờ đến thật (`LocalDateTime`); `null` khi chưa báo đến. */
  readonly actualArrival?: string | null
  readonly packages: readonly StopPackageDto[] | null
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

/** `POST /api/driver/stops/{id}/complete` — `nextStopId` có khi còn điểm chưa hoàn tất. */
export type CompleteStopDto = { readonly tripCompleted: boolean | null; readonly nextStopId?: number | null }

/** `POST /api/driver/location` */
export type LocationPointDto = { readonly recordedAt: string }

/** `GET /api/driver/trips/{id}/exceptions` */
export type DriverTripExceptionDto = {
  readonly id: string | number
  readonly tripId?: string | number | null
  readonly type: string | null
  readonly description: string | null
  readonly delayMinutes: number | null
  readonly status: string | null
  readonly stopNumber?: number | null
  readonly reportedAt: string | null
  readonly reportedBy?: string | null
  readonly escalation?: { readonly reason?: string | null; readonly at?: string | null; readonly by?: string | null } | null
  readonly resolution?: { readonly at?: string | null; readonly by?: string | null; readonly note?: string | null } | null
}

/** `GET /api/driver/trips/{id}/detail` */
export type DriverTripDetailPackageDto = {
  readonly packageId: number | null
  readonly packageCode: string | null
  readonly trackingBarcode: string | null
  readonly packageName: string | null
  readonly packageTypeName?: string | null
  readonly weightKg: number | null
  readonly lengthCm?: number | null
  readonly widthCm?: number | null
  readonly heightCm?: number | null
  readonly status: string | null
  readonly unloadOrder: number | null
  readonly handlingClass?: string | null
  readonly fragile?: boolean | null
  readonly note?: string | null
}

export type DriverTripDetailStopDto = {
  readonly stopId: number
  readonly stopSequence: number
  readonly stopName: string | null
  readonly address: string | null
  readonly lat: number | null
  readonly lng: number | null
  readonly status: string | null
  readonly plannedArrival: string | null
  readonly actualArrival: string | null
  readonly deadline: string | null
  readonly plannedStatus: string | null
  readonly eta: string | null
  readonly etaStatus: string | null
  readonly contactName: string | null
  readonly contactPhone: string | null
  readonly packages: readonly DriverTripDetailPackageDto[] | null
}

export type DriverTripDetailDto = {
  readonly tripId: number
  readonly tripCode: string | null
  readonly tripName: string | null
  readonly status: string | null
  readonly departureTime: string | null
  readonly completedAt: string | null
  readonly loadingCompleted: boolean | null
  readonly depotName: string | null
  readonly depotAddress: string | null
  readonly depotLat: number | null
  readonly depotLng: number | null
  readonly vehicleId: number | null
  readonly vehicleName: string | null
  readonly licensePlate: string | null
  readonly maxPayloadKg: number | null
  readonly vehicleTypeName: string | null
  readonly innerLengthCm?: number | null
  readonly innerWidthCm?: number | null
  readonly innerHeightCm?: number | null
  readonly maxVolumeM3?: number | null
  readonly totalStops: number | null
  readonly totalPackages: number | null
  readonly totalWeightKg: number | null
  readonly dispatcherName?: string | null
  readonly dispatcherPhone?: string | null
  readonly totalDistanceMeters?: number | null
  readonly totalDurationSeconds?: number | null
  readonly stops: readonly DriverTripDetailStopDto[] | null
}

export type OpenTripDto = {
  readonly id: number | null
  readonly tripId: number | null
  readonly tripCode: string | null
  readonly tripName: string | null
  readonly departureTime: string | null
  readonly originWarehouse: string | null
  readonly stopCount: number | null
  readonly myClaimStatus: string | null
  readonly myRejectReason: string | null
}

export type TripClaimDto = {
  readonly id: number
  readonly tripId: number
  readonly driverUserId: number
  readonly driverName: string | null
  readonly driverPhone: string | null
  readonly status: string
  readonly note: string | null
  readonly createdAt: string
  readonly decidedById: number | null
  readonly decidedByName: string | null
  readonly decidedAt: string | null
  readonly rejectReason: string | null
}
