import { encodePolyline } from '@/domain/routing/polyline'
import { backend, fail, failure, ok, onTrip, STOP, STOP_KEY, stopOf, TRIP } from '@/test/driver-backend'

describe('httpDriverApi: chuyến và điểm hiện tại', () => {
  test('danh sách chuyến: gửi mã tài xế, chia bốn nhóm như web, giờ backend là giờ Việt Nam', async () => {
    const trip = (tripId: number, status: string, extra: Record<string, unknown> = {}) => ({ ...TRIP, tripId, tripCode: `TRIP-00${tripId}`, status, ...extra })
    const { driver, calls } = backend({
      'GET /api/driver/trips': () =>
        ok([
          TRIP,
          trip(43, 'LOADING', { loadingCompleted: true }),
          trip(44, 'LOADING', { loadingCompleted: false }),
          trip(45, 'DELIVERED', { completedAt: '2026-10-15T17:00:00' }),
          trip(46, 'DELIVERED', { completedAt: '2026-10-16T11:00:00' }),
          trip(47, 'PLANNED', { tripCode: 'TRIP-0200', departureTime: '2026-10-18T08:00:00' }),
          trip(48, 'CANCELLED'),
          trip(49, 'DRAFT', { tripCode: 'TRIP-0090', departureTime: '2026-10-19T08:00:00' }),
          trip(50, 'DRAFT', { tripCode: 'TRIP-0040', departureTime: '2026-10-19T08:00:00' }),
        ]),
    })
    const trips = await driver.fetchMyTrips()
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/driver/trips', query: { driverId: '15' } })
    expect(trips.refreshMs).toBe(30_000)
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
    expect(trips.groups.loaded.map(({ id, sub }) => [id, sub])).toEqual([['43', { kind: 'loaded' }]])
    expect(trips.groups.preparing.map(({ id, sub }) => [id, sub])).toEqual([['44', null]])
    expect(trips.groups.upcoming.map(({ id, code, status }) => [id, code, status])).toEqual([
      ['47', 'TRIP-0200', 'PLANNED'],
      ['50', 'TRIP-0040', 'DRAFT'],
      ['49', 'TRIP-0090', 'DRAFT'],
    ])
    expect(Object.values(trips.groups).flat().map(({ id }) => id)).not.toContain('48')
    // Giao xong gần nhất trước; chuyến chưa tới kho và chuyến đã huỷ không hiện
    expect(trips.groups.recent.map(({ id, completedAt }) => [id, completedAt])).toEqual([
      ['46', '2026-10-16T11:00:00+07:00'],
      ['45', '2026-10-15T17:00:00+07:00'],
    ])
  })

  test('tên chuyến của backend hiện trên thẻ; chuyến chưa đặt tên hoặc tên toàn khoảng trắng thì để trống', async () => {
    const trip = (tripId: number, tripName: string | null) => ({ ...TRIP, tripId, tripCode: `TRIP-00${tripId}`, tripName })
    const { driver } = backend({
      'GET /api/driver/trips': () => ok([trip(41, 'Tuyến Biên Hoà - Vũng Tàu'), trip(42, '   '), trip(43, null), { ...TRIP, tripId: 44, tripCode: 'TRIP-0044' }]),
    })
    const trips = await driver.fetchMyTrips()
    expect(trips.groups.inTransit.map(({ id, name }) => [id, name])).toEqual([
      ['41', 'Tuyến Biên Hoà - Vũng Tàu'],
      ['42', undefined],
      ['43', undefined],
      ['44', undefined],
    ])
  })

  test('chỉ còn chuyến đã giao: danh sách không đọc lại theo nhịp', async () => {
    const { driver } = backend({ 'GET /api/driver/trips': () => ok([{ ...TRIP, status: 'DELIVERED', completedAt: '2026-10-16T11:00:00' }]) })
    expect((await driver.fetchMyTrips()).refreshMs).toBeNull()
  })

  test('chưa có người đăng nhập: không gọi backend (thiếu mã tài xế backend trả chuyến của mọi người)', async () => {
    const { driver, calls } = backend(onTrip(), { id: null })
    expect((await failure(() => driver.fetchMyTrips())).code).toBe('UNAUTHENTICATED')
    expect(calls).toHaveLength(0)
  })

  test('màn điểm giao: giờ đến của máy chủ là đã đến, kiện theo thứ tự dỡ, mã đầu dòng là mã in trên nhãn', async () => {
    const { driver } = backend(onTrip())
    const screen = await driver.fetchTripScreen('41')
    expect(screen).toMatchObject({ kind: 'stop', trip: { id: '41', code: 'TRIP-0041' } })
    const stop = stopOf(screen)
    expect(stop).toMatchObject({
      mode: 'delivering',
      arrived: true,
      arrivedAt: '2026-10-16T09:15:00+07:00',
      stop: { number: 2, ref: '902', name: 'Điện máy Xanh Biên Hoà', address: '12 Phạm Văn Thuận, Biên Hoà' },
      stopCount: 3,
      total: 2,
      doneCount: 0,
      remaining: 2,
      verifiable: 2,
      pendingConfirms: 0,
    })
    expect(stop.stops.map(({ number, done }) => [number, done])).toEqual([
      [1, true],
      [2, false],
      [3, false],
    ])
    expect(stop.items.map(({ id, label, name, weightKg, unloadingOrder }) => [id, label, name, weightKg, unloadingOrder])).toEqual([
      ['7001', 'DMX-01', 'Tủ lạnh 180L', 62.5, 1],
      ['7002', '7002', '7002', undefined, 2],
    ])
    expect(stop.routeMap).toBeUndefined()
  })

  test('chỉ giờ đến mới là đã đến: trạng thái ARRIVED không kèm giờ vẫn là chưa đến', async () => {
    const { driver } = backend(onTrip({ 'GET /api/driver/trips/41/current-stop': () => ok({ ...STOP, actualArrival: null, status: 'ARRIVED' }) }))
    expect(stopOf(await driver.fetchTripScreen('41'))).toMatchObject({ arrived: false, arrivedAt: undefined })
  })

  test('tiến độ từng kiện đọc từ máy chủ: đã dỡ, xác nhận tay chờ / đã duyệt / bị từ chối, sự cố, khách từ chối', async () => {
    const pkg = (packageId: number, extra: Record<string, unknown>) => ({ packageId, packageName: `Kiện ${packageId}`, weight: 5, unloadOrder: null, ...extra })
    const packages = [
      pkg(1, { unloaded: true }),
      pkg(2, { unloaded: true, manualStatus: 'PENDING', manualReason: 'LABEL_DAMAGED' }),
      pkg(3, { unloaded: true, manualStatus: 'APPROVED' }),
      pkg(4, { unloaded: false, manualStatus: 'REJECTED', manualRejectReason: 'Kiện vẫn còn trên xe' }),
      pkg(5, { unloaded: false, issueKind: 'REFUSED' }),
      pkg(6, { unloaded: false, issueKind: 'DAMAGED' }),
      pkg(7, {}),
    ]
    const { driver } = backend(onTrip({ 'GET /api/driver/trips/41/current-stop': () => ok({ ...STOP, packages }) }))
    const stop = stopOf(await driver.fetchTripScreen('41'))
    expect(stop.items.map(({ id, unloaded, via, rejectedReason, issueKind, returned, unloadingOrder }) => [id, unloaded, via, rejectedReason, issueKind, returned, unloadingOrder])).toEqual([
      ['1', true, undefined, undefined, undefined, false, 1],
      ['2', true, 'MANUAL_PENDING', undefined, undefined, false, 2],
      ['3', true, 'MANUAL_APPROVED', undefined, undefined, false, 3],
      ['4', false, undefined, 'Kiện vẫn còn trên xe', undefined, false, 4],
      ['5', false, undefined, undefined, 'refused', true, 5],
      ['6', false, undefined, undefined, 'damaged', false, 6],
      ['7', false, undefined, undefined, undefined, false, 7],
    ])
    expect(stop).toMatchObject({ doneCount: 3, remaining: 2, verifiable: 3, pendingConfirms: 1, issueCount: 2 })
    expect(stop.completion).toMatchObject({ delivered: 3, issues: 2, nextKnown: false })
    expect(stop.completion.returned.map(({ id }) => id)).toEqual(['4', '5', '6', '7'])
  })

  test('plan active: vẽ polyline Goong, toạ độ điểm hiện tại, bước chỉ dẫn của leg đang đi', async () => {
    const start = { lat: 10.78, lng: 106.7 }
    const mid = { lat: 10.85, lng: 106.77 }
    const end = { lat: 10.95, lng: 106.82 }
    const { driver } = backend(
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
  })

  test('chỉ mở chuyến của mình đang vận chuyển: chuyến lạ, chưa xuất phát hay đã huỷ thì không đọc điểm hiện tại', async () => {
    const { driver, calls } = backend({
      ...onTrip(),
      'GET /api/driver/trips': () => ok([{ ...TRIP, status: 'LOADING' }, { ...TRIP, tripId: 48, tripCode: 'TRIP-0048', status: 'CANCELLED' }]),
    })
    for (const tripId of ['99', '41', '48']) {
      expect(await failure(() => driver.fetchTripScreen(tripId))).toMatchObject({ code: 'TRIP_NOT_IN_TRANSIT' })
    }
    expect(calls.some((call) => call.path.endsWith('/current-stop'))).toBe(false)
  })

  test('chuyến đã giao: mở màn tổng kết (máy chủ chưa có số liệu tổng kết)', async () => {
    const { driver } = backend(onTrip())
    expect(await driver.fetchTripScreen('42')).toEqual({ kind: 'completed', trip: { id: '42', code: 'TRIP-0042', name: undefined }, summary: undefined })
  })

  test.each([null, 'NO_PENDING_DELIVERY_STOP'])('chuyến đang vận chuyển không còn điểm chưa hoàn tất (404, mã %s): màn không có điểm giao', async (code) => {
    const { driver } = backend(onTrip({ 'GET /api/driver/trips/41/current-stop': () => fail(404, code) }))
    expect(await driver.fetchTripScreen('41')).toEqual({ kind: 'noStops', trip: { id: '41', code: 'TRIP-0041', name: undefined } })
  })

  test('chuyến vừa bị xoá ở máy chủ (404 TRIP_NOT_FOUND): như chuyến không còn chạy', async () => {
    const { driver } = backend(onTrip({ 'GET /api/driver/trips/41/current-stop': () => fail(404, 'TRIP_NOT_FOUND') }))
    expect(await failure(() => driver.fetchTripScreen('41'))).toMatchObject({ code: 'TRIP_NOT_IN_TRANSIT', params: { tripId: 'TRIP-0041' } })
  })
})

describe('httpDriverApi: xuất phát, đã đến, vị trí, sự cố trên đường', () => {
  test('xuất phát: gọi start theo mã chuyến; kho chưa xếp xong (409) thì nói đúng lý do', async () => {
    let loaded = false
    const { driver, calls } = backend(onTrip({ 'POST /api/driver/trips/43/start': () => (loaded ? ok({ tripId: 43 }) : fail(409, 'LOADING_NOT_COMPLETED')) }))
    expect(await failure(() => driver.startDelivery('43'))).toMatchObject({ code: 'LOADING_NOT_COMPLETED', status: 409 })
    loaded = true
    await driver.startDelivery('43')
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/api/driver/trips/43/start' })
  })

  test('đã đến: gọi arrive theo mã điểm; đã báo đến từ trước (409 DELIVERY_STOP_ALREADY_ARRIVED) coi như đã đến', async () => {
    let reply = ok({ stopId: 902 })
    const { driver, calls } = backend(onTrip({ 'POST /api/driver/stops/902/arrive': () => reply }))
    await driver.arriveAtStop('41', STOP_KEY)
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/api/driver/stops/902/arrive' })
    reply = fail(409, 'DELIVERY_STOP_ALREADY_ARRIVED')
    await expect(driver.arriveAtStop('41', STOP_KEY)).resolves.toBeUndefined()
  })

  test('đã đến bị từ chối: chuyến không còn chạy thì nói mã chuyến; mã khác giữ nguyên', async () => {
    let reply = fail(400, 'GPS_TRIP_NOT_IN_TRANSIT')
    const { driver } = backend(onTrip({ 'POST /api/driver/stops/902/arrive': () => reply }))
    await driver.fetchMyTrips()
    expect(await failure(() => driver.arriveAtStop('41', STOP_KEY))).toMatchObject({ code: 'TRIP_NOT_IN_TRANSIT', params: { tripId: 'TRIP-0041' } })
    reply = fail(409, 'DELIVERY_STOP_NOT_CURRENT')
    expect(await failure(() => driver.arriveAtStop('41', STOP_KEY))).toMatchObject({ code: 'DELIVERY_STOP_NOT_CURRENT' })
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
    expect(await failure(() => driver.postLocation('41', { lat: 10.95, lng: 106.82 }))).toMatchObject({
      code: 'TRIP_NOT_IN_TRANSIT',
      params: { tripId: 'TRIP-0041' },
    })
  })

  test.each([
    [400, 'GPS_TRIP_NOT_IN_TRANSIT'],
    [404, 'TRIP_NOT_FOUND'],
  ])('gửi vị trí bị từ chối kèm mã (%i %s): cùng câu chuyến không còn chạy', async (status, code) => {
    const { driver } = backend(onTrip({ 'POST /api/driver/location': () => fail(status, code) }))
    await driver.fetchMyTrips()
    expect(await failure(() => driver.postLocation('41', { lat: 10.95, lng: 106.82 }))).toMatchObject({ code: 'TRIP_NOT_IN_TRANSIT', status })
  })

  test('sự cố trên đường: gửi đúng thân yêu cầu kèm mã tài xế', async () => {
    const { driver, calls } = backend(onTrip({ 'POST /api/driver/trips/41/exceptions': () => ok({ id: '17' }) }))
    await expect(driver.reportTripException('41', { type: 'TRAFFIC', description: 'Kẹt xe cầu Đồng Nai', delayMinutes: 30 })).resolves.toEqual({ id: '17' })
    expect(calls.at(-1)).toMatchObject({
      query: { driverId: '15' },
      body: { type: 'TRAFFIC', description: 'Kẹt xe cầu Đồng Nai', delayMinutes: 30 },
    })
  })

  test('việc máy chủ làm được bật ở capabilities; bật GPS không gọi mạng', async () => {
    const { driver, calls } = backend(onTrip())
    expect(driver.capabilities).toEqual({
      depart: false,
      departFromList: true,
      arrive: true,
      manualConfirm: true,
      deliveryIssues: true,
      tripExceptions: true,
      gps: true,
      notifications: true,
      payroll: true,
      gpsLocalOnly: false,
      tripClaims: true,
    })
    await expect(driver.setDriverGps('41', true)).resolves.toBeUndefined()
    expect(calls).toHaveLength(0)
  })

  test('đổi người đăng nhập: quên chuyến và điểm đã đọc của người trước', async () => {
    const { driver, user } = backend(onTrip({ 'POST /api/driver/stops/902/complete': () => fail(400) }))
    await driver.fetchTripScreen('41')
    expect(await failure(() => driver.completeStop('41', STOP_KEY))).toMatchObject({ params: { name: 'Điện máy Xanh Biên Hoà' } })
    user.id = '16'
    // Người mới chưa đọc điểm nào: câu lỗi chỉ còn số điểm, không mang tên điểm người trước đã đọc
    expect(await failure(() => driver.completeStop('41', STOP_KEY))).toMatchObject({ code: 'STOP_NOT_COMPLETABLE', params: { name: '2' } })
  })

  test('fetchTripDetail: gọi GET /api/driver/trips/{id}/detail và map đúng dto sang DriverTripDetail', async () => {
    const detailDto = {
      tripId: 41,
      tripCode: 'TRIP-0041',
      tripName: 'Chuyến giao miền Đông',
      status: 'IN_TRANSIT',
      departureTime: '2026-10-16T07:30:00',
      depotName: 'Kho Long Bình',
      depotAddress: 'Biên Hoà, Đồng Nai',
      depotLat: 10.929,
      depotLng: 106.874,
      vehicleId: 101,
      vehicleName: '51C-123.45',
      licensePlate: '51C-123.45',
      maxPayloadKg: 5000,
      vehicleTypeName: 'Xe tải 5 tấn',
      totalStops: 1,
      totalPackages: 1,
      totalWeightKg: 25,
      dispatcherName: 'Nguyễn Thanh Tùng',
      dispatcherPhone: '0901234567',
      totalDistanceMeters: 45000,
      totalDurationSeconds: 3600,
      stops: [
        {
          stopId: 902,
          stopSequence: 1,
          stopName: 'Điện máy Xanh Biên Hoà',
          address: 'Biên Hoà',
          lat: 10.95,
          lng: 106.82,
          contactName: 'Anh Bình',
          contactPhone: '0901234567',
          status: 'PENDING',
          packages: [
            {
              packageId: 501,
              packageCode: 'PKG-001',
              trackingBarcode: 'PKG-001',
              packageName: 'Thùng tivi',
              weightKg: 25,
              status: 'PENDING',
              unloadOrder: 1,
            },
          ],
        },
      ],
    }

    const { driver, calls } = backend({
      'GET /api/driver/trips/41/detail': () => ok(detailDto),
    })

    const detail = await driver.fetchTripDetail('41')
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/driver/trips/41/detail' })
    expect(detail).toMatchObject({
      id: '41',
      code: 'TRIP-0041',
      name: 'Chuyến giao miền Đông',
      status: 'IN_TRANSIT',
      depot: { name: 'Kho Long Bình', address: 'Biên Hoà, Đồng Nai' },
      vehicle: { licensePlate: '51C-123.45', maxPayloadKg: 5000 },
      dispatcher: { name: 'Nguyễn Thanh Tùng', phone: '0901234567' },
      totalDistanceMeters: 45000,
      totalDurationSeconds: 3600,
      stops: [
        {
          id: '902',
          number: 1,
          name: 'Điện máy Xanh Biên Hoà',
          contactName: 'Anh Bình',
          contactPhone: '0901234567',
          packages: [{ code: 'PKG-001', weightKg: 25 }],
        },
      ],
    })
  })
})

describe('httpDriverApi: phiếu xin chuyến (open-trips, claim, cancel)', () => {
  const OPEN_TRIP_DTO = {
    id: 101,
    tripId: 101,
    tripCode: 'TRIP-0101',
    tripName: 'Chuyến giao Biên Hoà',
    departureTime: '2026-10-20T08:00:00',
    originWarehouse: 'Kho Tổng Sóng Thần',
    stopCount: 4,
    myClaimStatus: null,
    myRejectReason: null,
  }

  const CLAIM_DTO = {
    id: 201,
    tripId: 101,
    driverUserId: 15,
    driverName: 'Nguyễn Văn Tài',
    driverPhone: '0901234567',
    status: 'PENDING' as const,
    note: 'Tôi muốn nhận chuyến này',
    createdAt: '2026-10-18T10:00:00',
    decidedById: null,
    decidedByName: null,
    decidedAt: null,
    rejectReason: null,
  }

  test('fetchOpenTrips: GET /api/driver/open-trips, đổi DTO sang OpenTrip của app', async () => {
    const { driver, calls } = backend({
      'GET /api/driver/open-trips': () => ok([OPEN_TRIP_DTO]),
    })
    const list = await (driver as any).fetchOpenTrips()
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/driver/open-trips' })
    expect(list).toEqual([
      {
        id: '101',
        tripId: '101',
        tripCode: 'TRIP-0101',
        tripName: 'Chuyến giao Biên Hoà',
        departureTime: '2026-10-20T08:00:00+07:00',
        originWarehouse: 'Kho Tổng Sóng Thần',
        stopCount: 4,
        myClaimStatus: null,
        myRejectReason: null,
      },
    ])
  })

  test('claimTrip: POST /api/driver/trips/{tripId}/claim, gửi note, đổi DTO sang DriverTripClaim', async () => {
    const { driver, calls } = backend({
      'POST /api/driver/trips/101/claim': (call) => {
        expect(call.body).toEqual({ note: 'Xin nhận' })
        return ok(CLAIM_DTO)
      },
    })
    const claim = await (driver as any).claimTrip('101', 'Xin nhận')
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/driver/trips/101/claim' })
    expect(claim).toMatchObject({
      id: '201',
      tripId: '101',
      driverUserId: '15',
      status: 'PENDING',
      note: 'Tôi muốn nhận chuyến này',
      createdAt: '2026-10-18T10:00:00+07:00',
      decidedAt: null,
    })
  })

  test('claimTrip đổi ngày giờ có dấu cách sang ISO múi giờ Việt Nam', async () => {
    const { driver } = backend({
      'POST /api/driver/trips/101/claim': () =>
        ok({ ...CLAIM_DTO, createdAt: '2026-11-20 21:05:33', decidedAt: '2026-11-20 21:10:00' }),
    })

    const claim = await (driver as any).claimTrip('101')

    expect(claim.createdAt).toBe('2026-11-20T21:05:33+07:00')
    expect(claim.decidedAt).toBe('2026-11-20T21:10:00+07:00')
  })

  test('cancelClaim: POST /api/driver/trips/{tripId}/claim/cancel', async () => {
    const { driver, calls } = backend({
      'POST /api/driver/trips/101/claim/cancel': () => ok({ ...CLAIM_DTO, status: 'CANCELLED' }),
    })
    const claim = await (driver as any).cancelClaim('101')
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/driver/trips/101/claim/cancel' })
    expect(claim.status).toBe('CANCELLED')
  })

  test('mã lỗi TRIP_CLAIM_TRIP_TAKEN: giữ nguyên mã và status 409', async () => {
    const { driver } = backend({
      'POST /api/driver/trips/101/claim': () => fail(409, 'TRIP_CLAIM_TRIP_TAKEN'),
    })
    const err = await failure(() => (driver as any).claimTrip('101'))
    expect(err.code).toBe('TRIP_CLAIM_TRIP_TAKEN')
    expect(err.status).toBe(409)
  })
})

