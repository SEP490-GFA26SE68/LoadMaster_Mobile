import { encodePolyline } from '@/domain/routing/polyline'
import { backend, ok, onTrip, STOP } from '@/test/driver-backend'

import { ROUTE_REUSE_MS } from './driver-http'

const PLAN = {
  planVersion: 1,
  legs: [{ legSequence: 2, endStopId: 902, polyline: encodePolyline([{ lat: 10.78, lng: 106.7 }, { lat: 10.95, lng: 106.82 }]) }],
}

const routeReads = (calls: readonly { path: string }[]) => calls.filter((call) => call.path === '/api/trips/41/route-plans/active').length

describe('tuyến đang đi không đọc lại theo nhịp của màn điểm giao', () => {
  afterEach(() => jest.restoreAllMocks())

  test('cùng điểm: dùng lại tuyến đã đọc; sang điểm mới hoặc quá thời hạn thì đọc lại', async () => {
    let now = Date.parse('2026-10-16T02:30:00Z')
    jest.spyOn(Date, 'now').mockImplementation(() => now)
    const routes = onTrip({ 'GET /api/trips/41/route-plans/active': () => ok(PLAN) })
    const { driver, calls } = backend(routes)

    await driver.fetchTripScreen('41')
    const again = await driver.fetchTripScreen('41')
    expect(routeReads(calls)).toBe(1)
    expect(again.kind === 'stop' && again.screen.routeMap?.planVersion).toBe(1)

    routes['GET /api/driver/trips/41/current-stop'] = () => ok({ ...STOP, stopId: 903, stopSequence: 3, actualArrival: null })
    await driver.fetchTripScreen('41')
    expect(routeReads(calls)).toBe(2)

    now += ROUTE_REUSE_MS
    await driver.fetchTripScreen('41')
    expect(routeReads(calls)).toBe(3)
  })

  test('đọc tuyến lỗi thì không giữ: lần sau đọc tiếp', async () => {
    const { driver, calls } = backend(onTrip())
    await driver.fetchTripScreen('41')
    await driver.fetchTripScreen('41')
    expect(routeReads(calls)).toBe(2)
  })
})
