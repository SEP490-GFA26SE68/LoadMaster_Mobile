import { decodePolyline, pathFromEncodedPolylines } from '@/domain/routing/polyline'

import type { DriverTripDto, RoutePlanDetailDto } from './driver-http-dto'
import type { DriverRouteMap, DriverTripRow, DriverTrips } from './driver-model'
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
type ShownStatus = 'IN_TRANSIT' | 'LOADING' | 'DELIVERED'

/**
 * Một chuyến của "Chuyến của tôi": backend chưa có tên tuyến, số kiện, điểm đang giao, sự cố — để trống. Chuyến Đang xếp hàng mà kho đã
 * xếp xong (`loadingCompleted`) mang dòng phụ "Xếp xong — chờ xuất phát".
 */
export function tripRowOf(dto: DriverTripDto, status: ShownStatus): DriverTripRow {
  const id = String(dto.tripId)
  return {
    id,
    code: dto.tripCode ?? id,
    name: undefined,
    date: vnInstant(dto.departureTime),
    vehicleName: dto.vehicleLicensePlate ?? '',
    status,
    sub: status === 'LOADING' && dto.loadingCompleted === true ? { kind: 'loaded' } : null,
    manualSub: null,
    stopCount: dto.stopCount ?? 0,
    packageCount: undefined,
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
  return dto.status === 'IN_TRANSIT' || dto.status === 'LOADING' || dto.status === 'DELIVERED' ? dto.status : undefined
}

const byDeparture = (a: DriverTripDto, b: DriverTripDto) => (a.departureTime ?? '').localeCompare(b.departureTime ?? '') || a.tripId - b.tripId

/**
 * Chuyến của tài xế theo backend (như `myTripsOf` của web): Đang vận chuyển; Đang xếp hàng mà kho đã xếp xong ở "Xếp xong — chờ xuất
 * phát"; Đang xếp hàng mà kho chưa xong ở "Kho đang soạn / xếp"; Đã giao ở "Đã giao gần đây" (`RECENT_LIMIT` chuyến giao xong gần nhất).
 * Chuyến chưa tới kho và chuyến đã huỷ không hiện. Ba nhóm đầu: giờ xuất phát sớm trước, rồi mã chuyến.
 */
export function myTripsOf(dtos: readonly DriverTripDto[]): DriverTrips['groups'] {
  const of = (status: 'IN_TRANSIT' | 'LOADING', keep: (dto: DriverTripDto) => boolean = () => true) =>
    dtos.filter((dto) => dto.status === status && keep(dto)).toSorted(byDeparture).map((dto) => tripRowOf(dto, status))
  const loaded = (dto: DriverTripDto) => dto.loadingCompleted === true
  const recent = dtos
    .filter((dto) => dto.status === 'DELIVERED')
    .map((dto) => tripRowOf(dto, 'DELIVERED'))
    .toSorted((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, RECENT_LIMIT)
  return { inTransit: of('IN_TRANSIT'), loaded: of('LOADING', loaded), preparing: of('LOADING', (dto) => !loaded(dto)), recent }
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
