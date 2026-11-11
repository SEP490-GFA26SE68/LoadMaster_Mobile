import { fail, failure, fakeDriverBackend, ok, type Routes } from '@/test/driver-backend'

import { httpMonitoringApi } from './monitoring-http'

/* Nguồn backend của màn giám sát trên máy chủ giả: đổi DTO, mã lỗi không kèm mã của backend và việc máy chủ chưa có. */

const BOARD = {
  trips: [
    {
      tripId: 'TRIP-0041',
      name: 'TRIP-0041',
      vehicleName: 'Xe tải 5 tấn · 51C-123.45',
      driverName: 'Trần Văn Dũng',
      depot: { name: 'Kho Long Bình', lat: 10.9, lng: 106.9 },
      stops: [
        { id: 902, number: 1, name: 'Điện máy Xanh Biên Hoà', lat: 10.95, lng: 106.82, arrivedAt: '2026-10-16T09:15:00' },
        { id: 903, number: 2, name: 'Co.op Thủ Đức', lat: 10.85, lng: 106.77 },
      ],
    },
  ],
  userNames: { '15': 'Trần Văn Dũng' },
}

const EXCEPTION = {
  id: '7',
  tripId: 'TRIP-0041',
  type: 'TRAFFIC',
  description: 'Kẹt xe cầu Đồng Nai',
  delayMinutes: 20,
  status: 'OPEN',
  reportedAt: '2026-10-16T09:30:00',
}

const LIVE = {
  tripId: 'TRIP-0041',
  location: { lat: 10.93, lng: 106.81, speedKmh: 41.6, heading: -90, recordedAt: '2026-10-16T09:40:00', source: 'GPS' },
  stops: [{ stopId: 903, number: 2, eta: '2026-10-16T10:30:00', deadline: '2026-10-16T11:00:00', deadlineStatus: 'AT_RISK' }],
  alerts: [],
  exceptions: [EXCEPTION],
  reroute: null,
  refreshMs: 30000,
  isMockResult: false,
}

function monitoring(routes: Routes) {
  const { calls, client } = fakeDriverBackend(routes)
  return { calls, api: httpMonitoringApi({ client: () => client }) }
}

