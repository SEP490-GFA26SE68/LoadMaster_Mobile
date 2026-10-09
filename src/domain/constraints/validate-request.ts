import type { OptimizationRequest } from '@/domain/models'
import { checkDoorClearance } from './door'
import type { ConstraintIssue, ConstraintSeverity } from './issues'
import { checkPayload } from './payload'
import { validatePackages } from './validate-packages'
import { validateVehicle } from './validate-vehicle'

/** Thứ tự hiện trong validation summary: lỗi chặn trước, cảnh báo sau. */
const SEVERITY_RANK: Record<ConstraintSeverity, number> = { error: 0, blockApproval: 1, warning: 2 }

/**
 * Validation summary của Thiết lập tối ưu (Spec 9.4), chạy trước khi gọi service: xe, kiện, qua cửa từng kiện,
 * tải trọng. Nút Tối ưu chỉ bị chặn bởi `severity = 'error'` (D-23).
 *
 * Tất định: sắp theo mức (error → blockApproval → warning); cùng mức giữ thứ tự nhóm xe, kiện, cửa, tải trọng
 * và thứ tự trong từng nhóm (sort của JS ổn định).
 */
export function validateRequest(request: OptimizationRequest): ConstraintIssue[] {
  const { vehicle, packages } = request
  return [
    ...validateVehicle(vehicle),
    ...validatePackages(packages),
    ...packages.flatMap((pkg) => checkDoorClearance(pkg, vehicle)),
    ...checkPayload(packages, vehicle),
  ].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}
