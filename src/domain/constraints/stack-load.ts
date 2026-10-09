import { gt, overlapArea2D, type Box } from '@/domain/geometry'
import { obstacleToBox, placementToBox, type CargoPackage } from '@/domain/models'
import { restsOn } from './contact'
import type { PlacementLayout } from './layout'

/** Thuộc tính xếp chồng của một instance; `PackageInstance` của LM-013 thoả kiểu này. */
export type StackingProfile = Pick<CargoPackage, 'weightKg' | 'stackable' | 'maxTopLoadKg' | 'maxStackCount'>

/** Mặt đỡ bên dưới một kiện và diện tích tiếp xúc, cm². */
type SupportEdge = { readonly id: string; readonly areaCm2: number }

/**
 * Đồ thị đỡ của một phương án (D-18): cạnh `trên → dưới` kèm diện tích tiếp xúc, và tải mỗi kiện nhận từ phía trên.
 * **Ước tính của FE** — tải chia theo tỷ lệ diện tích tiếp xúc, không phải mô phỏng vật lý hay solver ổn định.
 */
export type StackGraph = {
  readonly layout: PlacementLayout
  readonly profiles: ReadonlyMap<string, StackingProfile>
  /** kiện → các kiện đỡ nó */
  readonly supports: Map<string, SupportEdge[]>
  /** kiện → các vật cản chịu tải đỡ nó (`id` là mã vật cản); vật cản không chịu tải không nhận tải */
  readonly obstacleSupports: Map<string, SupportEdge[]>
  /** kiện → các kiện tựa lên nó */
  readonly supported: Map<string, Set<string>>
  /** kiện → tải nhận từ phía trên, kg (chưa làm tròn) */
  readonly loadKg: Map<string, number>
  /** vật cản chịu tải → tải nhận từ các kiện tựa lên, kg */
  readonly obstacleLoadKg: Map<string, number>
}

function boxOf(layout: PlacementLayout, id: string): Box {
  const placement = layout.placements.get(id)
  if (placement === undefined) throw new Error(`Không có placement ${id} trong layout`)
  return placementToBox(placement)
}

function profileOf(graph: StackGraph, id: string): StackingProfile {
  const profile = graph.profiles.get(id)
  if (profile === undefined) throw new Error(`Không có thuộc tính xếp chồng cho placement ${id}`)
  return profile
}

/** Nối lại mặt đỡ của `id` theo vị trí hiện tại trong layout, gỡ `id` khỏi các kiện từng đỡ nó. */
function linkSupports(graph: StackGraph, id: string): void {
  for (const edge of graph.supports.get(id) ?? []) graph.supported.get(edge.id)?.delete(id)
  const box = boxOf(graph.layout, id)
  const edges = graph.layout.grid
    .queryBelow(box, { excludeId: id })
    .map((belowId) => ({ id: belowId, areaCm2: overlapArea2D(box, boxOf(graph.layout, belowId)) }))
    .filter(({ areaCm2 }) => gt(areaCm2, 0))
  graph.supports.set(id, edges)
  graph.obstacleSupports.set(
    id,
    graph.layout.vehicle.obstacles
      .filter(({ loadBearing }) => loadBearing)
      .map((obstacle) => ({ id: obstacle.id, box: obstacleToBox(obstacle) }))
      .filter((obstacle) => restsOn(box, obstacle.box))
      .map((obstacle) => ({ id: obstacle.id, areaCm2: overlapArea2D(box, obstacle.box) })),
  )
  for (const edge of edges) {
    const uppers = graph.supported.get(edge.id) ?? new Set<string>()
    uppers.add(id)
    graph.supported.set(edge.id, uppers)
  }
}

function totalAreaCm2(edges: readonly SupportEdge[]): number {
  return edges.reduce((sum, { areaCm2 }) => sum + areaCm2, 0)
}

/** Phần tải kiện `upperId` (trọng lượng + tải nó nhận) truyền xuống một mặt đỡ tiếp xúc `areaCm2`. */
function shareKg(graph: StackGraph, upperId: string, areaCm2: number, upperLoadKg: number): number {
  const supportCm2 = totalAreaCm2(graph.supports.get(upperId) ?? []) + totalAreaCm2(graph.obstacleSupports.get(upperId) ?? [])
  return ((profileOf(graph, upperId).weightKg + upperLoadKg) * areaCm2) / supportCm2
}

