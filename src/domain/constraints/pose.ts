import { orientDimensions, roundCm, type OrientationCode, type PackageDimensions } from '@/domain/geometry'
import type { PackagePlacement } from '@/domain/models'

/** Tư thế một kiện: góc gần gốc (cm) và hướng đặt. Kích thước đã xoay luôn suy ra từ kiện gốc, không nhận từ ngoài. */
export type PlacementPose = {
  readonly xCm: number
  readonly yCm: number
  readonly zCm: number
  readonly orientation: OrientationCode
}

/** Một chỉnh sửa của editor (LM-034) trong draft: tư thế mới của một kiện. */
export type PlacementPatch = PlacementPose & { readonly packageInstanceId: string }

/**
 * Đặt kiện vào tư thế mới — dùng khi editor commit và khi Duyệt áp draft (LM-023, LM-026). Toạ độ qua `roundCm` (biên commit,
 * AGENTS mục 6); kích thước đã xoay lấy từ `orientDimensions` của kiện gốc; các trường khác của placement giữ nguyên.
 * Không kiểm hướng đặt có được phép hay không — việc của constraint engine.
 */
export function applyPose(placement: PackagePlacement, pose: PlacementPose, pkg: PackageDimensions): PackagePlacement {
  return {
    ...placement,
    xCm: roundCm(pose.xCm),
    yCm: roundCm(pose.yCm),
    zCm: roundCm(pose.zCm),
    orientation: pose.orientation,
    ...orientDimensions(pkg, pose.orientation),
  }
}
