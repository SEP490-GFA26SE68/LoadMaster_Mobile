import { decodePolyline, pathFromEncodedPolylines } from '@/domain/routing/polyline'
import type { TripStatus } from '@/types/trip'

import type { DriverTripDetailDto, DriverTripDto, RoutePlanDetailDto } from './driver-http-dto'
import type { DriverRouteMap, DriverTripDetail, DriverTripRow, DriverTrips } from './driver-model'
import { RECENT_LIMIT } from './my-trips'

/*
 * Chuyến của tài xế và tuyến đang đi theo backend, đổi sang dạng màn cần (`driver-model.ts`), theo `driver-dto.ts` của web. Phần backend
 * chưa trả thì để trống — màn bỏ hẳn phần đó, không điền số thay. Điểm đang giao: `driver-http-stop.ts`.
 */

const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/

/**
 * Giờ backend lưu kiểu `LocalDateTime` (không múi giờ) là giờ Việt Nam: thêm `+07:00` để thành một thời điểm. Phần lẻ của giây giữ tối
 * đa 3 chữ số (Hermes không đọc được nhiều hơn). Rỗng hoặc đọc không được thì `undefined`.
 */
export function vnInstant(value: string | null | undefined): string | undefined {
  const text = value?.trim().replace(/(\.\d{3})\d+/, '$1') ?? ''
  if (text === '') return undefined
  const iso = LOCAL_DATE_TIME.test(text) ? `${text}+07:00` : text
  return Number.isNaN(Date.parse(iso)) ? undefined : iso
}

/** Trạng thái chuyến màn tài xế dùng; trạng thái khác (chưa tới kho, đã huỷ) không hiện. */
type ShownStatus = 'IN_TRANSIT' | 'LOADING' | 'DELIVERED' | 'PLANNED' | 'DRAFT'

function optionalNumber(value: number | string | null | undefined): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

/**
 * Một chuyến của "Chuyến của tôi": mang đủ thông tin tổng quan cơ bản (ngày chạy, số điểm dừng, biển số xe, số kiện, khối lượng,
 * quãng đường, thời gian dự kiến hoàn thành). Chuyến Đang xếp hàng mà kho đã xếp xong (`loadingCompleted`) mang dòng phụ "Xếp xong — chờ xuất phát".
 */
export function tripRowOf(dto: DriverTripDto, status: ShownStatus): DriverTripRow {
  const id = String(dto.tripId)
  const totalWeightKg = optionalNumber(dto.totalWeightKg)
  const totalDistanceMeters = optionalNumber(dto.totalDistanceMeters)
  const estimatedDurationSeconds = optionalNumber(dto.totalDurationSeconds)
  const estimatedCompletionTime = vnInstant(dto.estimatedCompletionTime)
  return {
    id,
    code: dto.tripCode ?? id,
    name: dto.tripName?.trim() || undefined,
    date: vnInstant(dto.departureTime),
    vehicleName: dto.vehicleLicensePlate ?? '',
    status,
    sub: status === 'LOADING' && dto.loadingCompleted === true ? { kind: 'loaded' } : null,
    manualSub: null,
    stopCount: dto.stopCount ?? 0,
    packageCount: dto.totalPackages ?? undefined,
    ...(totalWeightKg === undefined ? {} : { totalWeightKg }),
    ...(totalDistanceMeters === undefined ? {} : { totalDistanceMeters }),
    ...(estimatedDurationSeconds === undefined ? {} : { estimatedDurationSeconds }),
    ...(estimatedCompletionTime === undefined ? {} : { estimatedCompletionTime }),
    currentStop: undefined,
    completedAt: status === 'DELIVERED' ? vnInstant(dto.completedAt) : undefined,
    issueCount: 0,
    recheck: 0,
    stops: [],
    etaSources: [],
  }
}

/** Trạng thái màn tài xế dùng của một chuyến backend; `undefined` khi chuyến không hiện. */
export function shownStatusOf(dto: DriverTripDto): ShownStatus | undefined {
  return dto.status === 'IN_TRANSIT' || dto.status === 'LOADING' || dto.status === 'DELIVERED' || dto.status === 'PLANNED' || dto.status === 'DRAFT'
    ? dto.status
    : undefined
}