describe('httpMonitoringApi', () => {
  test('chuyến đang chạy: đầu chuyến lấy từ bảng, giờ đến của máy chủ không phải MOCK RESULT', async () => {
    const { api } = monitoring({
      'GET /api/dispatcher/dashboard': () => ok(BOARD),
      'GET /api/trips/trip-0041/monitoring': () => ok(LIVE),
    })
    const live = await api.fetchLiveTrip('trip-0041')
    expect(live.running).toBe(true)
    expect(live.trip).toEqual({
      tripId: 'TRIP-0041',
      name: '',
      vehicleName: 'Xe tải 5 tấn · 51C-123.45',
      driverName: 'Trần Văn Dũng',
      depot: { name: 'Kho Long Bình', lat: 10.9, lng: 106.9 },
      stops: [
        { id: '902', number: 1, name: 'Điện máy Xanh Biên Hoà', lat: 10.95, lng: 106.82, arrivedAt: '2026-10-16T02:15:00.000Z' },
        { id: '903', number: 2, name: 'Co.op Thủ Đức', lat: 10.85, lng: 106.77 },
      ],
    })
    expect(live.userNames).toEqual({ '15': 'Trần Văn Dũng' })
    expect(live.live.isMockResult).toBe(false)
    expect(live.live.location).toEqual({
      lat: 10.93,
      lng: 106.81,
      speedKmh: 42,
      heading: 270,
      recordedAt: '2026-10-16T02:40:00.000Z',
      source: 'GPS',
    })
    expect(live.live.stops).toEqual([
      { stopId: '903', number: 2, eta: '2026-10-16T03:30:00.000Z', deadline: '2026-10-16T04:00:00.000Z', deadlineStatus: 'AT_RISK' },
    ])
    expect(live.live.exceptions.map((item) => [item.id, item.status, item.delayMinutes])).toEqual([['7', 'OPEN', 20]])
  })

  test('chuyến đã thôi chạy: đầu chuyến đọc từ chi tiết chuyến của máy chủ', async () => {
    const { calls, api } = monitoring({
      'GET /api/dispatcher/dashboard': () => ok({ trips: [], userNames: {} }),
      'GET /api/trips/TRIP-0042/monitoring': () => ok({ ...LIVE, tripId: 'TRIP-0042', location: null, refreshMs: null }),
      'GET /api/trips': () => ok([{ id: 42, tripCode: 'TRIP-0042', status: 'DELIVERED' }]),
      'GET /api/trips/42/detail': () =>
        ok({
          trip: { id: 42, tripCode: 'TRIP-0042', tripName: 'Tuyến Thủ Đức', status: 'DELIVERED', vehicleName: 'Xe 2', driverName: null },
          stops: [{ id: 5, stopSequence: 1, stopName: 'Co.op Thủ Đức', status: 'COMPLETED', actualArrival: '2026-10-15T10:00:00' }],
        }),
    })
    const live = await api.fetchLiveTrip('TRIP-0042')
    expect(calls.find((call) => call.path === '/api/trips')?.query).toMatchObject({ search: 'TRIP-0042' })
    expect(live.running).toBe(false)
    expect(live.live.refreshMs).toBeNull()
    expect(live.trip).toEqual({
      tripId: 'TRIP-0042',
      name: 'Tuyến Thủ Đức',
      vehicleName: 'Xe 2',
      driverName: null,
      stops: [
        { id: '5', number: 1, name: 'Co.op Thủ Đức', arrivedAt: '2026-10-15T03:00:00.000Z', completedAt: '2026-10-15T03:00:00.000Z' },
      ],
    })
  })

  test('giám sát một chuyến không có (404 không mã) là TRIP_NOT_FOUND', async () => {
    const { api } = monitoring({ 'GET /api/dispatcher/dashboard': () => ok(BOARD) })
    expect((await failure(() => api.fetchLiveTrip('TRIP-9999'))).code).toBe('TRIP_NOT_FOUND')
  })

  test('báo sự cố gửi đúng thân lệnh; 400 không mã là chuyến không còn đang vận chuyển', async () => {
    const reply = { current: ok({ ...EXCEPTION, id: '8' }) }
    const { calls, api } = monitoring({ 'POST /api/trips/TRIP-0041/exceptions': () => reply.current })
    const input = { type: 'ACCIDENT' as const, description: 'Va quẹt nhẹ', delayMinutes: 30 }
    expect(await api.reportTripException('TRIP-0041', input)).toEqual({ id: '8' })
    expect(calls[0]?.body).toEqual(input)
    reply.current = fail(400)
    expect((await failure(() => api.reportTripException('TRIP-0041', input))).code).toBe('GPS_TRIP_NOT_IN_TRANSIT')
  })

  test('đánh dấu đã xử lý gửi ghi chú khi có; sự cố không còn là TRIP_EXCEPTION_NOT_FOUND; lỗi kèm mã giữ mã', async () => {
    const reply = { current: ok({ ...EXCEPTION, status: 'RESOLVED' }) }
    const { calls, api } = monitoring({ 'POST /api/trips/TRIP-0041/exceptions/7/resolve': () => reply.current })
    await api.resolveTripException('TRIP-0041', '7', 'Đã thông đường')
    await api.resolveTripException('TRIP-0041', '7', undefined)
    expect(calls.map((call) => call.body)).toEqual([{ note: 'Đã thông đường' }, {}])
    reply.current = fail(404)
    expect((await failure(() => api.resolveTripException('TRIP-0041', '7', undefined))).code).toBe('TRIP_EXCEPTION_NOT_FOUND')
    reply.current = fail(409, 'EXCEPTION_STATUS_INVALID')
    expect((await failure(() => api.resolveTripException('TRIP-0041', '7', undefined))).code).toBe('EXCEPTION_STATUS_INVALID')
  })

  test('chuyển quản lý theo mã sự cố', async () => {
    const { calls, api } = monitoring({ 'POST /api/trips/TRIP-0041/exceptions/7/escalate': () => ok({ ...EXCEPTION, status: 'ESCALATED' }) })
    await api.escalateTripException('TRIP-0041', '7')
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual(['POST /api/trips/TRIP-0041/exceptions/7/escalate'])
  })

  test('tuyến thay thế: đề xuất theo máy chủ, xác nhận sai lựa chọn là INVALID_REROUTE_INDEX', async () => {
    const option = { index: 0, route: 'BYPASS', distanceKm: 12.4, durationMinutes: 25, extraMs: 300000, eta: '2026-10-16T10:40:00' }
    const reply = { current: ok({ ...option, stopNumber: 2, confirmedAt: '2026-10-16T09:45:00', confirmedBy: '3' }) }
    const { api } = monitoring({
      'POST /api/trips/TRIP-0041/reroute': () =>
        ok({ tripId: 'TRIP-0041', requestedAt: '2026-10-16T09:44:00', stopId: 903, stopNumber: 2, options: [option], isMockResult: true }),
      'POST /api/trips/TRIP-0041/reroute/0/confirm': () => reply.current,
    })
    const proposal = await api.requestReroute('TRIP-0041')
    expect(proposal).toMatchObject({ stopId: '903', stopNumber: 2, isMockResult: true })
    expect(proposal.options).toEqual([
      { index: 0, route: 'BYPASS', distanceKm: 12.4, durationMinutes: 25, extraMs: 300000, eta: '2026-10-16T03:40:00.000Z' },
    ])
    await api.confirmReroute('TRIP-0041', 0)
    reply.current = fail(400)
    expect((await failure(() => api.confirmReroute('TRIP-0041', 0))).code).toBe('INVALID_REROUTE_INDEX')
  })

  test('tìm tuyến khi không còn điểm chờ giao (404 không mã) là NO_PENDING_DELIVERY_STOP', async () => {
    const { api } = monitoring({ 'POST /api/trips/TRIP-0041/reroute': () => fail(404) })
    expect((await failure(() => api.requestReroute('TRIP-0041'))).code).toBe('NO_PENDING_DELIVERY_STOP')
  })

  test('yêu cầu giao còn gia hạn được: chỉ của chuyến, còn điểm chưa hoàn tất, theo thứ tự điểm', async () => {
    const { calls, api } = monitoring({
      'GET /api/delivery-requirements': () =>
        ok([
          { id: 11, customerName: 'Co.op', deadline: '2026-10-16T11:00:00', tripId: 41, tripCode: 'TRIP-0041' },
          { id: 12, customerName: 'Điện máy Xanh', deadline: '2026-10-16T09:00:00', tripId: 41, tripCode: 'TRIP-0041' },
          { id: 13, customerName: 'Bách Hoá Xanh', deadline: '2026-10-16T12:00:00', tripId: 77, tripCode: 'TRIP-0077' },
        ]),
      'GET /api/trips/41/detail': () =>
        ok({
          stops: [
            { deliveryRequirementId: 12, stopSequence: 1, stopName: 'Điện máy Xanh Biên Hoà', status: 'COMPLETED' },
            { deliveryRequirementId: 11, stopSequence: 2, stopName: 'Co.op Thủ Đức', status: 'PENDING' },
          ],
        }),
    })
    expect(await api.fetchTripRequirements('TRIP-0041')).toEqual([
      { id: '11', destinationName: 'Co.op Thủ Đức', deadline: '2026-10-16T04:00:00.000Z', stopNumber: 2 },
    ])
    expect(calls[0]?.query).toMatchObject({ page: '0', size: '100' })
  })

  test('gia hạn gửi mã số yêu cầu giao và giờ Việt Nam không múi giờ', async () => {
    const { calls, api } = monitoring({
      'POST /api/trips/TRIP-0041/exceptions/7/renegotiate': () => ok({ ...EXCEPTION, status: 'ESCALATED' }),
    })
    const input = { requirementId: '11', deadline: '2026-10-16T08:30:00.000Z', contactNote: 'Đã gọi khách, đồng ý dời sang chiều' }
    await api.renegotiateDeadline('TRIP-0041', '7', input)
    expect(calls[0]?.body).toEqual({ requirementId: 11, newDeadline: '2026-10-16T15:30:00', contactNote: input.contactNote })
    expect((await failure(() => api.renegotiateDeadline('TRIP-0041', '7', { ...input, requirementId: 'REQ-1' }))).code).toBe(
      'DELIVERY_REQUIREMENT_NOT_FOUND',
    )
  })

  test('nhận hàng dọc đường và chuông văn phòng chưa có ở máy chủ: ẩn và từ chối NOT_SUPPORTED, không gọi mạng', async () => {
    const { calls, api } = monitoring({})
    expect(api.capabilities).toEqual({ exceptions: true, reroute: true, escalation: true, pickups: false, notifications: false })
    expect((await failure(() => api.fetchPickupRows('TRIP-0041'))).code).toBe('NOT_SUPPORTED')
    expect((await failure(() => api.fetchNotifications())).code).toBe('NOT_SUPPORTED')
    expect(calls).toEqual([])
  })
})
