import { decodePolyline, pathFromEncodedPolylines } from '@/domain/routing/polyline'
import { TRIP_STATUSES, type TripStatus } from '@/types/trip'

import type { DriverRouteMap, DriverTripRow, DriverTripStop, StopItem, StopScreen, VerifyVia } from './driver-model'

/*
 * Dữ liệu backend trả cho tài xế (`/api/driver/**`) và cách đổi sang dạng màn cần (`driver-model.ts`). Kiểu DTO không ra khỏi lớp
 * `driver-http*`. Phần backend chưa trả thì để trống — màn bỏ hẳn phần đó, không điền số thay.
 */

/** `GET /api/driver/trips` — chỉ chuyến đang vận chuyển. */
export type DriverTripDto = {
  readonly tripId: number
  readonly tripCode: string | null
  readonly vehicleLicensePlate: string | null
  readonly stopCount: number
  /** `LocalDateTime` của backend: không kèm múi giờ. */
  readonly departureTime: string | null
  readonly status: string | null
}

export type StopPackageDto = {
  readonly packageId: number | null
  readonly packageName: string | null
  readonly trackingBarcode: string | null
  readonly weight: number | null
  readonly unloadOrder: number
}

/** `GET /api/driver/trips/{id}/current-stop` — điểm chưa hoàn tất đầu tiên và kiện của điểm đó theo thứ tự dỡ. */
export type CurrentStopDto = {
  readonly stopId: number
  readonly stopSequence: number
  readonly stopName: string | null
  readonly address: string | null
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

/** `POST /api/driver/stops/{id}/complete` */
export type CompleteStopDto = { readonly tripCompleted: boolean }

/** `POST /api/driver/location` */
export type LocationPointDto = { readonly recordedAt: string }

/** Kiện đã dỡ ở một điểm, theo mã kiện, kèm cách đối chiếu (`undefined`: biết đã dỡ nhưng không biết bằng cách nào). */
export type UnloadedItems = ReadonlyMap<string, VerifyVia | undefined>

const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/

/**
 * Giờ backend lưu kiểu `LocalDateTime` (không múi giờ) là giờ Việt Nam: thêm `+07:00` để thành một thời điểm. Phần lẻ của giây giữ tối
 * đa 3 chữ số (Hermes không đọc được nhiều hơn). Rỗng hoặc đọc không được thì `undefined`.
 */
export function vnInstant(value: string | null): string | undefined {
  const text = value?.trim().replace(/(\.\d{3})\d+/, '$1') ?? ''
  if (text === '') return undefined
  const iso = LOCAL_DATE_TIME.test(text) ? `${text}+07:00` : text
  return Number.isNaN(Date.parse(iso)) ? undefined : iso
}

const tripStatusOf = (value: string | null): TripStatus => TRIP_STATUSES.find((status) => status === value) ?? 'IN_TRANSIT'

/** Một chuyến của danh sách: backend chưa có tên tuyến, số kiện, giờ đến, sự cố — để trống. */
export function tripRowOf(dto: DriverTripDto): DriverTripRow {
  const id = String(dto.tripId)
  return {
    id,
    code: dto.tripCode ?? id,
    name: undefined,
    date: vnInstant(dto.departureTime),
    vehicleName: dto.vehicleLicensePlate ?? '',
    status: tripStatusOf(dto.status),
    sub: null,
    manualSub: null,
    stopCount: dto.stopCount,
    packageCount: undefined,
    currentStop: undefined,
    completedAt: undefined,
    issueCount: 0,
    recheck: 0,
    stops: [],
    etaSources: [],
  }
}

/**
 * Kiện của điểm ứng với mã quét hoặc gõ được: khớp mã in trên nhãn (mã vạch; kiện không có mã vạch thì mã kiện), không phân biệt hoa
 * thường. `label` là mã hiện trên màn.
 */
export function packageOfCode(dto: CurrentStopDto, code: string): { readonly packageId: number; readonly label: string } | undefined {
  const wanted = code.trim().toUpperCase()
  if (wanted === '') return undefined
  for (const { packageId, trackingBarcode } of dto.packages ?? []) {
    if (packageId === null) continue
    const label = trackingBarcode ?? String(packageId)
    if (label.trim().toUpperCase() === wanted) return { packageId, label }
  }
  return undefined
}

function itemsOf(dto: CurrentStopDto, unloaded: UnloadedItems): StopItem[] {
  return (dto.packages ?? []).flatMap((pkg): StopItem[] => {
    if (pkg.packageId === null) return []
    const id = String(pkg.packageId)
    return [
      {
        id,
        label: pkg.trackingBarcode ?? id,
        name: pkg.packageName ?? pkg.trackingBarcode ?? id,
        weightKg: pkg.weight ?? undefined,
        unloadingOrder: pkg.unloadOrder,
        place: undefined,
        unloaded: unloaded.has(id),
        via: unloaded.get(id),
        rejectedReason: undefined,
        issueKind: undefined,
        returned: false,
      },
    ]
  })
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

/**
 * Màn điểm giao từ điểm hiện tại của backend. Backend chưa có bước "Đã đến" nên điểm hiện tại luôn dỡ được; chưa trả kiện nào đã dỡ nên
 * adapter đưa vào những kiện nó đã ghi (`unloaded`); chỉ biết điểm hiện tại nên các điểm khác của dải tiến độ chỉ có số và đã xong
 * hay chưa (điểm hoàn tất theo thứ tự). Toạ độ lấy từ plan active khi có.
 */
export function stopScreenOf(
  dto: CurrentStopDto,
  tripStopCount: number,
  unloaded: UnloadedItems,
  plan: RoutePlanDetailDto | null = null,
): StopScreen {
  const number = dto.stopSequence
  const name = dto.stopName ?? ''
  const items = itemsOf(dto, unloaded)
  const doneCount = items.filter((item) => item.unloaded).length
  const remaining = items.length - doneCount
  const stopCount = Math.max(tripStopCount, number)
  const stops = Array.from({ length: stopCount }, (_, index): DriverTripStop => {
    const current = index + 1 === number
    return {
      number: index + 1,
      name: current ? name : '',
      kind: 'DELIVERY',
      packageCount: current ? items.length : undefined,
      done: index + 1 < number,
      timing: undefined,
    }
  })
  const routeMap = routeMapOf(plan, { number, name })
  const here = routeMap?.stops.find((stop) => stop.number === number)
  return {
    mode: 'delivering',
    stop: {
      number,
      ref: String(dto.stopId),
      name,
      address: dto.address ?? '',
      phone: undefined,
      contactName: undefined,
      kind: 'DELIVERY',
      lat: here?.lat,
      lng: here?.lng,
    },
    stops,
    stopCount,
    arrived: true,
    arrivedAt: undefined,
    timing: undefined,
    items,
    pickupItems: [],
    leftAtWarehouse: 0,
    total: items.length,
    doneCount,
    issueCount: 0,
    remaining,
    verifiable: remaining,
    pendingConfirms: 0,
    completion: { delivered: doneCount, returned: [], picked: 0, issues: 0, next: undefined, nextKnown: false },
    names: Object.fromEntries(items.map((item) => [item.id, item.name])),
    hasPickupStops: false,
    refreshMs: null,
    routeMap,
  }
}
