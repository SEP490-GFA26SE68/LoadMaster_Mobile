import { expandPackages } from '@/domain/cargo'
import { effectiveOrientations, gt } from '@/domain/geometry'
import type { CargoPackage } from '@/domain/models'
import type { ConstraintIssue } from './issues'

const DIMENSION_FIELDS = ['lengthCm', 'widthCm', 'heightCm'] as const

function packageIssues(pkg: CargoPackage): ConstraintIssue[] {
  const issues: ConstraintIssue[] = DIMENSION_FIELDS.filter((field) => !gt(pkg[field], 0)).map((field) => ({
    code: 'DIMENSION_NOT_POSITIVE',
    severity: 'error',
    field,
    params: { entity: 'package', packageId: pkg.id },
  }))
  if (effectiveOrientations(pkg).length === 0) {
    issues.push({ code: 'NO_ALLOWED_ORIENTATION', severity: 'error', field: 'allowedOrientations', params: { packageId: pkg.id } })
  }
  return issues
}

/**
 * Quy tắc dữ liệu kiện ở mức nghiệp vụ (Spec 6, 7.5, D-33). Lỗi từng kiện mang `field` trong form kiện và
 * `params.packageId`, theo thứ tự kiện:
 * - `DIMENSION_NOT_POSITIVE` (`entity: 'package'`) cho dài, rộng, cao không lớn hơn 0;
 * - `NO_ALLOWED_ORIENTATION` khi `effectiveOrientations` rỗng: danh sách trống, hoặc `keepUpright` loại hết hướng nằm.
 * Sau đó là `DUPLICATE_INSTANCE_ID` của `expandPackages`, giữ nguyên (lỗi của cả request, không có `field`).
 *
 * Quy tắc chưa có mã trong danh mục LM-014 (quantity nguyên ≥ 1, minSupportRatio ∈ [0, 1], stackable ↔ maxTopLoadKg,
 * keepUpright ↔ hướng nằm) do `cargoPackageSchema` chặn tại biên nhập liệu.
 */
export function validatePackages(packages: readonly CargoPackage[]): ConstraintIssue[] {
  return [...packages.flatMap(packageIssues), ...expandPackages(packages).issues]
}
