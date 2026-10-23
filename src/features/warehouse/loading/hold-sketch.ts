import type { VehicleConfig } from '@/domain/models'
import type { ScenePlacement } from '@/features/viewer3d/scene-input'

/*
 * Sơ đồ lòng thùng nhìn từ trên xuống của bước Xếp — bản điện thoại thay khung 3D của web (app chưa có Three.js). Hình đúng tỉ lệ
 * cm của phương án, vẽ thẳng vào `viewBox` cm: vách trước ở mép trái (X = 0), cửa sau ở mép phải (X = dài thùng), vách trái (Y = 0) ở
 * mép dưới — như đứng trên nóc thùng nhìn xuống, đầu xe quay sang trái. Chỉ minh hoạ điều thẻ hướng dẫn đã nói bằng chữ.
 */

/** Một hình chữ nhật của sơ đồ, toạ độ SVG theo cm: `x` tính từ vách trước, `y` từ mép trên (vách phải). */
export type SketchRect = { readonly id: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number }

export type SketchShapes = {
  readonly lengthCm: number
  readonly widthCm: number
  readonly obstacles: readonly SketchRect[]
  /** Kiện đã lên xe, thấp trước cao sau: kiện chồng lên vẽ đè kiện bên dưới. Kiện hỏng bị bỏ lại kho không có ở đây. */
  readonly loaded: readonly SketchRect[]
  /** Kiện của bước đang hỏi, vẽ sau cùng; vắng khi không có kiện đó trong phương án. */
  readonly current: SketchRect | undefined
}

type Footprint = Pick<ScenePlacement, 'id' | 'position' | 'lengthCm' | 'widthCm'>

/**
 * Hình của sơ đồ từ phương án (kích thước đã xoay theo hướng đặt) và tiến độ xếp: `loadedIds` là kiện kho đã ghi "đã xếp",
 * `currentId` là kiện đang hỏi. Hàm thuần — màn dựng lại khi chuyến được đọc lại, không làm gì theo từng khung hình.
 */
export function holdSketch(
  vehicle: Pick<VehicleConfig, 'innerLengthCm' | 'innerWidthCm' | 'obstacles'>,
  placements: readonly Footprint[],
  loadedIds: ReadonlySet<string>,
  currentId: string | undefined,
): SketchShapes {
  const widthCm = vehicle.innerWidthCm
  // Trục Y của SVG đi xuống: mép xa vách trái của hộp nằm ở trên
  const rect = (id: string, x: number, y: number, length: number, width: number): SketchRect => ({
    id,
    x,
    y: widthCm - (y + width),
    width: length,
    height: width,
  })
  const ofPlacement = (p: Footprint) => rect(p.id, p.position.x, p.position.y, p.lengthCm, p.widthCm)
  const current = placements.find((p) => p.id === currentId)
  return {
    lengthCm: vehicle.innerLengthCm,
    widthCm,
    obstacles: vehicle.obstacles.map((o) => rect(o.id, o.xCm, o.yCm, o.lengthCm, o.widthCm)),
    loaded: placements
      .filter((p) => p.id !== currentId && loadedIds.has(p.id))
      .toSorted((a, b) => a.position.z - b.position.z)
      .map(ofPlacement),
    current: current === undefined ? undefined : ofPlacement(current),
  }
}
