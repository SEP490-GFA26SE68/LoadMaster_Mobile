/*
 * DTO của `MonitoringController` backend (bảng giám sát, giám sát từng chuyến, sự cố, tuyến thay thế) và hai endpoint đọc yêu cầu giao
 * để gia hạn, như `monitoring-dto.ts` / `monitoring-exception-dto.ts` của web. Chỉ adapter `http` của màn giám sát import file này.
 */

export type LocationPointDto = {
  readonly lat: number
  readonly lng: number
  readonly speedKmh?: number | null
  readonly heading?: number | null
  readonly recordedAt: string
  readonly source?: string | null
}

export type BoardStopDto = {
  readonly id: string | number
  readonly number: number
  readonly name?: string | null
  readonly lat?: number | null
  readonly lng?: number | null
  readonly arrivedAt?: string | null
  readonly completedAt?: string | null
}

export type BoardTripDto = {
  readonly tripId: string
  readonly name?: string | null
  readonly vehicleName?: string | null
  readonly driverName?: string | null
  readonly depot?: { readonly name?: string | null; readonly lat?: number | null; readonly lng?: number | null } | null
  readonly stops?: readonly BoardStopDto[] | null
}

export type MonitoringBoardDto = {
  readonly trips?: readonly BoardTripDto[] | null
  readonly userNames?: Readonly<Record<string, string>> | null
}

export type LiveStopDto = {
  readonly stopId: string | number
  readonly number: number
  readonly eta: string
  readonly deadline?: string | null
  readonly deadlineStatus?: string | null
  readonly arrived?: boolean | null
}

export type EtaRiskAlertDto = {
  readonly eventId: string
  readonly at: string
  readonly tripId: string
  readonly stopId?: string | number | null
  readonly stopNumber?: number | null
  readonly status?: string | null
  readonly eta: string
  readonly deadline: string
}

export type TripExceptionDto = {
  readonly id: string
  readonly tripId?: string | null
  readonly type: string
  readonly description?: string | null
  readonly delayMinutes?: number | null
  readonly status: string
  readonly stopNumber?: number | null
  readonly reportedAt: string
  readonly reportedBy?: string | null
  readonly escalation?: { readonly reason?: string | null; readonly at?: string | null; readonly by?: string | null } | null
  readonly resolution?: { readonly at?: string | null; readonly by?: string | null; readonly note?: string | null } | null
}

export type RerouteOptionDto = {
  readonly index: number
  readonly route: string
  readonly distanceKm: number
  readonly durationMinutes: number
  readonly extraMs?: number | null
  readonly eta: string
}

export type TripRerouteDto = RerouteOptionDto & {
  readonly stopNumber?: number | null
  readonly confirmedAt?: string | null
  readonly confirmedBy?: string | null
}

export type RerouteProposalDto = {
  readonly tripId: string
  readonly requestedAt: string
  readonly stopId: string | number
  readonly stopNumber: number
  readonly options?: readonly RerouteOptionDto[] | null
  readonly isMockResult?: boolean | null
}

export type TripMonitoringDto = {
  readonly tripId: string
  readonly location: LocationPointDto | null
  readonly stops?: readonly LiveStopDto[] | null
  readonly alerts?: readonly EtaRiskAlertDto[] | null
  readonly exceptions?: readonly TripExceptionDto[] | null
  readonly reroute?: TripRerouteDto | null
  readonly refreshMs: number | null
  readonly isMockResult?: boolean | null
}

/** Một dòng `GET /api/delivery-requirements` (`DeliveryRequirementResponse`), chỉ các trường gia hạn cần. */
export type DeliveryRequirementDto = {
  readonly id: number | string
  readonly customerName?: string | null
  readonly destination?: string | null
  readonly deadline?: string | null
  readonly tripId?: number | string | null
  readonly tripCode?: string | null
}

/** Điểm giao của `GET /api/trips/{id}/detail`, chỉ các trường gia hạn cần. */
export type RequirementStopDto = {
  readonly deliveryRequirementId?: number | string | null
  readonly stopSequence?: number | null
  readonly stopName?: string | null
  readonly status?: string | null
}
