import { coveredArea, gt, lt, type Box, type Rect } from '@/domain/geometry'
import { placementToBox, type PackagePlacement } from '@/domain/models'
import type { ConstraintIssue } from './issues'
import type { PlacementLayout } from './layout'

type LifoIssue = ConstraintIssue<'LIFO_BLOCKED' | 'LIFO_PARTIAL'>

/** Dữ liệu kiểm LIFO không nằm trong placement. */
export type LifoRules = {
  /**
   * Điểm giao theo `packageInstanceId`: placement không mang `deliveryStop`, lấy từ instance của `expandPackages`.
   * Kiện được kiểm hoặc kiện chắn vắng mặt trong bảng → `throw`: bỏ qua sẽ giấu vi phạm LIFO khỏi bước chặn Duyệt.
   */
  readonly deliveryStopByInstanceId: ReadonlyMap<string, number>
  /** `settings.enforceLifo` của request (D-13). */
  readonly enforceLifo: boolean
}

/** Mặt cắt ngang của hộp, nhìn từ cửa sau: u = Y, v = Z. */
function section(box: Box): Rect {
  return { u1: box.yCm, u2: box.yCm + box.widthCm, v1: box.zCm, v2: box.zCm + box.heightCm }
}

/**
 * Spec 7.11, D-26: mặt sau kiện A bị các kiện giao **muộn hơn** (điểm giao lớn hơn) nằm giữa A và cửa sau che.
 * Kiện chắn lấy từ `queryRearCorridor` của lưới — bắt đầu từ mặt sau A trở ra cửa (`x ≥ x_A + dài_A`, có EPSILON) và
 * mặt cắt Y–Z giao thật với A. Kiện cùng điểm giao hoặc giao sớm hơn không bao giờ chắn.
 *
 * `coverage` = diện tích hợp mặt cắt các kiện chắn (cắt theo mặt sau A) ÷ rộng × cao đã xếp của A:
 * - bằng 1 trong EPSILON → `LIFO_BLOCKED`, `params.coverage` đúng bằng 1; `error` khi `enforceLifo`, `warning` khi không;
 * - lớn hơn 0 → `LIFO_PARTIAL` (`warning`), `params.coverage` là tỷ lệ tính được;
 * - bằng 0 → không có issue.
 *
 * `relatedIds`: kiện chắn theo thứ tự thêm vào lưới — thứ tự `placements` truyền cho `createPlacementLayout`, không theo
 * khoảng cách tới A. `placement` có thể là vị trí thử của một kiện đã có trong `layout` (editor): vị trí cũ của nó bị bỏ qua.
 */
export function lifoIssues(placement: PackagePlacement, rules: LifoRules, layout: PlacementLayout): LifoIssue[] {
  const { packageInstanceId } = placement
  const stopOf = (id: string): number => {
    const stop = rules.deliveryStopByInstanceId.get(id)
    if (stop === undefined) throw new Error(`Không có điểm giao cho placement ${id}`)
    return stop
  }
  const stop = stopOf(packageInstanceId)
  const box = placementToBox(placement)
  // Điểm giao là số nguyên từ 1 (schema), không phải toạ độ: so trực tiếp
  const blockerIds = layout.grid.queryRearCorridor(box, { excludeId: packageInstanceId }).filter((id) => stopOf(id) > stop)
  const covers = blockerIds.map((id) => section(placementToBox(layout.placements.get(id)!)))
  // Hợp đã cắt theo mặt sau nên không vượt mặt sau quá nhiễu dấu phẩy động; 1.0000000000000002 vẫn là che kín
  const coverage = coveredArea(section(box), covers) / (box.widthCm * box.heightCm)
  if (!lt(coverage, 1)) {
    const severity = rules.enforceLifo ? 'error' : 'warning'
    return [{ code: 'LIFO_BLOCKED', severity, packageInstanceId, relatedIds: blockerIds, params: { coverage: 1 } }]
  }
  if (gt(coverage, 0)) {
    return [{ code: 'LIFO_PARTIAL', severity: 'warning', packageInstanceId, relatedIds: blockerIds, params: { coverage } }]
  }
  return []
}
