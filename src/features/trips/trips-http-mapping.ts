import { ApiError } from '@/data/http'
import { MANUAL_CONFIRM_REASONS, vnDate, type ManualConfirmReason, type TripPhase, type VerifyContext } from '@/lib/mock-db'
import { decimalOf, isoFromBackend, optionalIso, pick } from '@/lib/office-backend'
import { TRIP_STATUSES, type TripStatus } from '@/types/trip'

import type { TripRow } from './trip-list'
import type { ManualConfirmationDto, StagingShortageDto, TripDetailDto, TripDto, TripStopDto } from './trips-http-dto'
import type { ManualConfirmRow, ServerTripDetail, ServerTripStop, ShortageRow } from './trips-model'

/*
 * Đổi DTO chuyến của backend sang kiểu của màn chuyến, như `trips-dto.ts` và `manual-confirm-backend-api.ts` của web. Mã chuyến
 * (`tripCode`) là mã của màn ở mọi chỗ. Trạng thái chuyến ngoài sáu trạng thái của hợp đồng là lỗi của máy chủ.
 */

const PHASE_OF: Readonly<Record<TripStatus, TripPhase>> = {
  DRAFT: 'planning',
  PLANNED: 'planning',
  LOADING: 'loading',
  IN_TRANSIT: 'delivering',
  DELIVERED: 'completed',
  CANCELLED: 'cancelled',
}

function statusOf(value: string): TripStatus {
  const status = pick(TRIP_STATUSES, value)
  if (status === undefined) throw new ApiError('SERVER_ERROR')
  return status
}

/** Mã chuyến; chuyến cũ chưa có mã thì mã số. */
export const tripCodeOf = (dto: Pick<TripDto, 'id' | 'tripCode'>): string => dto.tripCode?.trim() || String(dto.id)

/** "Tên xe · biển số" như tên xe của kho mẫu. */
function vehicleLabel(dto: TripDto): string {
  const name = dto.vehicleName?.trim() ?? ''
  const plate = dto.licensePlate?.trim() ?? ''
  return name && plate && name !== plate ? `${name} · ${plate}` : name || plate
}

/**
 * Một dòng danh sách. Máy chủ không trả tên các điểm giao, phương án xếp hàng hay tiến độ kho: tuyến rỗng, lấp đầy và hai dòng phụ
 * `null` — màn bỏ phần dựa trên chúng (`TripsCapabilities.planStatus`). Chuyến chưa có giờ xuất phát có ngày chạy rỗng.
 */
export function tripRowOf(dto: TripDto): TripRow {
  const status = statusOf(dto.status)
  const code = tripCodeOf(dto)
  const departure = optionalIso(dto.departureTime)
  return {
    id: code,
    name: dto.tripName?.trim() || code,
    scheduledDate: departure === undefined ? '' : vnDate(new Date(departure)),
    vehicleId: dto.vehicleId === null || dto.vehicleId === undefined ? '' : String(dto.vehicleId),
    vehicleName: vehicleLabel(dto),
    driverId: dto.driverId === null || dto.driverId === undefined ? null : String(dto.driverId),
    driverName: dto.driverName?.trim() || null,
    route: '',
    packageCount: dto.packageCount ?? 0,
    stopCount: dto.stopCount ?? 0,
    volumePercent: null,
    hasActiveRoutePlan: dto.hasActiveRoutePlan === true,
    status,
    sub: null,
    extraSub: null,
    phase: PHASE_OF[status],
  }
}

const STOP_STATUSES = ['PENDING', 'ARRIVED', 'COMPLETED'] as const

/** Toạ độ đủ hai số; thiếu một số, hay 0, 0 (máy chủ rơi về khi không có), là không có toạ độ. */
function coordinatesOf(lat: number | string | null | undefined, lng: number | string | null | undefined): { lat: number; lng: number } | undefined {
  const latitude = decimalOf(lat)
  const longitude = decimalOf(lng)
  if (latitude === null || longitude === null || (latitude === 0 && longitude === 0)) return undefined
  return { lat: latitude, lng: longitude }
}

