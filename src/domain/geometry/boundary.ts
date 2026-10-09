import type { Box } from './box'
import { roundCm } from './numeric'

/** Kích thước lòng thùng, cùng tên trường với `VehicleConfig` của Spec. */
export type VehicleInterior = {
  innerLengthCm: number
  innerWidthCm: number
  innerHeightCm: number
}

export type AxisAmountCm = { xCm: number; yCm: number; zCm: number }

export type BoundaryExcess = {
  /** Phần hộp nằm trước gốc: X qua vách trước, Y qua vách trái, Z dưới sàn. */
  beforeOrigin: AxisAmountCm
  /** Phần hộp nằm vượt mặt trong thùng: X qua cửa sau, Y qua vách phải, Z qua trần. */
  beyondInterior: AxisAmountCm
}

function beyond(end: number, limit: number): number {
  return Math.max(0, roundCm(end - limit))
}

function before(start: number): number {
  return Math.max(0, roundCm(-start))
}

/** Spec 7.1: lượng vượt biên thùng theo từng trục, 0 khi nằm trong. Số thô để lớp lỗi tự diễn đạt. */
export function vehicleBoundaryExcess(box: Box, vehicle: VehicleInterior): BoundaryExcess {
  return {
    beforeOrigin: { xCm: before(box.xCm), yCm: before(box.yCm), zCm: before(box.zCm) },
    beyondInterior: {
      xCm: beyond(box.xCm + box.lengthCm, vehicle.innerLengthCm),
      yCm: beyond(box.yCm + box.widthCm, vehicle.innerWidthCm),
      zCm: beyond(box.zCm + box.heightCm, vehicle.innerHeightCm),
    },
  }
}
