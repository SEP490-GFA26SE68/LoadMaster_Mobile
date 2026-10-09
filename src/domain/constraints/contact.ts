import { CONTACT_TOLERANCE_CM, gt, overlapArea2D, type Box } from '@/domain/geometry'

/**
 * Đáy kiện trên cách mặt trên của vật bên dưới không quá `CONTACT_TOLERANCE_CM`, về cả hai phía — cùng quy ước
 * `queryBelow` của lưới LM-016. So qua EPSILON: 45,2 − 45 = 0,20000000000000284 vẫn là tiếp xúc.
 */
export function touchesTop(bottomCm: number, topCm: number): boolean {
  return !gt(Math.abs(bottomCm - topCm), CONTACT_TOLERANCE_CM)
}

/** Đáy `upper` tựa lên mặt trên `lower`: tiếp xúc theo phương đứng và hai đáy giao nhau thật (chỉ chạm cạnh thì không). */
export function restsOn(upper: Box, lower: Box): boolean {
  return touchesTop(upper.zCm, lower.zCm + lower.heightCm) && gt(overlapArea2D(upper, lower), 0)
}
