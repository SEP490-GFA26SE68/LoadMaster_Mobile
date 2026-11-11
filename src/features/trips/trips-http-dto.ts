/*
 * DTO của các endpoint chuyến mà màn chuyến và màn giám sát đọc: `TripResponse`, `TripStopResponse`, `TripDetailResponse`, xác nhận tay
 * và kiện kho báo thiếu. Chỉ adapter `http` import file này. Mốc giờ: `LocalDateTime` giờ Việt Nam.
 */

/** Toạ độ `BigDecimal`: số, hoặc chuỗi khi máy chủ ghi bằng chuỗi. */
type Decimal = number | string

export type TripDto = {
  readonly id: number
  readonly tripCode: string | null
  readonly tripName?: string | null
  readonly vehicleId?: number | null
  readonly vehicleName?: string | null
  readonly licensePlate?: string | null
  readonly driverId?: number | null
  readonly driverName?: string | null
  readonly departureTime?: string | null
  readonly originName?: string | null
  readonly originAddress?: string | null
  readonly originLatitude?: Decimal | null
  readonly originLongitude?: Decimal | null
  readonly status: string
  readonly stopCount?: number | null
  readonly packageCount?: number | null
  readonly hasActiveRoutePlan?: boolean | null
  readonly cancelReason?: string | null
}

export type TripStopDto = {
  readonly id: number
  readonly deliveryRequirementId?: number | null
  readonly stopSequence?: number | null
  readonly stopName?: string | null
  readonly address?: string | null
  readonly latitude?: Decimal | null
  readonly longitude?: Decimal | null
  readonly status?: string | null
  readonly plannedArrival?: string | null
  readonly actualArrival?: string | null
  readonly deadline?: string | null
  readonly stopType?: string | null
}

export type TripDetailDto = {
  readonly trip: TripDto
  readonly stops?: readonly TripStopDto[] | null
}

/** `ManualConfirmationResponse`, các trường màn đọc. */
export type ManualConfirmationDto = {
  readonly id: number
  readonly stopSequence?: number | null
  readonly packageId?: number | null
  readonly packageCode?: string | null
  readonly trackingBarcode?: string | null
  readonly packageName?: string | null
  readonly reason?: string | null
  readonly note?: string | null
  readonly requestedByName?: string | null
  readonly requestedAt?: string | null
  /** `STAGING` | `LOADING` | `UNLOADING`. */
  readonly step?: string | null
}

/** `StagingShortageResponse`, các trường màn đọc. */
export type StagingShortageDto = {
  readonly id: number
  readonly packageId?: number | null
  readonly packageCode?: string | null
  readonly trackingBarcode?: string | null
  readonly packageName?: string | null
  readonly stopSequence?: number | null
  readonly reportedByName?: string | null
  readonly reportedAt?: string | null
}
