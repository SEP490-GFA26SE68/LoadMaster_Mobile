import { REROUTE_ROUTES, type DeadlineStatus } from '@/domain/routing'
import { ApiError } from '@/data/http'
import {
  EXCEPTION_ESCALATIONS,
  LOCATION_SOURCES,
  TRIP_EXCEPTION_STATUSES,
  TRIP_EXCEPTION_TYPES,
  type EtaRiskAlert,
  type LocationPoint,
  type RerouteChoice,
  type RerouteProposal,
  type TripException,
  type TripLiveStop,
  type TripReroute,
} from '@/lib/mock-db'
import { isoFromBackend, pick, required } from '@/lib/office-backend'

import type {
  BoardStopDto,
  BoardTripDto,
  DeliveryRequirementDto,
  EtaRiskAlertDto,
  LiveStopDto,
  LocationPointDto,
  MonitoringBoardDto,
  RequirementStopDto,
  RerouteOptionDto,
  RerouteProposalDto,
  TripExceptionDto,
  TripMonitoringDto,
  TripRerouteDto,
} from './monitoring-http-dto'
import type { LiveMonitoring, MonitoringBoard, MonitoringStop, MonitoringTrip, RenegotiableRequirement } from './monitoring-model'

/*
 * Đổi DTO của `MonitoringController` sang kiểu của màn giám sát, như `monitoring-dto.ts` / `monitoring-exception-dto.ts` của web. Mã chuyến
 * của backend (`tripCode`) là `tripId` ở mọi chỗ — endpoint nhận cả mã số lẫn mã chuyến. Giá trị ngoài các tập của hợp đồng (loại, trạng
 * thái sự cố, tuyến) là lỗi của máy chủ.
 */

const DEADLINE_STATUSES: readonly DeadlineStatus[] = ['OK', 'AT_RISK', 'MISSED']

const coordinates = (lat: number | null | undefined, lng: number | null | undefined) =>
  typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : {}

/** Điểm vị trí: tốc độ km/h nguyên, hướng độ nguyên 0–359; backend chỉ có hai nguồn `GPS` và `SIMULATED`. */
export function locationOf(dto: LocationPointDto): LocationPoint {
  const heading = Math.round(dto.heading ?? 0) % 360
  return {
    lat: dto.lat,
    lng: dto.lng,
    speedKmh: Math.max(0, Math.round(dto.speedKmh ?? 0)),
    heading: heading < 0 ? heading + 360 : heading,
    recordedAt: isoFromBackend(dto.recordedAt),
    source: pick(LOCATION_SOURCES, dto.source) ?? 'GPS',
  }
}

function stopOf(dto: BoardStopDto): MonitoringStop {
  return {
    id: String(dto.id),
    number: dto.number,
    name: dto.name ?? '',
    ...coordinates(dto.lat, dto.lng),
    ...(dto.arrivedAt ? { arrivedAt: isoFromBackend(dto.arrivedAt) } : {}),
    ...(dto.completedAt ? { completedAt: isoFromBackend(dto.completedAt) } : {}),
  }
}

/** Kho xuất phát. Thiếu toạ độ, backend lấy điểm giao đầu tiên làm kho rồi rơi về 0, 0: cả hai coi như không có kho. */
function depotOf(dto: BoardTripDto, stops: readonly MonitoringStop[]): MonitoringTrip['depot'] {
  const depot = dto.depot
  if (!depot || typeof depot.lat !== 'number' || typeof depot.lng !== 'number' || (depot.lat === 0 && depot.lng === 0)) return undefined
  const [first] = stops
  if (first && first.lat === depot.lat && first.lng === depot.lng) return undefined
  return { name: depot.name ?? '', lat: depot.lat, lng: depot.lng }
}

export function tripOf(dto: BoardTripDto): MonitoringTrip {
  const stops = (dto.stops ?? []).map(stopOf)
  const depot = depotOf(dto, stops)
  return {
    tripId: dto.tripId,
    // Backend chưa có tên tuyến: `name` là chính mã chuyến, màn không nhắc lại mã
    name: dto.name && dto.name !== dto.tripId ? dto.name : '',
    vehicleName: dto.vehicleName ?? '',
    driverName: dto.driverName ?? null,
    ...(depot ? { depot } : {}),
    stops,
  }
}

/** Bảng giám sát. Máy chủ chưa có nhận hàng dọc đường ở đây: không có số yêu cầu chờ duyệt. */
export function boardOf(dto: MonitoringBoardDto | null): MonitoringBoard {
  return { trips: (dto?.trips ?? []).map(tripOf), userNames: { ...dto?.userNames }, pendingPickups: {} }
}

/** Giờ đến của một điểm chưa hoàn tất; cờ `arrived` của backend không có nghĩa "xe đã tới" nên mọi điểm đọc là giờ đến dự kiến. */
function liveStopOf(dto: LiveStopDto): TripLiveStop {
  const deadlineStatus = pick(DEADLINE_STATUSES, dto.deadlineStatus)
  return {
    stopId: String(dto.stopId),
    number: dto.number,
    eta: isoFromBackend(dto.eta),
    ...(dto.deadline ? { deadline: isoFromBackend(dto.deadline) } : {}),
    ...(deadlineStatus ? { deadlineStatus } : {}),
  }
}