const byDeparture = (a: DriverTripDto, b: DriverTripDto) => (a.departureTime ?? '').localeCompare(b.departureTime ?? '') || a.tripId - b.tripId
const byUpcomingDeparture = (a: DriverTripDto, b: DriverTripDto) =>
  (a.departureTime ?? '').localeCompare(b.departureTime ?? '') ||
  (a.tripCode ?? String(a.tripId)).localeCompare(b.tripCode ?? String(b.tripId))

function isUpcoming(dto: DriverTripDto): dto is DriverTripDto & { readonly status: 'DRAFT' | 'PLANNED' } {
  return dto.status === 'DRAFT' || dto.status === 'PLANNED'
}

/**
 * Chuyến của tài xế theo backend (như `myTripsOf` của web): Đang vận chuyển; Đang xếp hàng mà kho đã xếp xong ở "Xếp xong — chờ xuất
 * phát"; Đang xếp hàng mà kho chưa xong ở "Kho đang soạn / xếp"; Nháp và Đã lên kế hoạch ở "Chuyến sắp tới"; Đã giao ở "Đã giao gần đây" (`RECENT_LIMIT` chuyến giao xong gần nhất).
 * Chuyến chưa tới kho và chuyến đã huỷ không hiện. Ba nhóm đầu: giờ xuất phát sớm trước, rồi mã chuyến.
 */
