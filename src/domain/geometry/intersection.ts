import type { Box } from './box'
import { gt } from './numeric'

/**
 * Độ dài phần giao của hai đoạn [start, start + size) trên một trục, cm.
 * Chỉ chạm mút (kể cả mút bị dấu phẩy động đẩy lệch) thì bằng 0, cùng nghĩa với `overlaps` (Spec 7.2).
 */
function sharedSpan(startA: number, sizeA: number, startB: number, sizeB: number): number {
  const span = Math.min(startA + sizeA, startB + sizeB) - Math.max(startA, startB)
  return gt(span, 0) ? span : 0
}

/** Diện tích phần giao của đáy hai hộp trên mặt sàn X–Y, cm². */
export function overlapArea2D(a: Box, b: Box): number {
  return sharedSpan(a.xCm, a.lengthCm, b.xCm, b.lengthCm) * sharedSpan(a.yCm, a.widthCm, b.yCm, b.widthCm)
}

/** Thể tích phần giao của hai hộp, cm³. */
export function overlapVolume(a: Box, b: Box): number {
  return overlapArea2D(a, b) * sharedSpan(a.zCm, a.heightCm, b.zCm, b.heightCm)
}
