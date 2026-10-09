import { gt } from '@/domain/geometry'
import type { VehicleConfig } from '@/domain/models'
import type { ConstraintIssue } from './issues'
import { vehicleObstacleIssues } from './vehicle-obstacles'

/** Số của xe phải > 0 theo Spec 9.2, theo thứ tự form. */
const POSITIVE_FIELDS = ['innerLengthCm', 'innerWidthCm', 'innerHeightCm', 'maxPayloadKg', 'doorWidthCm', 'doorHeightCm'] as const

/** Spec 9.2: cạnh cửa sau so với mặt cắt trong thùng cùng trục. */
const DOOR_SIDES = [
  { axis: 'y', door: 'doorWidthCm', inner: 'innerWidthCm' },
  { axis: 'z', door: 'doorHeightCm', inner: 'innerHeightCm' },
] as const

/**
 * Validation cấu hình xe (Spec 9.2), theo thứ tự form:
 * - `DIMENSION_NOT_POSITIVE` (`entity: 'vehicle'`) cho mỗi số không lớn hơn 0, kể cả `maxPayloadKg`: danh mục LM-014
 *   không có mã riêng cho tải trọng, `field` cho UI biết ô nào và đơn vị nào;
 * - `DOOR_EXCEEDS_INNER` khi cửa rộng hơn (trục y) hoặc cao hơn (trục z) lòng thùng;
 * - lỗi của từng dòng vật cản (`vehicleObstacleIssues`; khác `obstacleIssues` của LM-018 kiểm kiện với vật cản).
 *
 * `field` là đường dẫn trong form xe theo cú pháp react-hook-form (`innerLengthCm`, `obstacles.0.lengthCm`); lỗi của cả
 * dòng vật cản chỉ tới dòng (`obstacles.0`). Không kéo theo lỗi: quy tắc so hai giá trị bỏ qua giá trị đã bị báo không
 * lớn hơn 0, như `abort` của schema LM-010.
 */
export function validateVehicle(vehicle: VehicleConfig): ConstraintIssue[] {
  const issues = POSITIVE_FIELDS.filter((field) => !gt(vehicle[field], 0)).map(
    (field): ConstraintIssue => ({ code: 'DIMENSION_NOT_POSITIVE', severity: 'error', field, params: { entity: 'vehicle' } }),
  )
  for (const { axis, door, inner } of DOOR_SIDES) {
    // Mặt cắt ≤ 0 đã báo DIMENSION_NOT_POSITIVE; không so cửa với nó (như `abort` của schema LM-010)
    if (gt(vehicle[inner], 0) && gt(vehicle[door], vehicle[inner])) {
      issues.push({
        code: 'DOOR_EXCEEDS_INNER',
        severity: 'error',
        field: door,
        params: { axis, doorCm: vehicle[door], innerCm: vehicle[inner] },
      })
    }
  }
  return [...issues, ...vehicleObstacleIssues(vehicle)]
}
