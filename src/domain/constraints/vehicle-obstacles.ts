import { gt, overlaps, vehicleBoundaryExcess } from '@/domain/geometry'
import { obstacleToBox, type VehicleConfig, type VehicleObstacle } from '@/domain/models'
import type { ConstraintIssue } from './issues'

const SIZE_FIELDS = ['lengthCm', 'widthCm', 'heightCm'] as const

/** Cùng thứ tự với `boundaryIssues` của kiện: trục x, y, z, phía gốc trước. */
const WALLS = [
  ['x', 'xCm'],
  ['y', 'yCm'],
  ['z', 'zCm'],
] as const
const SIDES = ['beforeOrigin', 'beyondInterior'] as const

function sizeIssues(obstacle: VehicleObstacle, row: number): ConstraintIssue[] {
  return SIZE_FIELDS.filter((key) => !gt(obstacle[key], 0)).map(
    (key): ConstraintIssue => ({
      code: 'DIMENSION_NOT_POSITIVE',
      severity: 'error',
      field: `obstacles.${row}.${key}`,
      params: { entity: 'obstacle', obstacleId: obstacle.id },
    }),
  )
}

function outsideIssues(obstacle: VehicleObstacle, row: number, vehicle: VehicleConfig): ConstraintIssue[] {
  const excess = vehicleBoundaryExcess(obstacleToBox(obstacle), vehicle)
  return WALLS.flatMap(([axis, key]) =>
    SIDES.flatMap((side): ConstraintIssue[] => {
      const overCm = excess[side][key]
      if (!gt(overCm, 0)) return []
      return [
        {
          code: 'EXCEEDS_BOUNDARY',
          severity: 'error',
          relatedIds: [obstacle.id],
          field: `obstacles.${row}`,
          params: { axis, side, overCm },
        },
      ]
    }),
  )
}

/** Mỗi cặp chồng lấn báo một lần, ở dòng sau; vật cản mỗi xe chỉ vài cái nên so từng cặp. */
function overlapIssues(obstacle: VehicleObstacle, row: number, earlier: readonly VehicleObstacle[]): ConstraintIssue[] {
  const box = obstacleToBox(obstacle)
  return earlier
    .filter((other) => overlaps(box, obstacleToBox(other)))
    .map(
      (other): ConstraintIssue => ({
        code: 'OBSTACLE_OVERLAP',
        severity: 'error',
        relatedIds: [obstacle.id],
        field: `obstacles.${row}`,
        params: { obstacleId: other.id },
      }),
    )
}

function hasSize(obstacle: VehicleObstacle): boolean {
  return SIZE_FIELDS.every((key) => gt(obstacle[key], 0))
}

/**
 * Spec 9.2: vật cản có kích thước lớn hơn 0, nằm trong lòng thùng, không chồng lấn nhau. Issue theo từng dòng vật cản,
 * không có `packageInstanceId`:
 * - `DIMENSION_NOT_POSITIVE` tại ô (`obstacles.<i>.lengthCm`), `params.obstacleId` là vật cản của dòng;
 * - `EXCEEDS_BOUNDARY` tại dòng (`obstacles.<i>`), một issue cho mỗi vách bị vượt; `relatedIds` = [vật cản của dòng];
 * - `OBSTACLE_OVERLAP` tại dòng sau của cặp; `relatedIds` = [vật cản của dòng], `params.obstacleId` = vật cản dòng trước
 *   bị chồng lấn — cùng nghĩa với kiện chồng vật cản (LM-018): `obstacleId` luôn là vật cản bị chồng lấn.
 */
export function vehicleObstacleIssues(vehicle: VehicleConfig): ConstraintIssue[] {
  // Lòng thùng có cạnh ≤ 0 đã báo DIMENSION_NOT_POSITIVE; không đo vật cản với nó
  const interiorValid = gt(vehicle.innerLengthCm, 0) && gt(vehicle.innerWidthCm, 0) && gt(vehicle.innerHeightCm, 0)
  return vehicle.obstacles.flatMap((obstacle, row) => [
    ...sizeIssues(obstacle, row),
    ...(interiorValid ? outsideIssues(obstacle, row, vehicle) : []),
    // Hộp rỗng hoặc âm vẫn "chồng lấn" theo công thức Spec 7.2; vật cản chưa có kích thước hợp lệ không so cặp
    ...(hasSize(obstacle) ? overlapIssues(obstacle, row, vehicle.obstacles.slice(0, row).filter(hasSize)) : []),
  ])
}
