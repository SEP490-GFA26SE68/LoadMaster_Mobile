import { ApiError, createApiClient } from '@/data/http'
import { encodePolyline } from '@/domain/routing/polyline'

import { httpDriverApi } from './driver-http'
import type { DriverTripScreen, StopScreen } from './driver-model'

type Call = { method: string; path: string; query: Record<string, string>; body: unknown }
type Reply = { status: number; body?: unknown }

/** Phong bì của backend: lỗi nghiệp vụ hiện không kèm mã. */
const ok = (data: unknown): Reply => ({ status: 200, body: { success: true, code: null, message: 'ok', data, errors: null } })
const fail = (status: number): Reply => ({ status, body: { success: false, code: null, message: 'thông điệp thô', data: null, errors: null } })

const TRIP = {
  tripId: 41,
  tripCode: 'TRIP-0041',
  vehicleLicensePlate: '51C-123.45',
  stopCount: 3,
  departureTime: '2026-10-16T07:30:00.123456',
  status: 'IN_TRANSIT',
}

const STOP = {
  stopId: 902,
  stopSequence: 2,
  stopName: 'Điện máy Xanh Biên Hoà',
  address: '12 Phạm Văn Thuận, Biên Hoà',
  packages: [
    { packageId: 7001, packageName: 'Tủ lạnh 180L', trackingBarcode: 'LM-AB12-CD34-EF56', weight: 62.5, unloadOrder: 1 },
    { packageId: 7002, packageName: null, trackingBarcode: null, weight: null, unloadOrder: 2 },
  ],
}

const STOP_KEY = { number: 2, ref: '902' }

/** Backend giả: trả theo `PHƯƠNG_THỨC đường-dẫn`, ghi lại mọi lượt gọi. */
function backend(routes: Record<string, (call: Call) => Reply>, user: { id: string | null } = { id: '15' }) {
  const calls: Call[] = []
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const parsed = new URL(url)
    const call: Call = {
      method: init.method ?? 'GET',
      path: parsed.pathname,
      query: Object.fromEntries(parsed.searchParams),
      body: init.body === undefined ? undefined : (JSON.parse(String(init.body)) as unknown),
    }
    calls.push(call)
    const reply = routes[`${call.method} ${call.path}`]?.(call) ?? fail(404)
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      text: async () => (reply.body === undefined ? '' : JSON.stringify(reply.body)),
    } as Response
  }) as unknown as typeof fetch
  const client = createApiClient({ baseUrl: 'http://api.test', accessToken: async () => 'TOKEN', fetch: fetchImpl })
  const driver = httpDriverApi({ client: () => client, userId: () => user.id })
  return { calls, driver, user }
}

const onTrip = (extra: Record<string, (call: Call) => Reply> = {}) => ({
  'GET /api/driver/trips': () => ok([TRIP, { ...TRIP, tripId: 42, tripCode: 'TRIP-0042', status: 'DELIVERED' }]),
  'GET /api/driver/trips/41/current-stop': () => ok(STOP),
  ...extra,
})

async function failure(run: () => Promise<unknown>): Promise<ApiError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('lượt gọi không ném lỗi')
}

function stopOf(screen: DriverTripScreen): StopScreen {
  if (screen.kind !== 'stop') throw new Error(`màn là ${screen.kind}, không phải điểm giao`)
  return screen.screen
}

