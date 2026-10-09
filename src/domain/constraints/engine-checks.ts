import type { PackageInstance } from '@/domain/cargo'
import { effectiveOrientations, gt, lt, matchesOrientation, type Box } from '@/domain/geometry'
import { placementToBox, type PackagePlacement, type VehicleConfig } from '@/domain/models'
import { boundaryIssues } from './boundary'
import type { ConstraintIssue } from './issues'
import type { PlacementLayout } from './layout'
import { lifoIssues, type LifoRules } from './lifo'
import { obstacleIssues } from './obstacles'
import type { StackGraph } from './stack-load'
import { belowMinSupport, supportRatioOver } from './support'

/** Trạng thái dùng chung của engine (LM-023): chỉ mục, đồ thị đỡ và dữ liệu kiện gốc theo `packageInstanceId`. */
export type EngineContext = {
  readonly vehicle: VehicleConfig
  readonly layout: PlacementLayout
  readonly graph: StackGraph
  readonly instances: ReadonlyMap<string, PackageInstance>
  readonly lifo: LifoRules
  /** Vị trí của kiện trong danh sách placement ban đầu: chủ thể `OVERLAP` là kiện đứng sau. */
  readonly rank: ReadonlyMap<string, number>
  readonly obstacleBoxes: ReadonlyMap<string, Box>
}

export function placementOf(ctx: EngineContext, id: string): PackagePlacement {
  const placement = ctx.layout.placements.get(id)
  if (placement === undefined) throw new Error(`Không có placement ${id} trong phương án`)
  return placement
}

export function instanceOf(ctx: EngineContext, id: string): PackageInstance {
  const instance = ctx.instances.get(id)
  if (instance === undefined) throw new Error(`Placement ${id} không thuộc kiện nào của request`)
  return instance
}

/** Spec 7.2: mỗi cặp chồng lấn báo một lần, ở kiện đứng sau; `relatedIds` là các kiện đứng trước bị nó chồng lấn. */
function overlapIssues(placement: PackagePlacement, ctx: EngineContext): ConstraintIssue<'OVERLAP'>[] {
  const id = placement.packageInstanceId
  const own = ctx.rank.get(id) ?? 0
  const earlier = ctx.layout.grid
    .queryAabb(placementToBox(placement), { excludeId: id })
    .filter((other) => (ctx.rank.get(other) ?? 0) < own)
  if (earlier.length === 0) return []
  return [{ code: 'OVERLAP', severity: 'error', packageInstanceId: id, relatedIds: earlier, params: {} }]
}

/** Spec 7.5, PRD mục 8: hướng phải thuộc `effectiveOrientations` của kiện gốc, và kích thước đã xếp phải khớp hướng. */
function orientationIssues(
  placement: PackagePlacement,
  instance: PackageInstance,
): ConstraintIssue<'ORIENTATION_NOT_ALLOWED' | 'ORIENTATION_MISMATCH'>[] {
  const { packageInstanceId, orientation } = placement
  const issues: ConstraintIssue<'ORIENTATION_NOT_ALLOWED' | 'ORIENTATION_MISMATCH'>[] = []
  if (!effectiveOrientations(instance).includes(orientation)) {
    issues.push({ code: 'ORIENTATION_NOT_ALLOWED', severity: 'error', packageInstanceId, params: { orientation } })
  }
  if (!matchesOrientation(placement, instance)) {
    issues.push({ code: 'ORIENTATION_MISMATCH', severity: 'error', packageInstanceId, params: { orientation } })
  }
  return issues
}

/** Tỷ lệ đỡ từ cạnh của đồ thị đỡ (kiện bên dưới, vật cản chịu tải) — không truy vấn lưới lần hai. */
function supportRatioFromGraph(placement: PackagePlacement, ctx: EngineContext): number {
  const id = placement.packageInstanceId
  return supportRatioOver(placement, [
    ...(ctx.graph.supports.get(id) ?? []).map((edge) => placementToBox(placementOf(ctx, edge.id))),
    ...(ctx.graph.obstacleSupports.get(id) ?? []).flatMap((edge) => ctx.obstacleBoxes.get(edge.id) ?? []),
  ])
}

/**
 * Các kiểm tra chỉ phụ thuộc vào một kiện và các kiện quanh nó, theo thứ tự cố định: biên, chồng lấn, vật cản, hướng đặt,
 * tỷ lệ đỡ, LIFO.
 */
export function placementChecks(id: string, ctx: EngineContext): { issues: ConstraintIssue[]; supportRatio: number } {
  const placement = placementOf(ctx, id)
  const instance = instanceOf(ctx, id)
  const supportRatio = supportRatioFromGraph(placement, ctx)
  return {
    supportRatio,
    issues: [
      ...boundaryIssues(placement, ctx.vehicle),
      ...overlapIssues(placement, ctx),
      ...obstacleIssues(placement, ctx.vehicle),
      ...orientationIssues(placement, instance),
      ...belowMinSupport(placement, supportRatio, instance.minSupportRatio),
      ...lifoIssues(placement, ctx.lifo, ctx.layout),
    ],
  }
}

/** Mặt cắt Y–Z hai hộp giao nhau thật (chỉ chạm cạnh thì không). */
function sectionsOverlap(a: Box, b: Box): boolean {
  return lt(a.yCm, b.yCm + b.widthCm) && gt(a.yCm + a.widthCm, b.yCm) && lt(a.zCm, b.zCm + b.heightCm) && gt(a.zCm + a.heightCm, b.zCm)
}

/**
 * Kiện có issue cục bộ đổi khi `id` chiếm hoặc rời hộp hiện tại: chồng lấn với nó, tựa lên nó, hoặc giao sớm hơn và có nó
 * nằm trong hành lang dỡ. Gọi trước và sau khi dời kiện; hành lang quét toàn bộ vì chỉ là vài phép so sánh mỗi kiện.
 */
export function neighboursOf(id: string, ctx: EngineContext): Set<string> {
  const box = placementToBox(placementOf(ctx, id))
  const stop = instanceOf(ctx, id).deliveryStop
  const found = new Set<string>([...ctx.layout.grid.queryAabb(box, { excludeId: id }), ...(ctx.graph.supported.get(id) ?? [])])
  for (const other of ctx.layout.placements.values()) {
    const otherId = other.packageInstanceId
    if (otherId === id || instanceOf(ctx, otherId).deliveryStop >= stop) continue
    const otherBox = placementToBox(other)
    if (!lt(box.xCm, otherBox.xCm + otherBox.lengthCm) && sectionsOverlap(box, otherBox)) found.add(otherId)
  }
  return found
}
