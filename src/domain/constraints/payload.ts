import { gt, roundKg } from '@/domain/geometry'
import type { CargoPackage, VehicleConfig } from '@/domain/models'
import type { ConstraintIssue } from './issues'

/** Spec 7.3: tổng `weightKg × quantity`, làm tròn 0,01 kg một lần ở đây để số so sánh đúng bằng số báo ra. */
function totalWeightKg(packages: readonly CargoPackage[]): number {
  return roundKg(packages.reduce((sum, { weightKg, quantity }) => sum + weightKg * quantity, 0))
}

function payloadParams(totalKg: number, maxPayloadKg: number) {
  return { totalKg, maxPayloadKg, overKg: roundKg(totalKg - maxPayloadKg) }
}

/**
 * Spec 7.3, D-23: tổng mọi kiện vượt `maxPayloadKg` là cảnh báo `PAYLOAD_EXCEEDED` (vẫn cho tối ưu); riêng tổng kiện
 * `mustLoad` vượt là lỗi `MUST_LOAD_PAYLOAD_EXCEEDED` (chặn tối ưu). Hai điều kiện độc lập: kiện `mustLoad` đã vượt thì
 * tổng chung cũng vượt, nên có cả hai issue, mỗi issue mang tổng của nó. `totalKg`, `overKg` làm tròn 0,01 kg.
 */
export function checkPayload(packages: readonly CargoPackage[], vehicle: VehicleConfig): ConstraintIssue[] {
  const { maxPayloadKg } = vehicle
  // Tải trọng ≤ 0 là lỗi nhập của xe (DIMENSION_NOT_POSITIVE ở validateVehicle), không kéo theo lỗi tải
  if (!gt(maxPayloadKg, 0)) return []
  const issues: ConstraintIssue[] = []
  const totalKg = totalWeightKg(packages)
  if (gt(totalKg, maxPayloadKg)) {
    issues.push({ code: 'PAYLOAD_EXCEEDED', severity: 'warning', params: payloadParams(totalKg, maxPayloadKg) })
  }
  const mustLoadKg = totalWeightKg(packages.filter(({ mustLoad }) => mustLoad))
  if (gt(mustLoadKg, maxPayloadKg)) {
    issues.push({ code: 'MUST_LOAD_PAYLOAD_EXCEEDED', severity: 'error', params: payloadParams(mustLoadKg, maxPayloadKg) })
  }
  return issues
}
