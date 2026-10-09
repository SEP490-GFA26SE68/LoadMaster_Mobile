import { createSpatialGrid, type SpatialGrid } from '@/domain/geometry'
import { placementToBox, type PackagePlacement, type VehicleConfig } from '@/domain/models'

/** Phương án đang kiểm: vật cản của xe và mọi kiện đã xếp, tra theo `packageInstanceId`. */
export type PlacementLayout = {
  readonly vehicle: Pick<VehicleConfig, 'obstacles'>
  /** Chỉ sửa qua `movePlacement`, để lưới luôn chứa đúng các hộp này. */
  readonly placements: Map<string, PackagePlacement>
  /** Lưới LM-016 chứa đúng `placements`, ID là `packageInstanceId`: tìm ứng viên không quét toàn bộ. */
  readonly grid: SpatialGrid
}

/** Dựng chỉ mục một lần cho mỗi snapshot phương án (D-29). */
export function createPlacementLayout(
  vehicle: Pick<VehicleConfig, 'obstacles'>,
  placements: readonly PackagePlacement[],
): PlacementLayout {
  return {
    vehicle,
    placements: new Map(placements.map((placement) => [placement.packageInstanceId, placement])),
    grid: createSpatialGrid(placements.map((placement) => ({ id: placement.packageInstanceId, box: placementToBox(placement) }))),
  }
}

/**
 * Editor (LM-035): đổi vị trí hoặc hướng của một kiện đã có trong layout, Map và lưới đổi cùng lúc. Thứ tự kiện giữ nguyên.
 * Đồ thị đỡ dựng trên layout này phải gọi `recomputeColumn` với kiện đó ngay sau.
 */
export function movePlacement(layout: PlacementLayout, placement: PackagePlacement): void {
  const id = placement.packageInstanceId
  if (!layout.placements.has(id)) throw new Error(`Không có placement ${id} trong layout`)
  layout.placements.set(id, placement)
  layout.grid.update(id, placementToBox(placement))
}
