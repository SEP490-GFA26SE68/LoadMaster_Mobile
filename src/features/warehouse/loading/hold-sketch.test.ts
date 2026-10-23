import type { VehicleObstacle } from '@/domain/models'

import { holdSketch } from './hold-sketch'

/** Thùng 600 × 240 cm, một hốc bánh xe sát vách trái. */
const WHEEL_ARCH: VehicleObstacle = {
  id: 'OBS-001',
  type: 'WHEEL_ARCH',
  xCm: 300,
  yCm: 0,
  zCm: 0,
  lengthCm: 100,
  widthCm: 30,
  heightCm: 40,
  loadBearing: true,
}
const VEHICLE = { innerLengthCm: 600, innerWidthCm: 240, obstacles: [WHEEL_ARCH] }

const box = (id: string, x: number, y: number, z: number, lengthCm: number, widthCm: number) => ({
  id,
  position: { x, y, z },
  lengthCm,
  widthCm,
})

// Kiện chồng (B, cao 45 cm) đứng trước kiện bên dưới nó (A) trong mảng, để thấy thứ tự vẽ không theo mảng
const STACKED = box('B', 0, 0, 45, 100, 50)
const FLOOR = box('A', 0, 0, 0, 120, 60)
const RIGHT_WALL = box('C', 120, 180, 0, 80, 60)
const LATER = box('D', 200, 0, 0, 50, 50)
const PLACEMENTS = [STACKED, FLOOR, RIGHT_WALL, LATER]

describe('holdSketch', () => {
  test('vẽ đúng tỉ lệ cm: vách trước ở mép trái, vách trái ở mép dưới', () => {
    const sketch = holdSketch(VEHICLE, PLACEMENTS, new Set(['A']), 'C')
    expect(sketch.lengthCm).toBe(600)
    expect(sketch.widthCm).toBe(240)
    // Kiện sát vách trái và vách trước: góc trên trái của hình ở Y = 240 − 60
    expect(sketch.loaded).toEqual([{ id: 'A', x: 0, y: 180, width: 120, height: 60 }])
    // Kiện sát vách phải nằm ở mép trên
    expect(sketch.current).toEqual({ id: 'C', x: 120, y: 0, width: 80, height: 60 })
    expect(sketch.obstacles).toEqual([{ id: 'OBS-001', x: 300, y: 210, width: 100, height: 30 }])
  })

  test('kiện đã lên xe vẽ từ thấp lên cao, không gồm kiện đang hỏi hay kiện chưa xếp', () => {
    const sketch = holdSketch(VEHICLE, PLACEMENTS, new Set(['B', 'A', 'C']), 'C')
    expect(sketch.loaded.map((rect) => rect.id)).toEqual(['A', 'B'])
    expect(sketch.loaded[1]).toEqual({ id: 'B', x: 0, y: 190, width: 100, height: 50 })
  })

  test('không có kiện đang hỏi — mọi kiện đã có kết quả — thì chỉ còn kiện đã lên xe', () => {
    const sketch = holdSketch(VEHICLE, PLACEMENTS, new Set(['A', 'B', 'C', 'D']), undefined)
    expect(sketch.current).toBeUndefined()
    expect(sketch.loaded.map((rect) => rect.id)).toEqual(['A', 'C', 'D', 'B'])
  })

  test('mã kiện đang hỏi không có trong phương án thì không vẽ kiện đó', () => {
    expect(holdSketch(VEHICLE, PLACEMENTS, new Set(), 'PKG-404').current).toBeUndefined()
  })
})
