import { overlaps, type Box } from './box'
import { EPSILON, gt, lt } from './numeric'

export type SpatialEntry = { id: string; box: Box }

export type SpatialQueryOptions = {
  /** Bỏ qua hộp có ID này — khi kiểm một hộp đã nằm trong lưới với các hộp còn lại. */
  excludeId?: string
}

export type SpatialGrid = {
  /** ID các hộp chồng lấn thật sự với `query` (Spec 7.2), theo thứ tự thêm vào. */
  queryAabb(query: Box, options?: SpatialQueryOptions): string[]
  /** ID các hộp có mặt trên chạm đáy `query` trong `CONTACT_TOLERANCE_CM` và đáy giao nhau thật trên X–Y. */
  queryBelow(query: Box, options?: SpatialQueryOptions): string[]
  /** ID các hộp có đáy chạm mặt trên `query` trong `CONTACT_TOLERANCE_CM` và đáy giao nhau thật trên X–Y. */
  queryAbove(query: Box, options?: SpatialQueryOptions): string[]
  /**
   * ID các hộp nằm hẳn phía cửa sau (+X) tính từ mặt sau `query` và có mặt cắt Y–Z giao nhau thật
   * với `query` — những hộp có thể chắn đường dỡ thẳng ra cửa. Chỉ chạm cạnh bên/trên thì không tính.
   */
  queryRearCorridor(query: Box, options?: SpatialQueryOptions): string[]
  /** Đặt lại hộp của một ID (thêm mới nếu chưa có). Dùng khi editor commit một lần kéo/xoay. */
  update(id: string, box: Box): void
  /** Gỡ hộp khỏi mọi truy vấn. ID lạ thì không làm gì. */
  remove(id: string): void
}

/** Cạnh ô lưới mặc định theo X và Y, cm. Đủ nhỏ so với thùng 600 × 240 cm, đủ lớn so với kiện thường gặp. */
export const DEFAULT_GRID_CELL_CM = 50

/** Khe hở tối đa giữa hai mặt vẫn coi là tiếp xúc (đỡ nhau), cm — bằng 2 mm của editor trước đây. */
export const CONTACT_TOLERANCE_CM = 0.2

/** Đáy hai hộp giao nhau thật trên X–Y; chỉ chạm cạnh thì không. */
function footprintsOverlap(a: Box, b: Box): boolean {
  return (
    lt(a.xCm, b.xCm + b.lengthCm) && gt(a.xCm + a.lengthCm, b.xCm) &&
    lt(a.yCm, b.yCm + b.widthCm) && gt(a.yCm + a.widthCm, b.yCm)
  )
}

/** Mặt cắt Y–Z hai hộp giao nhau thật; chỉ chạm cạnh thì không. */
function sectionsOverlap(a: Box, b: Box): boolean {
  return (
    lt(a.yCm, b.yCm + b.widthCm) && gt(a.yCm + a.widthCm, b.yCm) &&
    lt(a.zCm, b.zCm + b.heightCm) && gt(a.zCm + a.heightCm, b.zCm)
  )
}

function touchesVertically(lowerTop: number, upperBottom: number): boolean {
  return Math.abs(upperBottom - lowerTop) <= CONTACT_TOLERANCE_CM + EPSILON
}

/**
 * Lưới đều trên mặt sàn X–Y: mỗi hộp đăng ký vào mọi ô mà đáy của nó phủ lên.
 * Truy vấn chỉ xét hộp trong các ô liên quan rồi lọc chính xác, không quét toàn bộ.
 */
