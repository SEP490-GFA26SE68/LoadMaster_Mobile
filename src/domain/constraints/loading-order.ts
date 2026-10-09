import { eq } from '@/domain/geometry'
import type { PackagePlacement } from '@/domain/models'
import type { ConstraintIssue } from './issues'
import type { StackGraph } from './stack-load'

/** Thứ tự xếp/dỡ tính lại ở FE (D-32), 1-based theo `packageInstanceId`. UI gắn nhãn khi `recomputedOnFrontend`. */
export type RecomputedOrders = {
  readonly recomputedOnFrontend: true
  readonly orders: ReadonlyMap<string, { readonly loadingOrder: number; readonly unloadingOrder: number }>
}

/**
 * Sắp xếp topo có ưu tiên (Kahn): mỗi bước lấy kiện đứng đầu `ranked` trong số kiện không còn kiện chặn chưa lấy.
 * `ranked` là mọi kiện đã sắp theo ưu tiên, nên kết quả tất định. `dependentsOf` là chiều ngược của `blockersOf`.
 */
function priorityTopologicalOrder(
  ranked: readonly string[],
  blockersOf: (id: string) => Iterable<string>,
  dependentsOf: (id: string) => Iterable<string>,
): string[] {
  const rank = new Map(ranked.map((id, index) => [id, index]))
  const waiting = ranked.map((id) => [...blockersOf(id)].length)
  const taken = ranked.map(() => false)
  const order: string[] = []
  let firstOpen = 0
  while (order.length < ranked.length) {
    while (taken[firstOpen]) firstOpen += 1
    let next = firstOpen
    while (next < ranked.length && (taken[next] || waiting[next] !== 0)) next += 1
    const id = ranked[next]
    if (id === undefined) throw new Error('Đồ thị đỡ có chu trình: không sắp được thứ tự')
    taken[next] = true
    order.push(id)
    for (const dependent of dependentsOf(id)) {
      const index = rank.get(dependent)
      if (index !== undefined) waiting[index] = (waiting[index] ?? 0) - 1
    }
  }
  return order
}

function placementOf(graph: StackGraph, id: string): PackagePlacement {
  const placement = graph.layout.placements.get(id)
  if (placement === undefined) throw new Error(`Không có placement ${id} trong layout`)
  return placement
}

/**
 * D-32: kiện phải được xếp sau mọi kiện đỡ nó. Kiện có kiện đỡ mang `loadingOrder` không nhỏ hơn của nó →
 * `LOADING_ORDER_INFEASIBLE` (cảnh báo; editor giữ thứ tự gốc), `relatedIds` là các kiện đỡ đó, sắp theo mã.
 */
export function loadingOrderIssues(graph: StackGraph): ConstraintIssue<'LOADING_ORDER_INFEASIBLE'>[] {
  return [...graph.layout.placements.values()].flatMap((placement) => {
    const late = (graph.supports.get(placement.packageInstanceId) ?? [])
      .map(({ id }) => placementOf(graph, id))
      .filter((support) => support.loadingOrder >= placement.loadingOrder)
      .map(({ packageInstanceId }) => packageInstanceId)
      .sort()
    if (late.length === 0) return []
    return [
      {
        code: 'LOADING_ORDER_INFEASIBLE',
        severity: 'warning',
        packageInstanceId: placement.packageInstanceId,
        relatedIds: late,
        params: {},
      },
    ]
  })
}

function stopOf(deliveryStops: ReadonlyMap<string, number>, id: string): number {
  const stop = deliveryStops.get(id)
  if (stop === undefined) throw new Error(`Không có điểm giao cho placement ${id}`)
  return stop
}

/** So toạ độ để sắp xếp: lệch trong EPSILON coi là bằng nhau, để tiêu chí sau quyết định. */
function compareCm(a: number, b: number): number {
  return eq(a, b) ? 0 : a - b
}

function compareIds(a: PackagePlacement, b: PackagePlacement): number {
  if (a.packageInstanceId === b.packageInstanceId) return 0
  return a.packageInstanceId < b.packageInstanceId ? -1 : 1
}

/**
 * D-32, khi Duyệt: tính lại thứ tự xếp và dỡ từ quan hệ đỡ, tất định (cùng input cho cùng thứ tự).
 * - `loadingOrder`: sắp xếp topo, kiện đỡ trước kiện trên; trong các kiện sẵn sàng ưu tiên `deliveryStop` lớn hơn, rồi `x` nhỏ
 *   hơn (sâu hơn), rồi `z` nhỏ hơn, rồi mã kiện.
 * - `unloadingOrder`: chỉ dỡ kiện không còn kiện nào tựa lên; trong các kiện sẵn sàng ưu tiên `deliveryStop` nhỏ hơn, rồi `x`
 *   lớn hơn (gần cửa), rồi `z` lớn hơn (cao hơn), rồi mã kiện.
 */
export function recomputeOrders(graph: StackGraph, deliveryStops: ReadonlyMap<string, number>): RecomputedOrders {
  const placements = [...graph.layout.placements.values()]
  const stop = (placement: PackagePlacement) => stopOf(deliveryStops, placement.packageInstanceId)
  const idsOf = (sorted: PackagePlacement[]) => sorted.map(({ packageInstanceId }) => packageInstanceId)
  const supportsOf = (id: string) => (graph.supports.get(id) ?? []).map((edge) => edge.id)
  const uppersOf = (id: string) => graph.supported.get(id) ?? []
  const loading = priorityTopologicalOrder(
    idsOf(placements.toSorted((a, b) => stop(b) - stop(a) || compareCm(a.xCm, b.xCm) || compareCm(a.zCm, b.zCm) || compareIds(a, b))),
    supportsOf,
    uppersOf,
  )
  const unloading = priorityTopologicalOrder(
    idsOf(placements.toSorted((a, b) => stop(a) - stop(b) || compareCm(b.xCm, a.xCm) || compareCm(b.zCm, a.zCm) || compareIds(a, b))),
    uppersOf,
    supportsOf,
  )
  const unloadingIndex = new Map(unloading.map((id, index) => [id, index + 1]))
  return {
    recomputedOnFrontend: true,
    orders: new Map(loading.map((id, index) => [id, { loadingOrder: index + 1, unloadingOrder: unloadingIndex.get(id) ?? 0 }])),
  }
}
