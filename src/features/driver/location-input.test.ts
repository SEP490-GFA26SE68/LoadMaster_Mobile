import { locationInput } from './location-input'

const AT = { latitude: 10.8231, longitude: 106.6297 }

describe('locationInput', () => {
  test('đổi tốc độ m/s sang km/h, làm tròn 0,1', () => {
    expect(locationInput({ ...AT, speed: 12.5, heading: 90 })).toEqual({ lat: 10.8231, lng: 106.6297, speedKmh: 45, heading: 90 })
    expect(locationInput({ ...AT, speed: 0.27, heading: 0 }).speedKmh).toBe(1)
    expect(locationInput({ ...AT, speed: 8.33, heading: 0 }).speedKmh).toBe(30)
  })

  test('đưa hướng về [0, 360)', () => {
    expect(locationInput({ ...AT, speed: 0, heading: 370.4 }).heading).toBe(10)
    expect(locationInput({ ...AT, speed: 0, heading: 359.6 }).heading).toBe(0)
  })

  test('tốc độ hay hướng không đo được thì là 0', () => {
    expect(locationInput({ ...AT, speed: null, heading: null })).toEqual({ lat: 10.8231, lng: 106.6297, speedKmh: 0, heading: 0 })
    // iOS trả −1 khi không đo được
    expect(locationInput({ ...AT, speed: -1, heading: -1 })).toEqual({ lat: 10.8231, lng: 106.6297, speedKmh: 0, heading: 0 })
    expect(locationInput({ ...AT, speed: Number.NaN, heading: Number.POSITIVE_INFINITY })).toEqual({ lat: 10.8231, lng: 106.6297, speedKmh: 0, heading: 0 })
  })
})
