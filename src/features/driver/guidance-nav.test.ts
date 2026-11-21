import { nextGuidance, remainingTo, remainingTrip, type GuidanceStep } from '@/domain/routing/guidance'

const HERE = { lat: 10.77, lng: 106.7 }
const STEPS: GuidanceStep[] = [
  { instruction: 'Rẽ phải vào Nguyễn Huệ', maneuver: 'turn-right', distanceMeters: 300, durationSeconds: 40, lat: 10.771, lng: 106.701 },
  { instruction: 'Đi thẳng', maneuver: 'straight', distanceMeters: 800, durationSeconds: 90, lat: 10.78, lng: 106.71 },
]

test('không GPS thì hiện bước đầu và khoảng của bước đó', () => {
  expect(nextGuidance(STEPS, undefined)).toMatchObject({
    instruction: 'Rẽ phải vào Nguyễn Huệ',
    maneuver: 'turn-right',
    remainingMeters: 300,
  })
})

test('xe còn xa ngã rẽ thì mét còn lại là chim bay tới ngã đó', () => {
  const next = nextGuidance(STEPS, HERE)
  expect(next?.maneuver).toBe('turn-right')
  expect(next?.remainingMeters).toBeGreaterThan(100)
})

test('danh sách rỗng thì không có bước; remainingTo không GPS là 0', () => {
  expect(nextGuidance([], HERE)).toBeUndefined()
  expect(remainingTo({ lat: 10.8, lng: 106.8 }, undefined)).toBe(0)
})

test('bước kế mang bước Sau đó', () => {
  expect(nextGuidance(STEPS, undefined)?.then).toEqual({ instruction: 'Đi thẳng', maneuver: 'straight' })
  expect(nextGuidance(STEPS, HERE)?.then?.maneuver).toBe('straight')
})

test('remainingTrip cộng giờ bước hiện tại còn lại với các bước sau', () => {
  const leftover = remainingTrip(STEPS, HERE)
  expect(leftover?.meters).toBeGreaterThan(800)
  expect(leftover?.seconds).toBeGreaterThan(90)
})
