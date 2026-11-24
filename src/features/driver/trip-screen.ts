import { expandPackages } from '@/domain/cargo'
import { adaptResult } from '@/features/viewer3d/scene-input'
import { leftOutIds, type PackageVerification, type Revision, type Trip, type TripMonitoring } from '@/lib/mock-db'

import { deliverySummary, deliveryView, summaryStops, type DeliveryView } from './delivery-progress'
import { stopDeliveries, type StopDelivery } from './driver-plan'
import type { DriverTripScreen, DriverTripStop, StopScreen, TripSummaryModel, VerifyVia } from './driver-model'
import { stopCompletion } from './stop-completion'
import { stopListTimings, stopTiming } from './stop-timing'

/*
 * Kho mẫu → dữ liệu màn tài xế. Mọi phép tính là logic chép của web (`deliveryView`, `stopDeliveries`, `stopCompletion`, `stopTiming`…);
 * file này chỉ đổi kết quả sang dạng màn mobile đọc (`driver-model.ts`).
 */

export type DriverTripSource = {
  readonly trip: Trip
  /** Phương án tài xế làm theo (`driverPlan`); `null` khi chưa có bản duyệt. */
  readonly plan: Revision | null
  /** Vị trí xe và giờ đến trực tiếp — chỉ khi chuyến Đang vận chuyển và đã có tuyến. */
  readonly live: TripMonitoring | undefined
}

/** Cách kiện đã được đối chiếu: quét, gõ mã, xác nhận tay chờ / đã duyệt. */
export function verifyVia(verification: PackageVerification | undefined): VerifyVia | undefined {
  if (verification === undefined) return undefined
  if (verification.method !== 'MANUAL') return verification.method
  return verification.manual?.status === 'MANUAL_APPROVED' ? 'MANUAL_APPROVED' : 'MANUAL_PENDING'
}

/** Lý do điều phối viên từ chối xác nhận tay, khi kiện chưa xong và lần đối chiếu mới nhất là lần bị từ chối. */
function rejectedReason(done: boolean, verification: PackageVerification | undefined): string | undefined {
  return !done && verification?.manual?.status === 'MANUAL_REJECTED' ? (verification.manual.rejectReason ?? '') : undefined
}

export function tripScreen({ trip, plan, live }: DriverTripSource): DriverTripScreen {
  const head = { id: trip.id, code: trip.id, name: trip.name }
  if (trip.phase === 'cancelled') return { kind: 'cancelled', trip: head, reason: trip.cancellation?.reason ?? '' }
  if (!plan) return { kind: 'noPlan', trip: head }
  if (trip.phase === 'planning') return { kind: 'planning', trip: head, replan: trip.replan?.reason }
  if (trip.phase === 'completed') return { kind: 'completed', trip: head, summary: tripSummary(trip, plan) }

  const model = adaptResult({ trip: { id: trip.id, stops: trip.stops, inputVersion: trip.inputVersion }, revision: plan })
  const stops = stopDeliveries(trip.stops, model)
  const view = deliveryView(trip, stops)
  if (!view) return { kind: 'noStops', trip: head }
  return { kind: 'stop', trip: head, screen: stopScreen(trip, view, stops, live) }
}