export function createSpatialGrid(entries: readonly SpatialEntry[], cellCm = DEFAULT_GRID_CELL_CM): SpatialGrid {
  const boxes = new Map<string, Box>()
  const order = new Map<string, number>()
  const cells = new Map<string, Set<string>>()
  /** Mặt xa nhất về phía cửa trong số các hộp đã thêm: giới hạn vùng ô của hành lang dỡ. */
  let farthestEndXCm = -Infinity
  /** Chỉ tăng: gỡ rồi thêm hộp khác không làm trùng thứ tự với hộp đang có. */
  let nextOrder = 0

  function cellRange(start: number, size: number): [number, number] {
    return [Math.floor(start / cellCm), Math.floor((start + size - EPSILON) / cellCm)]
  }

  /** Ô 3 chiều: một cột nhiều tầng không dồn vào cùng ô, nên truy vấn chỉ xét đúng lát Z liên quan (LM-023). */
  function forEachCell(box: Box, visit: (key: string) => void) {
    const [x0, x1] = cellRange(box.xCm, box.lengthCm)
    const [y0, y1] = cellRange(box.yCm, box.widthCm)
    const [z0, z1] = cellRange(box.zCm, box.heightCm)
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) visit(`${x}:${y}:${z}`)
  }

  /** Lát mỏng quanh độ cao `zCm` (± dung sai tiếp xúc) trên đáy của `query`: nơi có mặt trên/đáy của hộp chạm nó. */
  function contactSlab(query: Box, zCm: number): Box {
    const reach = CONTACT_TOLERANCE_CM + EPSILON
    return { ...query, zCm: zCm - reach, heightCm: 2 * reach + EPSILON }
  }

  /**
   * Hộp trong các ô của `region` thoả `keep`, theo thứ tự thêm vào (tất định). Lọc trước rồi mới sắp: hành lang dỡ
   * phủ nhiều ô nên có hàng trăm ứng viên nhưng chỉ vài hộp đạt — sắp cả ứng viên từng chiếm gần hết thời gian LIFO (LM-020).
   */
  function matching(region: Box, { excludeId }: SpatialQueryOptions, keep: (other: Box) => boolean): string[] {
    const seen = new Set<string>()
    const found: string[] = []
    forEachCell(region, (key) =>
      cells.get(key)?.forEach((id) => {
        if (id === excludeId || seen.has(id)) return
        seen.add(id)
        if (keep(boxes.get(id)!)) found.push(id)
      }),
    )
    return found.sort((a, b) => order.get(a)! - order.get(b)!)
  }

  function leaveCells(id: string) {
    const box = boxes.get(id)
    if (box) forEachCell(box, (key) => cells.get(key)?.delete(id))
  }

  function place(id: string, box: Box) {
    leaveCells(id)
    boxes.set(id, box)
    if (!order.has(id)) order.set(id, nextOrder++)
    // Chỉ tăng, không giảm khi hộp dời đi: vùng ô rộng hơn cần thiết vẫn đúng vì kết quả được lọc chính xác.
    farthestEndXCm = Math.max(farthestEndXCm, box.xCm + box.lengthCm)
    forEachCell(box, (key) => {
      const cell = cells.get(key) ?? new Set<string>()
      cell.add(id)
      cells.set(key, cell)
    })
  }

  for (const { id, box } of entries) place(id, box)

  return {
    queryAabb: (query, options = {}) => matching(query, options, (other) => overlaps(other, query)),
    queryBelow: (query, options = {}) =>
      matching(contactSlab(query, query.zCm), options, (other) =>
        footprintsOverlap(other, query) && touchesVertically(other.zCm + other.heightCm, query.zCm),
      ),
    queryAbove: (query, options = {}) =>
      matching(contactSlab(query, query.zCm + query.heightCm), options, (other) =>
        footprintsOverlap(other, query) && touchesVertically(query.zCm + query.heightCm, other.zCm),
      ),
    queryRearCorridor: (query, options = {}) => {
      const rearFaceXCm = query.xCm + query.lengthCm
      if (!gt(farthestEndXCm, rearFaceXCm)) return []
      const corridor = { ...query, xCm: rearFaceXCm, lengthCm: farthestEndXCm - rearFaceXCm }
      return matching(corridor, options, (other) => !lt(other.xCm, rearFaceXCm) && sectionsOverlap(other, query))
    },
    update: place,
    remove: (id) => {
      leaveCells(id)
      boxes.delete(id)
      order.delete(id)
    },
  }
}