function stopOf(dto: TripStopDto, index: number): ServerTripStop {
  const plannedArrival = optionalIso(dto.plannedArrival)
  const actualArrival = optionalIso(dto.actualArrival)
  const deadline = optionalIso(dto.deadline)
  const coordinates = coordinatesOf(dto.latitude, dto.longitude)
  return {
    id: String(dto.id),
    number: typeof dto.stopSequence === 'number' ? dto.stopSequence : index + 1,
    name: dto.stopName?.trim() || dto.address?.trim() || '',
    address: dto.address?.trim() ?? '',
    ...coordinates,
    kind: dto.stopType === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
    status: pick(STOP_STATUSES, dto.status) ?? 'PENDING',
    ...(dto.deliveryRequirementId === null || dto.deliveryRequirementId === undefined ? {} : { requirementId: String(dto.deliveryRequirementId) }),
    ...(plannedArrival === undefined ? {} : { plannedArrival }),
    ...(actualArrival === undefined ? {} : { actualArrival }),
    ...(deadline === undefined ? {} : { deadline }),
  }
}

/** Chi tiết chuyến của máy chủ: đầu chuyến và các điểm theo thứ tự đi. */
export function serverDetailOf(dto: TripDetailDto): ServerTripDetail {
  const { trip } = dto
  const status = statusOf(trip.status)
  const depotName = trip.originName?.trim() ?? ''
  const depotAddress = trip.originAddress?.trim() ?? ''
  const cancelReason = trip.cancelReason?.trim()
  const depotAt = coordinatesOf(trip.originLatitude, trip.originLongitude)
  return {
    kind: 'server',
    id: tripCodeOf(trip),
    name: trip.tripName?.trim() || tripCodeOf(trip),
    status,
    phase: PHASE_OF[status],
    departureAt: optionalIso(trip.departureTime) ?? null,
    vehicleName: vehicleLabel(trip),
    driverName: trip.driverName?.trim() || null,
    depot: depotName === '' && depotAddress === '' && depotAt === undefined ? null : { name: depotName, address: depotAddress, ...depotAt },
    packageCount: trip.packageCount ?? 0,
    ...(cancelReason ? { cancelReason } : {}),
    stops: (dto.stops ?? []).map(stopOf).toSorted((a, b) => a.number - b.number),
  }
}

/** Mã in trên nhãn: mã của bên gửi, không thì mã vạch, không thì mã của kho kiện. */
const labelCode = (dto: Pick<ManualConfirmationDto, 'packageCode' | 'trackingBarcode' | 'packageId'>): string =>
  dto.packageCode?.trim() || dto.trackingBarcode?.trim() || (dto.packageId === null || dto.packageId === undefined ? '' : String(dto.packageId))

const reasonOf = (value: string | null | undefined): ManualConfirmReason => pick(MANUAL_CONFIRM_REASONS, value) ?? 'OTHER'

const STEPS: readonly VerifyContext[] = ['STAGING', 'LOADING', 'UNLOADING']

/** Một xác nhận tay chờ duyệt; số điểm chỉ có nghĩa khi dỡ, như kho mẫu. */
export function manualConfirmRowOf(dto: ManualConfirmationDto): ManualConfirmRow {
  const context = pick(STEPS, dto.step) ?? 'UNLOADING'
  const note = dto.note?.trim()
  return {
    id: String(dto.id),
    context,
    ...(context === 'UNLOADING' && typeof dto.stopSequence === 'number' ? { stopNumber: dto.stopSequence } : {}),
    packageInstanceId: labelCode(dto),
    packageName: dto.packageName?.trim() ?? '',
    reason: reasonOf(dto.reason),
    ...(note ? { note } : {}),
    at: dto.requestedAt ? isoFromBackend(dto.requestedAt) : new Date(0).toISOString(),
    senderName: dto.requestedByName?.trim() || null,
  }
}

/** Một kiện kho đang báo thiếu; quyết theo mã của lần báo. */
export function shortageRowOf(dto: StagingShortageDto): ShortageRow {
  const code = labelCode(dto)
  return {
    id: String(dto.id),
    packageInstanceId: code,
    packageName: dto.packageName?.trim() ?? '',
    packageCode: code,
    ...(typeof dto.stopSequence === 'number' ? { stopNumber: dto.stopSequence } : {}),
    at: dto.reportedAt ? isoFromBackend(dto.reportedAt) : new Date(0).toISOString(),
    reporterName: dto.reportedByName?.trim() || null,
  }
}