function stopScreen(trip: Trip, view: DeliveryView, stops: readonly StopDelivery[], live: TripMonitoring | undefined): StopScreen {
  const delivering = view.mode === 'delivering'
  const liveNow = delivering ? live : undefined
  const { byStop } = stopListTimings(trip, liveNow)
  const left = leftOutIds(trip)
  const completion = stopCompletion(view, stops)
  const names: Record<string, string> = {}
  for (const stop of stops) for (const item of stop.items) names[item.id] = item.name
  const tripStops = stops.map(
    (stop): DriverTripStop => ({
      number: stop.number,
      name: stop.name,
      packageCount: stop.items.filter((item) => !left.has(item.id)).length,
      done: view.completedStops.has(stop.number),
      timing: byStop.get(stop.number),
    }),
  )
  const { stop } = view
  return {
    mode: view.mode,
    stop: {
      number: stop.number,
      ref: String(stop.number),
      name: stop.name,
      address: stop.address,
      phone: stop.phone,
      contactName: stop.contactName,
      lat: trip.stops[stop.number - 1]?.lat,
      lng: trip.stops[stop.number - 1]?.lng,
    },
    stops: tripStops,
    stopCount: stops.length,
    arrived: view.arrivedAt !== undefined,
    arrivedAt: view.arrivedAt,
    timing: stopTiming(trip, stop.number, view.arrivedAt, liveNow),
    items: view.items.map(({ item, unloaded, issue, returned, verification }) => {
      const pkg = trip.packages.find((p) => p.id === item.packageId)
      return {
        id: item.id,
        label: item.label ?? item.id,
        name: item.name,
        weightKg: item.weightKg,
        lengthCm: pkg?.lengthCm,
        widthCm: pkg?.widthCm,
        heightCm: pkg?.heightCm,
        handlingClass: pkg?.handlingClass ?? 'STANDARD',
        fragile: pkg?.handlingClass === 'FRAGILE',
        unloadingOrder: item.unloadingOrder,
        // Thiếu vùng hoặc lớp thì dòng kiện bỏ hẳn chỗ xếp, như `DeliveryItemRow` của web
        place: item.area === undefined || item.layer === undefined ? undefined : { area: item.area, layer: item.layer },
        unloaded,
        via: unloaded ? verifyVia(verification) : undefined,
        rejectedReason: rejectedReason(unloaded, verification),
        issueKind: issue?.kind,
        returned,
      }
    }),
    leftAtWarehouse: view.leftAtWarehouse.length,
    total: view.total,
    doneCount: view.unloadedCount,
    issueCount: view.issueCount,
    remaining: view.remaining,
    verifiable: view.verifiable,
    pendingConfirms: view.pendingConfirms,
    completion: {
      delivered: completion.delivered,
      returned: completion.returned.map((item) => ({ id: item.id, label: item.label ?? item.id, name: item.name })),
      issues: completion.issues,
      next: completion.next === undefined ? undefined : { number: completion.next.number, name: completion.next.name },
      nextKnown: true,
    },
    names,
    // Giờ đến tính từ vị trí xe đổi theo nhịp kho trả; đã đến điểm thì giờ đến là giờ thật, không cần đọc lại
    refreshMs: delivering && trip.routePlan !== undefined ? (live?.refreshMs ?? null) : null,
    routeMap: {
      depot: { name: trip.depot.name, lat: trip.depot.lat, lng: trip.depot.lng },
      stops: trip.stops.flatMap((item, index) =>
        item.lat === undefined || item.lng === undefined
          ? []
          : [{ id: item.id, number: index + 1, name: item.name, lat: item.lat, lng: item.lng }],
      ),
    },
  }
}

/** Tổng kết chuyến đã giao: mọi số đọc từ tiến độ giao trong kho; tên kiện của sự cố lấy từ phương án. */
function tripSummary(trip: Trip, plan: Revision): TripSummaryModel {
  const summary = deliverySummary(trip)
  const { packageIdByInstanceId } = expandPackages(plan.request.packages)
  const names = new Map(plan.request.packages.map((pkg) => [pkg.id, pkg.name]))
  const nameOf = (instanceId: string) => names.get(packageIdByInstanceId.get(instanceId) ?? '') ?? ''
  return {
    stopCount: summary.stopCount,
    delivered: summary.delivered,
    startedAt: summary.startedAt,
    completedAt: summary.completedAt,
    issues: summary.issues.map((issue) => ({
      stop: issue.stopNumber,
      kind: issue.kind,
      item: issue.packageInstanceId === undefined ? undefined : { id: issue.packageInstanceId, name: nameOf(issue.packageInstanceId) },
      note: issue.note,
    })),
    stops: summaryStops(trip),
  }
}
