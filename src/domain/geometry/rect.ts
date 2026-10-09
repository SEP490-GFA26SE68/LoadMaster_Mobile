import { gt, lt } from './numeric'

/**
 * Hình chữ nhật căn trục trên một mặt phẳng toạ độ, chiếm [u1, u2) × [v1, v2), cm.
 * Hai trục tuỳ hình chiếu người gọi chọn: đáy hộp trên mặt sàn là u = X, v = Y; mặt cắt ngang là u = Y, v = Z.
 */
export type Rect = { u1: number; u2: number; v1: number; v2: number }

/** Phần chung của hai hình; `null` khi không giao nhau thật (chỉ chạm cạnh, kể cả cạnh bị dấu phẩy động đẩy lệch). */
function clip(target: Rect, cover: Rect): Rect | null {
  const u1 = Math.max(target.u1, cover.u1)
  const u2 = Math.min(target.u2, cover.u2)
  const v1 = Math.max(target.v1, cover.v1)
  const v2 = Math.min(target.v2, cover.v2)
  return gt(u2, u1) && gt(v2, v1) ? { u1, u2, v1, v2 } : null
}

/** Độ dài hợp các đoạn v của những hình phủ dải u [left, right). */
function coveredLength(rects: readonly Rect[], left: number, right: number): number {
  const spans = rects.filter(({ u1, u2 }) => lt(u1, right) && gt(u2, left)).sort((a, b) => a.v1 - b.v1)
  let covered = 0
  let end = -Infinity
  for (const { v1, v2 } of spans) {
    covered += Math.max(0, v2 - Math.max(end, v1))
    end = Math.max(end, v2)
  }
  return covered
}

/**
 * Diện tích phần `target` bị hợp các hình `covers` phủ, cm²: phần nằm ngoài `target` bị cắt bỏ, phần các hình phủ chồng
 * lên nhau chỉ tính một lần. Quét theo các mép u, mỗi dải nhân bề rộng với độ dài hợp theo v. Hình chỉ chạm cạnh `target`
 * không phủ gì; dải hẹp hơn EPSILON (mép trôi dấu phẩy động) cũng không.
 */
export function coveredArea(target: Rect, covers: readonly Rect[]): number {
  const rects = covers.flatMap((cover) => clip(target, cover) ?? [])
  const edges = [...new Set(rects.flatMap(({ u1, u2 }) => [u1, u2]))].sort((a, b) => a - b)
  let area = 0
  edges.forEach((right, index) => {
    const left = edges[index - 1]
    if (left !== undefined) area += (right - left) * coveredLength(rects, left, right)
  })
  return area
}
