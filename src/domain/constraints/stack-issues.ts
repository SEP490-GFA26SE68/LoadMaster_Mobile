import { gt, roundKg } from '@/domain/geometry'
import type { ConstraintIssue } from './issues'
import { obstacleTopLoadKg, topLoadKg, type StackGraph } from './stack-load'

type StackIssue = ConstraintIssue<'TOP_LOAD_EXCEEDED' | 'NOT_STACKABLE' | 'STACK_COUNT_EXCEEDED'>

/**
 * Số tầng của chồng cao nhất đi qua một kiện: số kiện từ sàn lên tới nó (kể cả nó) theo nhánh đỡ dài nhất, cộng số kiện
 * phía trên nó theo nhánh dài nhất. Vật cản chịu tải không tính là tầng.
 */
function layerCounter(graph: StackGraph): (id: string) => number {
  const fromFloor = new Map<string, number>()
  const onTop = new Map<string, number>()
  const layersFromFloor = (id: string): number => {
    const known = fromFloor.get(id)
    if (known !== undefined) return known
    fromFloor.set(id, 1) // chặn vòng lặp của kiện cao không quá dung sai tiếp xúc
    const layers = 1 + Math.max(0, ...(graph.supports.get(id) ?? []).map((edge) => layersFromFloor(edge.id)))
    fromFloor.set(id, layers)
    return layers
  }
  const layersOnTop = (id: string): number => {
    const known = onTop.get(id)
    if (known !== undefined) return known
    onTop.set(id, 0)
    const layers = Math.max(0, ...[...(graph.supported.get(id) ?? [])].map((upperId) => 1 + layersOnTop(upperId)))
    onTop.set(id, layers)
    return layers
  }
  return (id) => layersFromFloor(id) + layersOnTop(id)
}

/**
 * Spec 7.8 trên đồ thị đỡ (ước tính D-18), theo thứ tự kiện của layout:
 * - tải truyền xuống vượt `maxTopLoadKg` → `TOP_LOAD_EXCEEDED` (so trên số chưa làm tròn, `params.loadKg` làm tròn 0,01 kg).
 *   `maxTopLoadKg = 0` là không chịu chút tải nào — gồm cả ca `fragilityLevel = HIGH` của Spec;
 * - `stackable = false` mà có kiện tựa lên → `NOT_STACKABLE`, `relatedIds` là các kiện đó (sắp theo mã). Schema buộc kiện này
 *   có `maxTopLoadKg = 0`, nên không báo thêm `TOP_LOAD_EXCEEDED` cho cùng một nguyên nhân;
 * - chồng cao nhất đi qua kiện có nhiều tầng hơn `maxStackCount` của chính kiện → `STACK_COUNT_EXCEEDED` (mọi kiện trong chồng
 *   có giới hạn nhỏ hơn đều bị báo); bỏ trống `maxStackCount` là không giới hạn.
 *
 * Sau các kiện, theo thứ tự vật cản của xe: vật cản chịu tải nhận tải vượt `maxTopLoadKg` → `TOP_LOAD_EXCEEDED` với vật cản ở
 * `relatedIds[0]` (quy ước chủ thể của `ConstraintIssue`). Vật cản chịu tải bỏ trống `maxTopLoadKg` là **không giới hạn**,
 * cùng nghĩa với `maxStackCount` bỏ trống.
 */
export function stackIssues(graph: StackGraph): StackIssue[] {
  const issues: StackIssue[] = []
  const layersOf = layerCounter(graph)
  for (const id of graph.layout.placements.keys()) {
    const profile = graph.profiles.get(id)
    if (profile === undefined) throw new Error(`Không có thuộc tính xếp chồng cho placement ${id}`)
    const loadKg = topLoadKg(graph, id)
    if (!profile.stackable) {
      const uppers = [...(graph.supported.get(id) ?? [])].sort()
      if (uppers.length > 0) {
        issues.push({ code: 'NOT_STACKABLE', severity: 'error', packageInstanceId: id, relatedIds: uppers, params: {} })
      }
    } else if (gt(loadKg, profile.maxTopLoadKg)) {
      issues.push({
        code: 'TOP_LOAD_EXCEEDED',
        severity: 'error',
        packageInstanceId: id,
        params: { loadKg: roundKg(loadKg), maxKg: profile.maxTopLoadKg },
      })
    }
    if (profile.maxStackCount !== undefined) {
      const layers = layersOf(id)
      if (layers > profile.maxStackCount) {
        issues.push({
          code: 'STACK_COUNT_EXCEEDED',
          severity: 'error',
          packageInstanceId: id,
          params: { layers, maxStackCount: profile.maxStackCount },
        })
      }
    }
  }
  for (const { id, loadBearing, maxTopLoadKg } of graph.layout.vehicle.obstacles) {
    const loadKg = obstacleTopLoadKg(graph, id)
    if (loadBearing && maxTopLoadKg !== undefined && gt(loadKg, maxTopLoadKg)) {
      issues.push({ code: 'TOP_LOAD_EXCEEDED', severity: 'error', relatedIds: [id], params: { loadKg: roundKg(loadKg), maxKg: maxTopLoadKg } })
    }
  }
  return issues
}
