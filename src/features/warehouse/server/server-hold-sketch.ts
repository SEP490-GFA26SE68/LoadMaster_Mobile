import type { ServerLoadingSession, ServerPlacement } from '../warehouse-server-model'

/*
 * Sơ đồ 2D của bước Xếp ở phiên máy chủ — thay khung 3D của web (app chưa có Three.js). Hai hình đúng tỉ lệ cm của lòng thùng, vẽ thẳng vào
 * `viewBox` cm:
 * - nhìn từ trên xuống: vách trước ở mép trái (X = 0), cửa sau ở mép phải (X = dài thùng), vách trái (Y = 0) ở mép dưới — như sơ đồ của bản
 *   kho mẫu (`loading/hold-sketch.ts`);
 * - nhìn từ cửa sau vào: vách trái (Y = 0) bên trái, sàn ở mép dưới; kiện sâu trong thùng vẽ trước, kiện gần cửa vẽ đè lên.
 * Kiện đã lên xe (xếp đúng chỗ hoặc kèm sai lệch; kiện hỏng bị bỏ lại kho thì không) và kiện đang xếp tô theo màu điểm giao của chúng.
 */

/** Một hình chữ nhật của sơ đồ, toạ độ SVG theo cm; `stop` là số điểm giao (null khi máy chủ không trả). */
export type StopRect = {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly stop: number | null
}

export type SketchView = {
  /** Bề ngang và chiều cao của `viewBox` (cm). */
  readonly width: number
  readonly height: number
  /** Kiện đã lên xe theo thứ tự vẽ: kiện vẽ sau đè kiện vẽ trước. */
  readonly loaded: readonly StopRect[]
  readonly current: StopRect
}

export type ServerSketch = {
  readonly top: SketchView
  readonly rear: SketchView
  /** Điểm giao có kiện trên hình, theo số điểm: chú giải màu luôn kèm số và tên. */
  readonly stops: readonly { readonly number: number; readonly name: string | null }[]
}

const LOADED: ReadonlySet<string> = new Set(['confirmed', 'deviation'])

/**
 * Hình của sơ đồ từ phiên máy chủ và kiện đang xếp. `null` khi phiên không có kích thước lòng thùng hoặc không còn kiện nào để xếp — màn
 * không vẽ gì, vị trí vẫn là số trên thẻ kiện. Hàm thuần.
 */
export function serverHoldSketch(session: ServerLoadingSession, current: ServerPlacement | undefined): ServerSketch | null {
  const box = session.box
  if (box === null || current === undefined) return null
  const loaded = session.placements.filter((p) => p.id !== current.id && LOADED.has(session.outcomes[p.id] ?? ''))
  const { innerLengthCm: length, innerWidthCm: width, innerHeightCm: height } = box

  const topRect = (p: ServerPlacement): StopRect => ({
    id: p.id,
    x: p.x,
    y: width - (p.y + p.widthCm),
    width: p.lengthCm,
    height: p.widthCm,
    stop: p.stopSequence,
  })
  const rearRect = (p: ServerPlacement): StopRect => ({
    id: p.id,
    x: p.y,
    y: height - (p.z + p.heightCm),
    width: p.widthCm,
    height: p.heightCm,
    stop: p.stopSequence,
  })

  const names = new Map<number, string | null>()
  for (const p of [...loaded, current]) {
    if (p.stopSequence !== null && !names.has(p.stopSequence)) names.set(p.stopSequence, p.stopName)
  }

  return {
    top: { width: length, height: width, loaded: loaded.toSorted((a, b) => a.z - b.z).map(topRect), current: topRect(current) },
    rear: { width, height, loaded: loaded.toSorted((a, b) => a.x + a.lengthCm - (b.x + b.lengthCm)).map(rearRect), current: rearRect(current) },
    stops: [...names].toSorted(([a], [b]) => a - b).map(([number, name]) => ({ number, name })),
  }
}