function areaOn(edges: readonly SupportEdge[] | undefined, supportId: string): number {
  return edges?.find(({ id }) => id === supportId)?.areaCm2 ?? 0
}

/** Tính lại tải của `targets`; kiện ngoài `targets` giữ tải đã có. Kiện trên được tính trước kiện đỡ nó. */
function recomputeLoads(graph: StackGraph, targets: Iterable<string>): void {
  const pending = new Set(targets)
  const done = new Set<string>()
  const loadOf = (id: string): number => {
    if (!pending.has(id) || done.has(id)) return graph.loadKg.get(id) ?? 0
    done.add(id)
    let loadKg = 0
    for (const upperId of graph.supported.get(id) ?? []) {
      loadKg += shareKg(graph, upperId, areaOn(graph.supports.get(upperId), id), loadOf(upperId))
    }
    graph.loadKg.set(id, loadKg)
    return loadKg
  }
  for (const id of pending) loadOf(id)
}

function recomputeObstacleLoads(graph: StackGraph): void {
  graph.obstacleLoadKg.clear()
  for (const [upperId, edges] of graph.obstacleSupports) {
    for (const { id, areaCm2 } of edges) {
      const loadKg = shareKg(graph, upperId, areaCm2, topLoadKg(graph, upperId))
      graph.obstacleLoadKg.set(id, (graph.obstacleLoadKg.get(id) ?? 0) + loadKg)
    }
  }
}

/** Dựng đồ thị đỡ và tải toàn phương án (Spec 7.8). `profiles` phải có mọi `packageInstanceId` của `layout`. */
export function createStackGraph(layout: PlacementLayout, profiles: ReadonlyMap<string, StackingProfile>): StackGraph {
  const graph: StackGraph = {
    layout,
    profiles,
    supports: new Map(),
    obstacleSupports: new Map(),
    supported: new Map(),
    loadKg: new Map(),
    obstacleLoadKg: new Map(),
  }
  for (const id of layout.placements.keys()) linkSupports(graph, id)
  recomputeLoads(graph, layout.placements.keys())
  recomputeObstacleLoads(graph)
  return graph
}

/** Tải kiện nhận từ mọi kiện phía trên (truyền qua toàn stack), kg. */
export function topLoadKg(graph: StackGraph, id: string): number {
  return graph.loadKg.get(id) ?? 0
}

/** Tải một vật cản chịu tải nhận từ các kiện tựa lên nó, kg; vật cản không chịu tải luôn 0. */
export function obstacleTopLoadKg(graph: StackGraph, obstacleId: string): number {
  return graph.obstacleLoadKg.get(obstacleId) ?? 0
}

/**
 * Tính lại cục bộ sau khi `changedIds` đổi vị trí hoặc hướng (`movePlacement`), cho cùng kết quả với `createStackGraph`
 * dựng lại toàn bộ (LM-023). Chỉ truy vấn lưới cho kiện đã đổi và các kiện tựa lên vị trí cũ hoặc mới của nó; tải chỉ tính
 * lại cho các kiện nằm dưới những kiện đó (mặt đỡ cũ và mới), lần xuống tới sàn.
 */
export function recomputeColumn(graph: StackGraph, changedIds: Iterable<string>): void {
  const relinked = new Set<string>()
  for (const id of changedIds) {
    relinked.add(id)
    for (const upperId of graph.supported.get(id) ?? []) relinked.add(upperId)
    for (const upperId of graph.layout.grid.queryAbove(boxOf(graph.layout, id), { excludeId: id })) relinked.add(upperId)
  }
  const touched = new Set<string>()
  for (const id of relinked) {
    for (const edge of graph.supports.get(id) ?? []) touched.add(edge.id)
    linkSupports(graph, id)
    for (const edge of graph.supports.get(id) ?? []) touched.add(edge.id)
    touched.add(id)
  }
  const below = new Set<string>()
  const pending = [...touched]
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    if (below.has(id)) continue
    below.add(id)
    for (const edge of graph.supports.get(id) ?? []) pending.push(edge.id)
  }
  recomputeLoads(graph, below)
  recomputeObstacleLoads(graph)
}