export function myTripsOf(dtos: readonly DriverTripDto[]): DriverTrips['groups'] {
  const of = (status: 'IN_TRANSIT' | 'LOADING' | 'PLANNED', keep: (dto: DriverTripDto) => boolean = () => true) =>
    dtos.filter((dto) => dto.status === status && keep(dto)).toSorted(byDeparture).map((dto) => tripRowOf(dto, status))
  const loaded = (dto: DriverTripDto) => dto.loadingCompleted === true
  const recent = dtos
    .filter((dto) => dto.status === 'DELIVERED')
    .map((dto) => tripRowOf(dto, 'DELIVERED'))
    .toSorted((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, RECENT_LIMIT)
  const upcoming = dtos.filter(isUpcoming).toSorted(byUpcomingDeparture).map((dto) => tripRowOf(dto, dto.status))
  return { inTransit: of('IN_TRANSIT'), loaded: of('LOADING', loaded), preparing: of('LOADING', (dto) => !loaded(dto)), upcoming, recent }
}

/** Toàn bộ chuyến đã giao của tài xế, sắp xếp mới nhất trước (không cắt theo `RECENT_LIMIT`). */
export function deliveredHistoryOf(dtos: readonly DriverTripDto[]): DriverTripRow[] {
  return dtos
    .filter((dto) => dto.status === 'DELIVERED')
    .map((dto) => tripRowOf(dto, 'DELIVERED'))
    .toSorted((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
}

/** Đổi DTO chi tiết chuyến của backend sang kiểu `DriverTripDetail` màn cần. */
export function tripDetailOf(dto: DriverTripDetailDto): DriverTripDetail {
  const id = String(dto.tripId)
  return {
    id,
    code: dto.tripCode ?? id,
    name: dto.tripName ?? undefined,
    status: (dto.status as TripStatus) ?? 'PLANNED',
    departureTime: vnInstant(dto.departureTime),
    completedAt: vnInstant(dto.completedAt),
    loadingCompleted: dto.loadingCompleted ?? false,
    depot: {
      name: dto.depotName ?? '',
      address: dto.depotAddress ?? '',
      lat: dto.depotLat ?? undefined,
      lng: dto.depotLng ?? undefined,
    },
    vehicle: dto.vehicleId
      ? {
          id: String(dto.vehicleId),
          name: dto.vehicleName ?? undefined,
          licensePlate: dto.licensePlate ?? '',
          maxPayloadKg: dto.maxPayloadKg ?? undefined,
          typeName: dto.vehicleTypeName ?? undefined,
          innerLengthCm: dto.innerLengthCm ?? undefined,
          innerWidthCm: dto.innerWidthCm ?? undefined,
          innerHeightCm: dto.innerHeightCm ?? undefined,
          maxVolumeM3: dto.maxVolumeM3 ?? undefined,
        }
      : undefined,
    totalStops: dto.totalStops ?? (dto.stops?.length ?? 0),
    totalPackages: dto.totalPackages ?? 0,
    totalWeightKg: dto.totalWeightKg ?? undefined,
    dispatcher: dto.dispatcherName
      ? {
          name: dto.dispatcherName,
          phone: dto.dispatcherPhone ?? undefined,
        }
      : undefined,
    totalDistanceMeters: dto.totalDistanceMeters ?? undefined,
    totalDurationSeconds: dto.totalDurationSeconds ?? undefined,
    stops: (dto.stops ?? []).map((stop) => ({
      id: String(stop.stopId),
      number: stop.stopSequence,
      name: stop.stopName ?? '',
      address: stop.address ?? '',
      lat: stop.lat ?? undefined,
      lng: stop.lng ?? undefined,
      status: (stop.status as 'PENDING' | 'ARRIVED' | 'COMPLETED') ?? 'PENDING',
      kind: (stop.stopType as 'DELIVERY' | 'PICKUP') ?? 'DELIVERY',
      plannedArrival: vnInstant(stop.plannedArrival),
      actualArrival: vnInstant(stop.actualArrival),
      deadline: vnInstant(stop.deadline),
      plannedStatus: stop.plannedStatus as 'OK' | 'AT_RISK' | 'MISSED' | undefined,
      eta: vnInstant(stop.eta),
      etaStatus: stop.etaStatus as 'OK' | 'AT_RISK' | 'MISSED' | undefined,
      contactName: stop.contactName ?? undefined,
      contactPhone: stop.contactPhone ?? undefined,
      packages: (stop.packages ?? []).map((pkg) => ({
        id: String(pkg.packageId ?? pkg.packageCode ?? ''),
        code: pkg.packageCode ?? '',
        barcode: pkg.trackingBarcode ?? '',
        name: pkg.packageName ?? '',
        packageTypeName: pkg.packageTypeName ?? undefined,
        weightKg: pkg.weightKg ?? undefined,
        lengthCm: pkg.lengthCm ?? undefined,
        widthCm: pkg.widthCm ?? undefined,
        heightCm: pkg.heightCm ?? undefined,
        status: pkg.status ?? '',
        unloadOrder: pkg.unloadOrder ?? undefined,
        handlingClass: pkg.handlingClass ?? undefined,
        fragile: pkg.fragile ?? undefined,
        note: pkg.note ?? undefined,
      })),
    })),
  }
}

/** Bản đồ từ plan active: polyline Goong, mốc điểm = điểm cuối từng leg, kho = điểm đầu tuyến. */
export function routeMapOf(plan: RoutePlanDetailDto | null | undefined, current: { readonly number: number; readonly name: string }): DriverRouteMap | undefined {
  const ordered = [...(plan?.legs ?? [])].sort((left, right) => left.legSequence - right.legSequence)
  if (ordered.length === 0) return undefined
  const path = pathFromEncodedPolylines(ordered.map((leg) => leg.polyline))
  const stops = ordered.flatMap((leg) => {
    const segment = decodePolyline(leg.polyline ?? '')
    const last = segment[segment.length - 1]
    if (last === undefined) return []
    const currentStop = leg.legSequence === current.number
    return [{
      id: String(leg.endStopId ?? leg.legSequence),
      number: leg.legSequence,
      name: currentStop ? current.name : '',
      lat: last.lat,
      lng: last.lng,
    }]
  })
  const origin = path[0] ?? stops[0]
  if (origin === undefined) return undefined
  const here = ordered.find((leg) => leg.legSequence === current.number)
  return {
    depot: { name: '', lat: origin.lat, lng: origin.lng },
    stops,
    ...(path.length > 1 ? { path } : {}),
    ...(plan?.planVersion !== undefined && plan.planVersion !== null ? { planVersion: plan.planVersion } : {}),
    ...(here?.steps?.length ? { guidanceSteps: here.steps } : {}),
  }
}
