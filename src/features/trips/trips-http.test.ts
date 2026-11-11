import { fail, failure, fakeDriverBackend, ok, type Routes } from '@/test/driver-backend'

import { httpTripsApi } from './trips-http'

/* Nguồn backend của màn chuyến trên máy chủ giả: danh sách đủ mọi trang, chi tiết theo mã chuyến, xác nhận tay và kiện kho báo thiếu. */

const TRIP = {
  id: 41,
  tripCode: 'TRIP-0041',
  tripName: 'Tuyến Biên Hoà',
  vehicleId: 3,
  vehicleName: 'Xe tải 5 tấn',
  licensePlate: '51C-123.45',
  driverId: 15,
  driverName: 'Trần Văn Dũng',
  departureTime: '2026-10-16T07:30:00.123456',
  originName: 'Kho Long Bình',
  originAddress: 'KCN Long Bình, Biên Hoà',
  originLatitude: '10.9',
  originLongitude: 106.9,
  status: 'LOADING',
  stopCount: 2,
  packageCount: 14,
  hasActiveRoutePlan: true,
}

function trips(routes: Routes) {
  const { calls, client } = fakeDriverBackend(routes)
  return { calls, api: httpTripsApi({ client: () => client }) }
}

describe('httpTripsApi', () => {
  test('danh sách đọc đủ mọi trang; máy chủ không trả phương án hay tiến độ kho nên không có dòng phụ', async () => {
    const page = Array.from({ length: 100 }, (_, index) => ({ ...TRIP, id: 1000 + index, tripCode: `TRIP-${1000 + index}` }))
    const { calls, api } = trips({
      'GET /api/trips': (call) => ok(call.query.page === '0' ? page : [{ ...TRIP, departureTime: null, tripCode: null, tripName: null }]),
    })
    const rows = await api.fetchTrips()
    expect(calls.map((call) => call.query.page)).toEqual(['0', '1'])
    expect(calls[0]?.query).toMatchObject({ size: '100', sortBy: 'departureTime', sortDir: 'desc' })
    expect(rows).toHaveLength(101)
    expect(rows[0]).toEqual({
      id: 'TRIP-1000',
      name: 'Tuyến Biên Hoà',
      scheduledDate: '2026-10-16',
      vehicleId: '3',
      vehicleName: 'Xe tải 5 tấn · 51C-123.45',
      driverId: '15',
      driverName: 'Trần Văn Dũng',
      route: '',
      packageCount: 14,
      stopCount: 2,
      volumePercent: null,
      hasActiveRoutePlan: true,
      status: 'LOADING',
      sub: null,
      extraSub: null,
      phase: 'loading',
    })
    // Chuyến cũ chưa có mã, tên, giờ xuất phát: mã số làm mã, ngày chạy rỗng
    expect(rows[100]).toMatchObject({ id: '41', name: '41', scheduledDate: '' })
    expect(api.capabilities).toEqual({ manualConfirms: true, shortages: true, requirements: false, planStatus: false })
  })

  test('trạng thái chuyến ngoài hợp đồng là lỗi của máy chủ', async () => {
    const { api } = trips({ 'GET /api/trips': () => ok([{ ...TRIP, status: 'ARCHIVED' }]) })
    expect((await failure(() => api.fetchTrips())).code).toBe('SERVER_ERROR')
  })

  test('chi tiết tìm mã số theo mã chuyến rồi đọc chi tiết; điểm theo thứ tự đi', async () => {
    const { calls, api } = trips({
      'GET /api/trips': () => ok([{ ...TRIP, id: 40, tripCode: 'TRIP-00410' }, TRIP]),
      'GET /api/trips/41/detail': () =>
        ok({
          trip: TRIP,
          stops: [
            { id: 903, stopSequence: 2, stopName: 'Co.op Thủ Đức', address: '1 Võ Văn Ngân', latitude: 0, longitude: 0, status: 'PENDING' },
            {
              id: 902,
              deliveryRequirementId: 11,
              stopSequence: 1,
              stopName: 'Điện máy Xanh',
              address: '12 Phạm Văn Thuận',
              latitude: '10.95',
              longitude: '106.82',
              status: 'ARRIVED',
              plannedArrival: '2026-10-16T09:00:00',
              actualArrival: '2026-10-16T09:15:00',
              deadline: '2026-10-16T11:00:00',
              stopType: 'DELIVERY',
            },
          ],
        }),
    })
    const detail = await api.fetchTripDetail('trip-0041')
    expect(calls[0]?.query).toMatchObject({ search: 'trip-0041' })
    expect(detail).toEqual({
      kind: 'server',
      id: 'TRIP-0041',
      name: 'Tuyến Biên Hoà',
      status: 'LOADING',
      phase: 'loading',
      departureAt: '2026-10-16T00:30:00.123Z',
      vehicleName: 'Xe tải 5 tấn · 51C-123.45',
      driverName: 'Trần Văn Dũng',
      depot: { name: 'Kho Long Bình', address: 'KCN Long Bình, Biên Hoà', lat: 10.9, lng: 106.9 },
      packageCount: 14,
      stops: [
        {
          id: '902',
          number: 1,
          name: 'Điện máy Xanh',
          address: '12 Phạm Văn Thuận',
          lat: 10.95,
          lng: 106.82,
          kind: 'DELIVERY',
          status: 'ARRIVED',
          requirementId: '11',
          plannedArrival: '2026-10-16T02:00:00.000Z',
          actualArrival: '2026-10-16T02:15:00.000Z',
          deadline: '2026-10-16T04:00:00.000Z',
        },
        { id: '903', number: 2, name: 'Co.op Thủ Đức', address: '1 Võ Văn Ngân', kind: 'DELIVERY', status: 'PENDING' },
      ],
    })
  })

  test('mã chuyến không tìm thấy là TRIP_NOT_FOUND; mã số đọc thẳng chi tiết', async () => {
    const { calls, api } = trips({ 'GET /api/trips': () => ok([]), 'GET /api/trips/41/detail': () => fail(404) })
    expect((await failure(() => api.fetchTripDetail('TRIP-9999'))).code).toBe('TRIP_NOT_FOUND')
    expect((await failure(() => api.fetchTripDetail('41'))).code).toBe('TRIP_NOT_FOUND')
    expect(calls.map((call) => call.path)).toEqual(['/api/trips', '/api/trips', '/api/trips/41/detail'])
  })

  test('xác nhận tay chờ duyệt: đọc, duyệt, từ chối kèm lý do; không còn là MANUAL_CONFIRM_NOT_FOUND', async () => {
    const approve = { current: ok({}) }
    const { calls, api } = trips({
      'GET /api/trips/TRIP-0041/manual-confirmations': () =>
        ok([
          {
            id: 5,
            stopSequence: 3,
            packageId: 7001,
            packageCode: null,
            trackingBarcode: 'LM-AB12',
            packageName: 'Tủ lạnh 180L',
            reason: 'LABEL_DAMAGED',
            note: '  ',
            requestedByName: 'Lê Thị Hoa',
            requestedAt: '2026-10-16T08:00:00',
            step: 'LOADING',
          },
        ]),
      'POST /api/trips/TRIP-0041/manual-confirmations/5/approve': () => approve.current,
      'POST /api/trips/TRIP-0041/manual-confirmations/5/reject': () => ok({}),
    })
    expect(await api.fetchManualConfirmations('TRIP-0041')).toEqual([
      {
        id: '5',
        context: 'LOADING',
        packageInstanceId: 'LM-AB12',
        packageName: 'Tủ lạnh 180L',
        reason: 'LABEL_DAMAGED',
        at: '2026-10-16T01:00:00.000Z',
        senderName: 'Lê Thị Hoa',
      },
    ])
    await api.approveManualConfirmation('TRIP-0041', '5')
    await api.rejectManualConfirmation('TRIP-0041', '5', 'Sai kiện')
    expect(calls.at(-1)?.body).toEqual({ reason: 'Sai kiện' })
    approve.current = fail(404)
    expect((await failure(() => api.approveManualConfirmation('TRIP-0041', '5'))).code).toBe('MANUAL_CONFIRM_NOT_FOUND')
    approve.current = fail(409, 'MANUAL_CONFIRM_NOT_PENDING')
    expect((await failure(() => api.approveManualConfirmation('TRIP-0041', '5'))).code).toBe('MANUAL_CONFIRM_NOT_PENDING')
  })

  test('kiện kho báo thiếu: quyết theo mã của lần báo', async () => {
    const resolve = { current: ok({}) }
    const { calls, api } = trips({
      'GET /api/trips/TRIP-0041/staging-shortages': () =>
        ok([{ id: 21, packageId: 7002, packageCode: 'DMX-02', packageName: 'Máy giặt', stopSequence: 2, reportedByName: null, reportedAt: '2026-10-16T07:50:00' }]),
      'POST /api/trips/TRIP-0041/staging-shortages/21/resolve': () => resolve.current,
    })
    expect(await api.fetchStagingShortages('TRIP-0041')).toEqual([
      {
        id: '21',
        packageInstanceId: 'DMX-02',
        packageName: 'Máy giặt',
        packageCode: 'DMX-02',
        stopNumber: 2,
        at: '2026-10-16T00:50:00.000Z',
        reporterName: null,
      },
    ])
    await api.resolveStagingShortage('TRIP-0041', '21', 'DROP')
    expect(calls.at(-1)?.body).toEqual({ decision: 'DROP' })
    resolve.current = fail(404)
    expect((await failure(() => api.resolveStagingShortage('TRIP-0041', '21', 'KEEP_SEARCHING'))).code).toBe('STAGING_SHORTAGE_NOT_FOUND')
  })

  test('yêu cầu giao theo chuyến chưa có ở máy chủ: NOT_SUPPORTED, không gọi mạng', async () => {
    const { calls, api } = trips({})
    expect((await failure(() => api.fetchTripRequirements('TRIP-0041'))).code).toBe('NOT_SUPPORTED')
    expect(calls).toEqual([])
  })
})
