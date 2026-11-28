/**
 * Kiểu `PlacementWhy` của bản web (`load-plans-backend-api` → `plan-score-dto`). Mobile không chép API tối ưu xếp hàng,
 * chỉ cần kiểu này cho `scene-types.ts` đã đồng bộ từ web.
 */
export const PLACEMENT_REASON_KINDS = ['PINNED', 'MUST_LOAD', 'OUT_OF_ZONE_NO_SPACE', 'BOTTOM_HIGH_CAPACITY', 'HEAVY_LOW'] as const

export type PlacementReason =
  | { readonly kind: (typeof PLACEMENT_REASON_KINDS)[number] }
  | { readonly kind: 'ZONE_STOP'; readonly stop: number }

export type PlacementWhy = {
  readonly reasons: readonly PlacementReason[]
  readonly stack?: { readonly pressureKgM2: number; readonly capacityKgM2?: number | null }
  readonly supportRatio?: number
  readonly distanceToDoorCm?: number
}