describe('httpDriverApi', () => {
  test('danh sách chuyến: gửi mã tài xế, chỉ giữ chuyến đang vận chuyển, giờ backend là giờ Việt Nam', async () => {
    const { driver, calls } = backend(onTrip())
    const trips = await driver.fetchMyTrips()
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/driver/trips', query: { driverId: '15' } })
    expect(trips.refreshMs).toBeNull()
    expect(trips.groups).toMatchObject({ loaded: [], preparing: [], recent: [] })
    expect(trips.groups.inTransit).toHaveLength(1)
    expect(trips.groups.inTransit[0]).toMatchObject({
      id: '41',
      code: 'TRIP-0041',
      vehicleName: '51C-123.45',
      status: 'IN_TRANSIT',
      stopCount: 3,
      date: '2026-10-16T07:30:00.123+07:00',
      packageCount: undefined,
    })
  })

  test('chưa có người đăng nhập: không gọi backend (thiếu mã tài xế backend trả chuyến của mọi người)', async () => {
    const { driver, calls } = backend(onTrip(), { id: null })
    expect((await failure(() => driver.fetchMyTrips())).code).toBe('UNAUTHENTICATED')
    expect(calls).toHaveLength(0)
  })

  test('màn điểm giao: điểm hiện tại, dải tiến độ theo số điểm của chuyến, kiện theo thứ tự dỡ', async () => {
    const { driver } = backend(onTrip())
    const screen = await driver.fetchTripScreen('41')
    expect(screen).toMatchObject({ kind: 'stop', trip: { id: '41', code: 'TRIP-0041' } })
    const stop = stopOf(screen)
    expect(stop).toMatchObject({
      mode: 'delivering',
      arrived: true,
      stop: { number: 2, ref: '902', name: 'Điện máy Xanh Biên Hoà', address: '12 Phạm Văn Thuận, Biên Hoà' },
      stopCount: 3,
      total: 2,
      doneCount: 0,
      remaining: 2,
      verifiable: 2,
    })
    expect(stop.stops.map(({ number, done }) => [number, done])).toEqual([
      [1, true],
      [2, false],
      [3, false],
    ])
    expect(stop.items.map(({ id, label, name, weightKg, unloadingOrder }) => [id, label, name, weightKg, unloadingOrder])).toEqual([
      ['7001', 'LM-AB12-CD34-EF56', 'Tủ lạnh 180L', 62.5, 1],
      ['7002', '7002', '7002', undefined, 2],
    ])
    expect(stop.routeMap).toBeUndefined()
  })

  test('plan active: vẽ polyline Goong, toạ độ điểm hiện tại, bước chỉ dẫn của leg đang đi', async () => {
    const start = { lat: 10.78, lng: 106.7 }
    const mid = { lat: 10.85, lng: 106.77 }
    const end = { lat: 10.95, lng: 106.82 }
    const { driver, calls } = backend(
      onTrip({
        'GET /api/trips/41/route-plans/active': () =>
          ok({
            planVersion: 3,
            legs: [
              { legSequence: 1, endStopId: 901, polyline: encodePolyline([start, mid]) },
              {
                legSequence: 2,
                endStopId: 902,
                polyline: encodePolyline([mid, end]),
                steps: [{ instruction: 'Rẽ phải', maneuver: 'turn-right', distanceMeters: 300, lat: 10.9, lng: 106.8 }],
              },
            ],
          }),
      }),
    )
    const stop = stopOf(await driver.fetchTripScreen('41'))
    expect(calls.some((call) => call.method === 'GET' && call.path === '/api/trips/41/route-plans/active')).toBe(true)
    expect(stop.stop).toMatchObject({ lat: end.lat, lng: end.lng })
    expect(stop.routeMap).toMatchObject({
      planVersion: 3,
      depot: { lat: start.lat, lng: start.lng },
      guidanceSteps: [{ instruction: 'Rẽ phải', maneuver: 'turn-right', distanceMeters: 300, lat: 10.9, lng: 106.8 }],
    })
    expect(stop.routeMap?.stops.map(({ number, lat, lng }) => [number, lat, lng])).toEqual([
      [1, mid.lat, mid.lng],
      [2, end.lat, end.lng],
    ])
    expect(stop.routeMap?.path?.at(-1)).toEqual(end)
  })

  test('chuyến không còn trong danh sách đang vận chuyển: không mở màn điểm giao', async () => {
    const { driver } = backend(onTrip())
    const error = await failure(() => driver.fetchTripScreen('99'))
    expect(error).toMatchObject({ code: 'TRIP_NOT_IN_TRANSIT', params: { tripId: '99' } })
  })

  test('chuyến đang vận chuyển không còn điểm chưa hoàn tất: màn không có điểm giao', async () => {
    const { driver } = backend(onTrip({ 'GET /api/driver/trips/41/current-stop': () => fail(404) }))
    expect(await driver.fetchTripScreen('41')).toEqual({ kind: 'noStops', trip: { id: '41', code: 'TRIP-0041', name: undefined } })
  })

  test('dỡ kiện: khớp mã trên nhãn không phân biệt hoa thường, ghi bằng mã kiện, màn thấy kiện đã dỡ', async () => {
    const { driver, calls } = backend(onTrip({ 'POST /api/driver/packages/7001/unload': () => ok({ remainingPackagesCount: 1 }) }))
    await driver.fetchTripScreen('41')
    await expect(driver.confirmUnload('41', { stop: STOP_KEY, method: 'QR', code: '  lm-ab12-cd34-ef56 ' })).resolves.toEqual({ id: '7001' })
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/api/driver/packages/7001/unload', query: { driverId: '15' } })

    const stop = stopOf(await driver.fetchTripScreen('41'))
    expect(stop).toMatchObject({ doneCount: 1, remaining: 1 })
    expect(stop.items[0]).toMatchObject({ unloaded: true, via: 'QR' })
    expect(stop.items[1]).toMatchObject({ unloaded: false, via: undefined })
  })

  test('mã không khớp kiện nào của điểm, hoặc kiện vừa ghi dỡ: báo ngay, không gọi backend', async () => {
    const { driver, calls } = backend(onTrip({ 'POST /api/driver/packages/7002/unload': () => ok({ remainingPackagesCount: 1 }) }))
    await driver.fetchTripScreen('41')
    const unknown = await failure(() => driver.confirmUnload('41', { stop: STOP_KEY, method: 'CODE', code: ' PK-404 ' }))
    expect(unknown).toMatchObject({ code: 'PACKAGE_CODE_UNKNOWN', params: { code: 'PK-404' } })

    await driver.confirmUnload('41', { stop: STOP_KEY, method: 'CODE', code: '7002' })
    const again = await failure(() => driver.confirmUnload('41', { stop: STOP_KEY, method: 'CODE', code: '7002' }))
    expect(again).toMatchObject({ code: 'PACKAGE_ALREADY_UNLOADED', params: { code: '7002' } })
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1)
  })

  test('backend báo kiện đã dỡ từ trước (409): ghi nhận để danh sách đúng lại; kiện không thuộc điểm (400): câu riêng', async () => {
    const { driver } = backend(
      onTrip({
        'POST /api/driver/packages/7001/unload': () => fail(409),
        'POST /api/driver/packages/7002/unload': () => fail(400),
      }),
    )
    await driver.fetchTripScreen('41')
    const duplicate = await failure(() => driver.confirmUnload('41', { stop: STOP_KEY, method: 'QR', code: 'LM-AB12-CD34-EF56' }))
    expect(duplicate).toMatchObject({ code: 'PACKAGE_ALREADY_UNLOADED', status: 409, params: { code: 'LM-AB12-CD34-EF56' } })
    const wrongStop = await failure(() => driver.confirmUnload('41', { stop: STOP_KEY, method: 'CODE', code: '7002' }))
    expect(wrongStop).toMatchObject({ code: 'PACKAGE_NOT_AT_STOP', status: 400 })

    const stop = stopOf(await driver.fetchTripScreen('41'))
    expect(stop.items[0]).toMatchObject({ unloaded: true, via: undefined })
    expect(stop.items[1]).toMatchObject({ unloaded: false })
  })

  test('hoàn tất điểm: backend chưa cho (400) thì nói tên điểm; điểm cuối xong thì chuyến mở màn tổng kết', async () => {
    let tripDone = false
    let refused = true
    const { driver, calls } = backend({
      'GET /api/driver/trips': () => ok(tripDone ? [] : [TRIP]),
      'GET /api/driver/trips/41/current-stop': () => ok(STOP),
      'POST /api/driver/stops/902/complete': () => (refused ? fail(400) : ok({ tripCompleted: true })),
    })
    await driver.fetchTripScreen('41')
    const error = await failure(() => driver.completeStop('41', STOP_KEY))
    expect(error).toMatchObject({ code: 'STOP_NOT_COMPLETABLE', params: { name: 'Điện máy Xanh Biên Hoà' } })

    refused = false
    await driver.completeStop('41', STOP_KEY)
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/api/driver/stops/902/complete', query: { driverId: '15' } })
    tripDone = true
    expect(await driver.fetchTripScreen('41')).toEqual({
      kind: 'completed',
      trip: { id: '41', code: 'TRIP-0041', name: undefined },
      summary: undefined,
    })
  })

  test('gửi vị trí: thân yêu cầu đúng hợp đồng; chuyến không còn chạy (400) thì nói mã chuyến', async () => {
    let running = true
    const { driver, calls } = backend(
      onTrip({ 'POST /api/driver/location': () => (running ? ok({ recordedAt: '2026-10-16T01:02:03Z' }) : fail(400)) }),
    )
    await driver.fetchMyTrips()
    await expect(driver.postLocation('41', { lat: 10.95, lng: 106.82, speedKmh: 42, heading: 90 })).resolves.toEqual({
      recordedAt: '2026-10-16T01:02:03Z',
    })
    expect(calls.at(-1)).toMatchObject({ body: { tripId: '41', lat: 10.95, lng: 106.82, speedKmh: 42, heading: 90 } })

    running = false
    const error = await failure(() => driver.postLocation('41', { lat: 10.95, lng: 106.82 }))
    expect(error).toMatchObject({ code: 'TRIP_NOT_IN_TRANSIT', params: { tripId: 'TRIP-0041' } })
  })

  test('việc backend chưa có: tắt ở capabilities, gọi tới là NOT_SUPPORTED', async () => {
    const { driver, calls } = backend(onTrip())
    expect(driver.capabilities).toEqual({
      depart: false,
      arrive: false,
      manualConfirm: false,
      deliveryIssues: false,
      tripExceptions: true,
      gps: true,
      notifications: false,
      gpsLocalOnly: false,
    })
    for (const run of [
      () => driver.startDelivery('41'),
      () => driver.arriveAtStop('41', STOP_KEY),
      () => driver.confirmUnloadManually('41', { stop: STOP_KEY, itemId: '7001', reason: 'LABEL_DAMAGED', note: undefined }),
      () => driver.reportDeliveryIssue('41', { stop: STOP_KEY, itemId: '7001', kind: 'damaged', note: undefined }),
      () => driver.fetchNotifications(),
    ]) {
      expect((await failure(run)).code).toBe('NOT_SUPPORTED')
    }
    await expect(driver.setDriverGps('41', true)).resolves.toBeUndefined()
    expect(calls).toHaveLength(0)
  })

  test('đổi người đăng nhập: quên kiện đã dỡ của người trước', async () => {
    const { driver, user } = backend(onTrip({ 'POST /api/driver/packages/7001/unload': () => ok({ remainingPackagesCount: 1 }) }))
    await driver.fetchTripScreen('41')
    await driver.confirmUnload('41', { stop: STOP_KEY, method: 'QR', code: 'LM-AB12-CD34-EF56' })
    expect(stopOf(await driver.fetchTripScreen('41')).doneCount).toBe(1)

    user.id = '16'
    expect(stopOf(await driver.fetchTripScreen('41')).doneCount).toBe(0)
  })
})
