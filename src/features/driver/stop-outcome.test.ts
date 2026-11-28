import { completeResultOf, hasRemainingStops, stopOutcomeOf } from './stop-outcome'
import type { StopCompletionInfo, StopScreen } from './driver-model'

const NEXT = { number: 2, name: 'Điểm 2' }

function completion(overrides: Partial<StopCompletionInfo> = {}): StopCompletionInfo {
  return { delivered: 3, returned: [], picked: 0, issues: 0, next: NEXT, nextKnown: true, ...overrides }
}

describe('còn điểm giao phía sau sau khi hoàn tất', () => {
  test('máy chủ nói hết chuyến: không còn điểm sau, kể cả khi màn còn nhớ điểm kế tiếp', () => {
    expect(hasRemainingStops({ tripCompleted: true, hasNext: false }, completion())).toBe(false)
  })

  test('máy chủ nói còn điểm sau: còn, kể cả khi màn chưa biết tên điểm', () => {
    expect(hasRemainingStops({ tripCompleted: false, hasNext: true }, completion({ next: undefined, nextKnown: false }))).toBe(true)
  })

  test('máy chủ không nói: tin danh sách điểm — có next thì còn, không next thì hết', () => {
    expect(hasRemainingStops({ tripCompleted: false, hasNext: false }, completion())).toBe(true)
    expect(hasRemainingStops({ tripCompleted: false, hasNext: false }, completion({ next: undefined }))).toBe(false)
  })

  test('máy chủ không nói và nguồn không biết tuyến: coi như còn, không đóng chuyến nhầm', () => {
    expect(hasRemainingStops({ tripCompleted: false, hasNext: false }, completion({ next: undefined, nextKnown: false }))).toBe(true)
  })

  test('DTO hết chuyến / còn điểm / máy chủ cũ', () => {
    expect(completeResultOf({ tripCompleted: true, nextStopId: null })).toEqual({ tripCompleted: true, hasNext: false })
    expect(completeResultOf({ tripCompleted: false, nextStopId: 9 })).toEqual({ tripCompleted: false, hasNext: true })
    expect(completeResultOf({ tripCompleted: null })).toEqual({ tripCompleted: false, hasNext: false })
    expect(completeResultOf(undefined)).toEqual({ tripCompleted: false, hasNext: false })
  })
})

describe('ảnh chụp màn xen giữa', () => {
  const screen = {
    stop: { number: 1, ref: 's1', name: 'Điểm 1', address: '' },
    stopCount: 3,
    completion: completion(),
  } as unknown as StopScreen

  test('còn điểm: tripCompleted false, giữ next', () => {
    const outcome = stopOutcomeOf(screen, { tripCompleted: false, hasNext: true })
    expect(outcome).toMatchObject({ stopNumber: 1, stopName: 'Điểm 1', tripCompleted: false, next: NEXT })
  })

  test('điểm cuối: tripCompleted true, bỏ next', () => {
    const last = { ...screen, completion: completion({ next: undefined }) }
    expect(stopOutcomeOf(last, { tripCompleted: true, hasNext: false })).toMatchObject({ tripCompleted: true, next: undefined })
  })
})
