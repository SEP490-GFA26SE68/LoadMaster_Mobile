import { overlaps } from '@/domain/geometry'
import { obstacleToBox, placementToBox, type PackagePlacement, type VehicleConfig } from '@/domain/models'
import { restsOn } from './contact'
import type { ConstraintIssue } from './issues'

type ObstacleIssue = ConstraintIssue<'OBSTACLE_OVERLAP' | 'NON_BEARING_SUPPORT'>

/**
 * Spec 7.6, theo thứ tự vật cản của xe:
 * - kiện chồng lấn vật cản → `OBSTACLE_OVERLAP`;
 * - đáy kiện tựa lên mặt trên vật cản `loadBearing = false` (trong `CONTACT_TOLERANCE_CM`) → `NON_BEARING_SUPPORT`.
 *   Vật cản chịu tải là mặt đỡ hợp lệ (tính trong `supportRatio`).
 */
export function obstacleIssues(placement: PackagePlacement, vehicle: Pick<VehicleConfig, 'obstacles'>): ObstacleIssue[] {
  const box = placementToBox(placement)
  return vehicle.obstacles.flatMap((obstacle) => {
    const obstacleBox = obstacleToBox(obstacle)
    const codes: ObstacleIssue['code'][] = []
    if (overlaps(box, obstacleBox)) codes.push('OBSTACLE_OVERLAP')
    if (!obstacle.loadBearing && restsOn(box, obstacleBox)) codes.push('NON_BEARING_SUPPORT')
    return codes.map((code): ObstacleIssue => ({
      code,
      severity: 'error',
      packageInstanceId: placement.packageInstanceId,
      params: { obstacleId: obstacle.id },
    }))
  })
}
