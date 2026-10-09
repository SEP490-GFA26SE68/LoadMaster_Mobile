import { gt, vehicleBoundaryExcess, type VehicleInterior } from '@/domain/geometry'
import { placementToBox, type PackagePlacement } from '@/domain/models'
import type { ConstraintIssue } from './issues'

const SIDES = ['beforeOrigin', 'beyondInterior'] as const
const AXES = [
  ['x', 'xCm'],
  ['y', 'yCm'],
  ['z', 'zCm'],
] as const

export function boundaryIssues(placement: PackagePlacement, vehicle: VehicleInterior): ConstraintIssue[] {
  const excess = vehicleBoundaryExcess(placementToBox(placement), vehicle)
  return AXES.flatMap(([axis, key]) =>
    SIDES.flatMap((side): ConstraintIssue[] => {
      const overCm = excess[side][key]
      if (!gt(overCm, 0)) return []
      return [
        {
          code: 'EXCEEDS_BOUNDARY',
          severity: 'error',
          packageInstanceId: placement.packageInstanceId,
          params: { axis, side, overCm },
        },
      ]
    }),
  )
}
