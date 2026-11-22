import { isApiError } from '@/data/http'
import { fail, fakeDriverBackend, ok, type Routes } from '@/test/driver-backend'

import { httpPresenceApi } from './presence-http'

const BASE = '/api/warehouse/vehicle-presence'

/** Một dòng của `GET …/{warehouseId}/vehicles` như `VehiclePresenceStore.vehicles` trả (khoá snake_case của SQL). */
const VEHICLE = {
  id: 9,
  name: 'Xe tải 3,5 tấn',
  license_plate: '51C-123.45',
  active_transfer_status: null,
  loading_trip_id: 51,
  loading_trip_code: 'TRIP-0051',
  status: 'IN_TRIP',
  presence_status: 'UNKNOWN',
  current_warehouse_id: null,
  current_warehouse_name: null,
  observed_at: null,
  actor_name: null,
}

function presence(routes: Routes) {
  const { calls, client } = fakeDriverBackend(routes)
  return { calls, api: httpPresenceApi({ client: () => client }) }
}

describe('httpPresenceApi', () => {
  test('đọc kho được phân công và xe của kho, đổi khoá snake_case sang kiểu của app', async () => {
    const { api, calls } = presence({
      [`GET ${BASE}/warehouses`]: () => ok([{ id: 3, name: 'Kho Long Bình' }]),
      [`GET ${BASE}/3/vehicles`]: () =>
        ok([
          VEHICLE,
          {
            ...VEHICLE,
            id: 10,
            name: null,
            license_plate: '51D-678.90',
            loading_trip_id: null,
            loading_trip_code: null,
            status: 'AVAILABLE',
            presence_status: 'AT_WAREHOUSE',
            current_warehouse_id: 3,
            current_warehouse_name: 'Kho Long Bình',
            observed_at: '2026-11-22T02:15:00Z',
            actor_name: 'Lê Văn Kho',
            active_transfer_status: 'REQUESTED',
          },
        ]),
    })
    expect(await api.fetchWarehouses()).toEqual([{ id: '3', name: 'Kho Long Bình' }])
    const vehicles = await api.fetchVehicles('3', { query: ' 51C ', atWarehouse: true })
    expect(calls.at(-1)?.query).toEqual({ query: '51C', atWarehouse: 'true', page: '0', size: '100' })
    expect(vehicles[0]).toEqual({
      id: '9',
      name: 'Xe tải 3,5 tấn',
      licensePlate: '51C-123.45',
      state: 'IN_TRIP',
      presence: 'UNKNOWN',
      warehouseId: null,
      warehouseName: null,
      observedAt: null,
      actorName: null,
      loadingTripId: '51',
      loadingTripCode: 'TRIP-0051',
      transferring: false,
    })
    expect(vehicles[1]).toMatchObject({
      id: '10',
      name: null,
      presence: 'AT_WAREHOUSE',
      warehouseId: '3',
      observedAt: '2026-11-22T02:15:00.000Z',
      actorName: 'Lê Văn Kho',
      transferring: true,
    })
  })

  test('chữ tìm một ký tự không gọi máy chủ (máy chủ trả INVALID_INPUT)', async () => {
    const { api, calls } = presence({})
    expect(await api.fetchVehicles('3', { query: 'a' })).toEqual([])
    expect(calls).toHaveLength(0)
  })

  test('ghi nhận và xác nhận gửi mã xe là số kèm header Idempotency-Key', async () => {
    const { api, calls } = presence({
      [`POST ${BASE}/3/check-in`]: () => ok({ vehicleId: 9, status: 'AT_WAREHOUSE' }),
      [`POST ${BASE}/3/loading-trips/51/confirm-presence`]: () => ok({ vehicleId: 9, status: 'AT_WAREHOUSE' }),
    })
    await api.checkIn('3', '9', 'key-1')
    await api.confirmLoadingPresence('3', '51', '9', 'key-2')
    expect(calls[0]).toMatchObject({ method: 'POST', body: { vehicleId: 9 }, headers: { 'Idempotency-Key': 'key-1' } })
    expect(calls[1]).toMatchObject({ path: `${BASE}/3/loading-trips/51/confirm-presence`, body: { vehicleId: 9 }, headers: { 'Idempotency-Key': 'key-2' } })
  })

  test('VEHICLE_BUSY của máy chủ thành PRESENCE_VEHICLE_BUSY (câu cùng mã của kho mẫu nói chuyện khác); mã khác giữ nguyên', async () => {
    const { api } = presence({
      [`POST ${BASE}/3/check-in`]: () => fail(409, 'VEHICLE_BUSY'),
      [`POST ${BASE}/3/loading-trips/51/confirm-presence`]: () => fail(409, 'VEHICLE_PRESENCE_CONFLICT'),
    })
    await expect(api.checkIn('3', '9', 'k')).rejects.toMatchObject({ code: 'PRESENCE_VEHICLE_BUSY', status: 409 })
    await expect(api.confirmLoadingPresence('3', '51', '9', 'k')).rejects.toMatchObject({ code: 'VEHICLE_PRESENCE_CONFLICT' })
  })

  test('lịch sử: mới nhất trước, trạng thái lạ thành OTHER', async () => {
    const { api } = presence({
      [`GET ${BASE}/3/vehicles/9/events`]: () =>
        ok([
          { id: 1, eventType: 'CHECK_IN', previousStatus: 'UNKNOWN', newStatus: 'AT_WAREHOUSE', recordedAt: '2026-11-20T01:00:00Z' },
          { id: 2, eventType: 'DEPART', previousStatus: 'AT_WAREHOUSE', newStatus: 'IN_TRANSIT', recordedAt: '2026-11-21T01:00:00Z' },
        ]),
    })
    const events = await api.fetchEvents('3', '9')
    expect(events.map((row) => row.id)).toEqual(['2', '1'])
    expect(events[0]).toMatchObject({ type: 'OTHER', previous: 'AT_WAREHOUSE', next: 'IN_TRANSIT' })
    expect(events[1]).toMatchObject({ type: 'CHECK_IN', previous: 'UNKNOWN', next: 'AT_WAREHOUSE' })
  })

  test('xe của chuyến đang xếp: tìm theo biển số ở từng kho, chọn đúng xe đang xếp cho chuyến', async () => {
    const { api, calls } = presence({
      [`GET ${BASE}/warehouses`]: () => ok([{ id: 2, name: 'Kho Bình Dương' }, { id: 3, name: 'Kho Long Bình' }]),
      [`GET ${BASE}/2/vehicles`]: () => ok([{ ...VEHICLE, loading_trip_id: null, loading_trip_code: null }]),
      [`GET ${BASE}/3/vehicles`]: () => ok([VEHICLE]),
    })
    const found = await api.fetchTripVehicle('51', '51C-123.45')
    expect(found?.warehouse).toEqual({ id: '3', name: 'Kho Long Bình' })
    expect(found?.vehicle.id).toBe('9')
    expect(calls.filter((call) => call.path.endsWith('/vehicles')).map((call) => call.query.query)).toEqual(['51C-123.45', '51C-123.45'])
    expect(await api.fetchTripVehicle('52', '51C-123.45')).toBeNull()
  })

  test('máy chủ cũ chưa có endpoint xe ở kho (404 không mã): không có gì để xác nhận; lỗi khác vẫn là lỗi', async () => {
    expect(await presence({}).api.fetchTripVehicle('51', '51C-123.45')).toBeNull()
    const forbidden = presence({ [`GET ${BASE}/warehouses`]: () => fail(403) })
    const error: unknown = await forbidden.api.fetchTripVehicle('51', '51C-123.45').catch((caught: unknown) => caught)
    expect(isApiError(error) && error.code).toBe('UNAUTHORIZED')
  })
})
