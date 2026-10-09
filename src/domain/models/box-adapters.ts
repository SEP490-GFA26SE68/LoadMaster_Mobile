import type { Box } from '@/domain/geometry'
import type { PackagePlacement } from './optimization'
import type { VehicleObstacle } from './vehicle'

/** Kiện đã xếp chiếm hộp theo kích thước sau khi xoay (`placed*Cm`), không phải kích thước danh nghĩa. */
export function placementToBox(placement: PackagePlacement): Box {
  const { xCm, yCm, zCm, placedLengthCm, placedWidthCm, placedHeightCm } = placement
  return { xCm, yCm, zCm, lengthCm: placedLengthCm, widthCm: placedWidthCm, heightCm: placedHeightCm }
}

/** Vật cản chiếm đúng hộp của nó trong hệ toạ độ thùng (Spec mục 3). */
export function obstacleToBox(obstacle: VehicleObstacle): Box {
  const { xCm, yCm, zCm, lengthCm, widthCm, heightCm } = obstacle
  return { xCm, yCm, zCm, lengthCm, widthCm, heightCm }
}
