import { loadingDto, step } from '@/test/warehouse-backend'

import { serverLoadingView } from '../server-loading'
import { sessionOf } from '../warehouse-http-mapping'
import type { StartLoadingDto } from '../warehouse-http-dto'
import { serverHoldSketch } from './server-hold-sketch'

/** Phiên xếp của chuyến 51 (thùng 600 × 240 × 240 cm) với ba chỗ xếp; `statuses` là trạng thái từng chỗ theo thứ tự. */
function session(statuses: readonly string[], extra: Record<string, unknown> = {}) {
  return sessionOf(
    loadingDto([], {
      placements: [
        step(901, 1, { staged: true, status: statuses[0], posX: 0, posY: 0, posZ: 0, stopSequence: 2, stopName: 'Kho Biên Hoà' }),
        step(902, 2, { staged: true, status: statuses[1], posX: 0, posY: 0, posZ: 80, stopSequence: 2, stopName: 'Kho Biên Hoà' }),
        step(903, 3, { staged: true, status: statuses[2], posX: 540, posY: 190, posZ: 0, stopSequence: 1, stopName: 'Điện máy Xanh Thủ Đức' }),
      ],
      ...extra,
    }) as unknown as StartLoadingDto,
  )
}

const sketchOf = (statuses: readonly string[], extra?: Record<string, unknown>) => {
  const s = session(statuses, extra)
  return serverHoldSketch(s, serverLoadingView(s).current)
}

describe('serverHoldSketch', () => {
  test('hình từ trên xuống: vách trước ở x = 0, trục Y lật để vách trái nằm dưới; kiện đang xếp tách khỏi kiện đã lên xe', () => {
    const sketch = sketchOf(['CONFIRMED', 'PENDING', 'PENDING'])
    expect(sketch?.top).toMatchObject({ width: 600, height: 240 })
    expect(sketch?.top.loaded).toEqual([{ id: '901', x: 0, y: 190, width: 60, height: 50, stop: 2 }])
    expect(sketch?.top.current).toEqual({ id: '902', x: 0, y: 190, width: 60, height: 50, stop: 2 })
  })

  test('hình từ cửa sau: bề ngang là chiều rộng thùng, sàn ở mép dưới; kiện sâu trong thùng vẽ trước kiện gần cửa', () => {
    const sketch = sketchOf(['CONFIRMED', 'DEVIATION', 'PENDING'])
    expect(sketch?.rear).toMatchObject({ width: 240, height: 240 })
    expect(sketch?.rear.loaded.map((rect) => rect.id)).toEqual(['901', '902'])
    expect(sketch?.rear.loaded[1]).toEqual({ id: '902', x: 0, y: 80, width: 50, height: 80, stop: 2 })
    expect(sketch?.rear.current).toEqual({ id: '903', x: 190, y: 160, width: 50, height: 80, stop: 1 })
  })

  test('kiện hỏng bị bỏ lại kho không vẽ; chú giải liệt kê điểm có trên hình theo số, kèm tên', () => {
    const sketch = sketchOf(['DAMAGED', 'CONFIRMED', 'PENDING'])
    expect(sketch?.top.loaded.map((rect) => rect.id)).toEqual(['902'])
    expect(sketch?.stops).toEqual([
      { number: 1, name: 'Điện máy Xanh Thủ Đức' },
      { number: 2, name: 'Kho Biên Hoà' },
    ])
  })

  test('không vẽ gì khi phiên thiếu kích thước lòng thùng hoặc không còn kiện để xếp', () => {
    expect(sketchOf(['PENDING', 'PENDING', 'PENDING'], { innerLength: null })).toBeNull()
    expect(sketchOf(['CONFIRMED', 'CONFIRMED', 'CONFIRMED'])).toBeNull()
  })
})
