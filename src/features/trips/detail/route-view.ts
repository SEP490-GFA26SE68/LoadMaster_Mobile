import type { Formatter } from '@/lib/format'
import type { TFunction } from '@/lib/i18n'
import type { DeliveryProgress } from '@/lib/mock-db'

import type { RouteProgress } from '../trip-detail'
import type { StopRow } from '../trip-summary'

/** Trạng thái giao của một điểm khi chuyến đang giao hoặc đã hoàn thành (như `StopState` của web). */
export type StopState =
  | { readonly kind: 'done'; readonly at: string; readonly issues: number }
  | { readonly kind: 'current'; readonly unloaded: number; readonly issues: number }
  | { readonly kind: 'pending'; readonly issues: number }

/**
 * Trạng thái giao từng điểm, như sơ đồ tuyến của web: điểm đã hoàn tất là đã giao; điểm chưa hoàn tất đầu tiên là điểm đang giao (khi
 * chuyến chưa xong); còn lại chưa giao. Mỗi điểm kèm số sự cố ghi tại điểm.
 */
export function stopStates(stops: readonly StopRow[], delivery: DeliveryProgress, progress: RouteProgress): StopState[] {
  const done = new Map(delivery.stops.map((stop) => [stop.number, stop.completedAt]))
  const current = delivery.completedAt === undefined ? delivery.stops.find((stop) => stop.completedAt === undefined)?.number : undefined
  return stops.map(({ number }) => {
    const { unloaded = 0, issues = 0 } = progress.byStop.get(number) ?? {}
    const completedAt = done.get(number)
    if (completedAt !== undefined) return { kind: 'done', at: completedAt, issues }
    return number === current ? { kind: 'current', unloaded, issues } : { kind: 'pending', issues }
  })
}

/** "3 giờ 20 phút" · "45 phút" — thời gian cả tuyến hay tổng giờ nghỉ, phút nguyên (như thanh tuyến của web). */
export function durationLabel(totalMinutes: number, t: TFunction, format: Formatter): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = format.integer(totalMinutes % 60)
  return hours === 0 ? t('trips.routePlan.minutes', { minutes }) : t('trips.routePlan.duration', { hours: format.integer(hours), minutes })
}

/** Tên đọc của trạng thái giao một điểm, nối vào tên đọc của điểm. */
export function stopStateLabel(state: StopState, t: TFunction, format: Formatter): string {
  if (state.kind === 'done') return t('trips.route.stateA11y.done', { time: format.time(state.at) })
  return state.kind === 'current' ? t('trips.route.stateA11y.current') : t('trips.route.stateA11y.pending')
}
