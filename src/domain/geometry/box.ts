import { gt, lt } from './numeric'

/**
 * Hình hộp căn trục trong hệ toạ độ thùng xe (Spec mục 3), đơn vị cm.
 * Chiếm [x, x + length) × [y, y + width) × [z, z + height).
 * Cùng hình dạng với kiện đã xếp (sau khi xoay) và vật cản.
 */
export type Box = {
  xCm: number
  yCm: number
  zCm: number
  lengthCm: number
  widthCm: number
  heightCm: number
}

export function volumeCm3(box: Box): number {
  return box.lengthCm * box.widthCm * box.heightCm
}

/**
 * Spec 7.2: hai hộp chồng lấn khi giao nhau thật sự trên cả ba trục.
 * Giữ nghĩa `<` / `>` của Spec (chạm mặt không phải chồng lấn) nhưng so qua
 * EPSILON để mặt chung bị dấu phẩy động đẩy lệch không thành chồng lấn giả.
 */
export function overlaps(a: Box, b: Box): boolean {
  return (
    lt(a.xCm, b.xCm + b.lengthCm) && gt(a.xCm + a.lengthCm, b.xCm) &&
    lt(a.yCm, b.yCm + b.widthCm) && gt(a.yCm + a.widthCm, b.yCm) &&
    lt(a.zCm, b.zCm + b.heightCm) && gt(a.zCm + a.heightCm, b.zCm)
  )
}
