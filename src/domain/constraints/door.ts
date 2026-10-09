import { effectiveOrientations, gt, orientDimensions } from '@/domain/geometry'
import type { CargoPackage, VehicleConfig } from '@/domain/models'
import type { ConstraintIssue } from './issues'

/**
 * Spec 7.4: kiện phải qua được mặt cắt cửa sau ở ít nhất một hướng dùng được (`effectiveOrientations`):
 * `rộng theo hướng + clearance ≤ doorWidthCm` và `cao theo hướng + clearance ≤ doorHeightCm`, so qua EPSILON.
 * Kiện đi vào theo trục X nên chiều dài không xét. MVP chỉ xét mặt cắt, không xét đường đưa hàng vào.
 *
 * Không kéo theo lỗi của dữ liệu đã sai ở chỗ khác: cửa có cạnh ≤ 0 (validateVehicle báo) hoặc kiện không còn
 * hướng nào (NO_ALLOWED_ORIENTATION) thì không báo DOOR_TOO_SMALL.
 */
export function checkDoorClearance(pkg: CargoPackage, vehicle: VehicleConfig): ConstraintIssue<'DOOR_TOO_SMALL'>[] {
  const { doorWidthCm, doorHeightCm, clearanceCm } = vehicle
  const orientations = effectiveOrientations(pkg)
  if (!gt(doorWidthCm, 0) || !gt(doorHeightCm, 0) || orientations.length === 0) return []
  const passes = orientations.some((code) => {
    const { placedWidthCm, placedHeightCm } = orientDimensions(pkg, code)
    return !gt(placedWidthCm + clearanceCm, doorWidthCm) && !gt(placedHeightCm + clearanceCm, doorHeightCm)
  })
  if (passes) return []
  return [{ code: 'DOOR_TOO_SMALL', severity: 'error', params: { packageId: pkg.id, doorWidthCm, doorHeightCm } }]
}