function alertsOf(dto: EtaRiskAlertDto): EtaRiskAlert[] {
  const status = dto.status === 'AT_RISK' || dto.status === 'MISSED' ? dto.status : undefined
  if (!status || dto.stopId === null || dto.stopId === undefined || typeof dto.stopNumber !== 'number') return []
  return [
    {
      eventId: dto.eventId,
      at: isoFromBackend(dto.at),
      tripId: dto.tripId,
      stopId: String(dto.stopId),
      stopNumber: dto.stopNumber,
      status,
      eta: isoFromBackend(dto.eta),
      deadline: isoFromBackend(dto.deadline),
    },
  ]
}

export function exceptionOf(dto: TripExceptionDto): TripException {
  const reason = pick(EXCEPTION_ESCALATIONS, dto.escalation?.reason)
  const escalatedAt = dto.escalation?.at
  const resolution = dto.resolution
  return {
    id: dto.id,
    tripId: dto.tripId ?? '',
    type: required(TRIP_EXCEPTION_TYPES, dto.type),
    description: dto.description ?? '',
    delayMinutes: dto.delayMinutes ?? 0,
    status: required(TRIP_EXCEPTION_STATUSES, dto.status),
    ...(typeof dto.stopNumber === 'number' ? { stopNumber: dto.stopNumber } : {}),
    reportedAt: isoFromBackend(dto.reportedAt),
    reportedBy: dto.reportedBy ?? null,
    ...(reason && escalatedAt ? { escalation: { reason, at: isoFromBackend(escalatedAt), by: dto.escalation?.by ?? null } } : {}),
    ...(resolution?.at
      ? { resolution: { at: isoFromBackend(resolution.at), by: resolution.by ?? null, ...(resolution.note ? { note: resolution.note } : {}) } }
      : {}),
  }
}

function choiceOf(dto: RerouteOptionDto): RerouteChoice {
  return {
    index: dto.index,
    route: required(REROUTE_ROUTES, dto.route),
    distanceKm: dto.distanceKm,
    durationMinutes: dto.durationMinutes,
    extraMs: dto.extraMs ?? 0,
    eta: isoFromBackend(dto.eta),
  }
}

/** Tuyến đã chọn; `undefined` khi bản ghi thiếu giờ chọn hoặc số điểm. */
export function rerouteOf(dto: TripRerouteDto): TripReroute | undefined {
  if (!dto.confirmedAt || typeof dto.stopNumber !== 'number') return undefined
  return { ...choiceOf(dto), stopNumber: dto.stopNumber, confirmedAt: isoFromBackend(dto.confirmedAt), confirmedBy: dto.confirmedBy ?? null }
}

export function proposalOf(dto: RerouteProposalDto): RerouteProposal {
  return {
    tripId: dto.tripId,
    requestedAt: isoFromBackend(dto.requestedAt),
    stopId: String(dto.stopId),
    stopNumber: dto.stopNumber,
    options: (dto.options ?? []).map(choiceOf),
    isMockResult: dto.isMockResult === true,
  }
}

/** Nhịp đọc lại: backend trả 30 giây khi chuyến đang chạy, `null` khi không; màn đọc lại nhiều nhất mỗi giây. */
export function liveOf(dto: TripMonitoringDto): LiveMonitoring {
  const reroute = dto.reroute ? rerouteOf(dto.reroute) : undefined
  return {
    tripId: dto.tripId,
    location: dto.location ? locationOf(dto.location) : null,
    stops: (dto.stops ?? []).map(liveStopOf),
    alerts: (dto.alerts ?? []).flatMap(alertsOf),
    exceptions: (dto.exceptions ?? []).map(exceptionOf),
    ...(reroute ? { reroute } : {}),
    refreshMs: typeof dto.refreshMs === 'number' && dto.refreshMs > 0 ? Math.max(1000, dto.refreshMs) : null,
    isMockResult: dto.isMockResult === true,
  }
}

/**
 * Yêu cầu giao của chuyến còn gia hạn được: có hạn và còn một điểm giao chưa hoàn tất trong chuyến (số điểm là `stopSequence`, như số điểm
 * của bảng giám sát). Tên là tên điểm giao, không có thì tên khách rồi địa chỉ.
 */
export function renegotiableOf(requirements: readonly DeliveryRequirementDto[], stops: readonly RequirementStopDto[]): RenegotiableRequirement[] {
  return requirements
    .flatMap((dto) => {
      const stop = stops.find(
        (item) =>
          item.deliveryRequirementId !== null &&
          item.deliveryRequirementId !== undefined &&
          String(item.deliveryRequirementId) === String(dto.id) &&
          item.status !== 'COMPLETED' &&
          typeof item.stopSequence === 'number',
      )
      if (!stop || typeof stop.stopSequence !== 'number' || !dto.deadline) return []
      return [
        {
          id: String(dto.id),
          destinationName: stop.stopName || dto.customerName || dto.destination || '',
          deadline: isoFromBackend(dto.deadline),
          stopNumber: stop.stopSequence,
        },
      ]
    })
    .toSorted((a, b) => a.stopNumber - b.stopNumber || Date.parse(a.deadline) - Date.parse(b.deadline))
}

/** Phản hồi xác nhận tuyến thiếu giờ chọn hay số điểm là lỗi của máy chủ. */
export function confirmedRerouteOf(dto: TripRerouteDto): TripReroute {
  const reroute = rerouteOf(dto)
  if (reroute === undefined) throw new ApiError('SERVER_ERROR')
  return reroute
}
