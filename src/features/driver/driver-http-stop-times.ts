import type { DeadlineStatus } from '@/domain/routing'
import { LOCATION_SOURCES } from '@/lib/mock-db'

import { vnInstant } from './driver-http-mapping'
import type { DriverTripStop } from './driver-model'
import type { EtaSource, StopTiming } from './stop-timing'

/*
 * Giờ đến và hạn giao các điểm theo máy chủ (`GET /api/driver/trips/{id}/stops`), như `server-stop-timing.ts` + `tripStopsOf` của web:
 * đã đến thì giờ đến thật và kịp / trễ hạn; chưa đến thì giờ đến dự kiến từ vị trí GPS, không có GPS thì giờ kế hoạch của tuyến. Máy chủ
 * tính nên màn không kèm MOCK RESULT.
 */

/** `GET /api/driver/trips/{id}/stops` — mốc giờ là `LocalDateTime` giờ Việt Nam (DTO chỉ ở file này). */
export type DriverTripStopsDto = {
  readonly tripId: number
  readonly status: string | null
  readonly location: { readonly source: string | null } | null
  readonly refreshMs: number | null
  readonly stops:
    | readonly {
        readonly stopId?: number | null
        readonly stopSequence: number | null
        readonly stopName: string | null
        readonly address: string | null
        readonly status: string | null
        readonly packageCount: number | null
        readonly plannedArrival: string | null
        readonly actualArrival: string | null
        readonly deadline: string | null
        readonly plannedStatus: string | null
        readonly eta: string | null
        readonly etaStatus: string | null
      }[]
    | null
}

/** Một điểm của chuyến theo máy chủ; mọi mốc giờ là ISO 8601. */
export type ServerTripStop = {
  readonly number: number
  readonly name: string
  readonly done: boolean
  readonly packageCount: number | undefined
  /** Giờ đến kế hoạch của tuyến. */
  readonly plannedArrival: string | undefined
  readonly plannedStatus: DeadlineStatus | undefined
  /** Giờ tài xế bấm "Đã đến". */
  readonly actualArrival: string | undefined
  /** Hạn của yêu cầu giao của điểm. */
  readonly deadline: string | undefined
  /** Giờ đến dự kiến tính từ vị trí GPS mới nhất của xe. */
  readonly eta: string | undefined
  readonly etaStatus: DeadlineStatus | undefined
}

export type ServerTripStops = {
  /** Nguồn của vị trí xe mới nhất; `null` khi chưa có vị trí (chưa xuất phát, hoặc điện thoại chưa gửi). */
  readonly location: { readonly source: EtaSource } | null
  /** Lúc nên đọc lại (ms); `null` khi chuyến không còn chạy. */
  readonly refreshMs: number | null
  readonly stops: readonly ServerTripStop[]
}

const DEADLINE_STATUSES: readonly DeadlineStatus[] = ['OK', 'AT_RISK', 'MISSED']
const statusOf = (value: string | null): DeadlineStatus | undefined => DEADLINE_STATUSES.find((status) => status === value)

/** Giờ đến của các điểm theo máy chủ. Nguồn vị trí lạ đọc là GPS (điện thoại tài xế là nguồn duy nhất máy chủ nhận). */
export function tripStopsOf(dto: DriverTripStopsDto): ServerTripStops {
  const source = dto.location === null ? null : (LOCATION_SOURCES.find((entry) => entry === dto.location?.source) ?? 'GPS')
  return {
    location: source === null ? null : { source },
    refreshMs: dto.refreshMs,
    stops: (dto.stops ?? []).flatMap((stop): ServerTripStop[] =>
      stop.stopSequence === null
        ? []
        : [
            {
              number: stop.stopSequence,
              name: stop.stopName ?? '',
              done: stop.status === 'COMPLETED',
              packageCount: stop.packageCount ?? undefined,
              plannedArrival: vnInstant(stop.plannedArrival),
              plannedStatus: statusOf(stop.plannedStatus),
              actualArrival: vnInstant(stop.actualArrival),
              deadline: vnInstant(stop.deadline),
              eta: vnInstant(stop.eta),
              etaStatus: statusOf(stop.etaStatus),
            },
          ],
    ),
  }
}

/** Giờ của một điểm theo máy chủ, cùng dạng với `stopTiming` của kho mẫu. Không có giờ nào thì `expected` vắng. */
export function serverStopTiming(stop: ServerTripStop, location: ServerTripStops['location']): StopTiming {
  const { deadline } = stop
  if (stop.actualArrival !== undefined) {
    const onTime = deadline === undefined ? null : Date.parse(stop.actualArrival) <= Date.parse(deadline)
    return { deadline, arrival: { at: stop.actualArrival, onTime }, expected: undefined }
  }
  if (stop.eta !== undefined && location !== null) {
    return { deadline, arrival: undefined, expected: { eta: stop.eta, source: location.source, status: stop.etaStatus } }
  }
  if (stop.plannedArrival !== undefined) {
    return { deadline, arrival: undefined, expected: { eta: stop.plannedArrival, source: 'PLAN', status: stop.plannedStatus } }
  }
  return { deadline, arrival: undefined, expected: undefined }
}

/** Giờ của một điểm trong danh sách điểm: điểm đã hoàn tất không có giờ, điểm không có giờ nào cũng vậy. */
function listTiming(stop: ServerTripStop, location: ServerTripStops['location']): StopTiming | undefined {
  if (stop.done) return undefined
  const timing = serverStopTiming(stop, location)
  return timing.arrival || timing.expected ? timing : undefined
}

/** Các điểm của chuyến cho danh sách điểm (thẻ chuyến, màn điểm giao), kèm giờ của điểm chưa hoàn tất. */
export function serverTripStops(trip: ServerTripStops): DriverTripStop[] {
  return trip.stops.map((stop) => ({
    number: stop.number,
    name: stop.name,
    // Máy chủ không trả loại điểm: màn điểm giao đặt loại của điểm hiện tại theo `current-stop`
    kind: 'DELIVERY',
    packageCount: stop.packageCount,
    done: stop.done,
    timing: listTiming(stop, trip.location),
  }))
}

/** Nguồn của các giờ đến dự kiến trong danh sách, không lặp, theo thứ tự điểm — một dòng nguồn cho cả danh sách. */
export function serverEtaSources(stops: readonly DriverTripStop[]): EtaSource[] {
  const sources: EtaSource[] = []
  for (const stop of stops) {
    const source = stop.timing?.arrival === undefined ? stop.timing?.expected?.source : undefined
    if (source !== undefined && !sources.includes(source)) sources.push(source)
  }
  return sources
}
