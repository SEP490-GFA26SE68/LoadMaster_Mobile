import { createApiClient } from '@/data/http'

import { httpFleetApi } from './fleet-http'

type Reply = { status: number; body?: unknown }
const ok = (data: unknown): Reply => ({ status: 200, body: { success: true, code: null, message: 'ok', data, errors: null } })

describe('httpFleetApi', () => {
  test('đọc trang chuyến của công ty', async () => {
    const fetchImpl = (async (url: string) => {
      expect(new URL(url).pathname).toBe('/api/trips')
      expect(new URL(url).searchParams.get('size')).toBe('50')
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify(
            ok([
              {
                id: 9,
                tripCode: 'TRIP-0009',
                tripName: 'Tuyến Thủ Đức',
                vehicleName: 'Xe 1',
                licensePlate: '51C-1',
                driverName: 'Nam',
                departureTime: '2026-10-16T07:30:00',
                status: 'IN_TRANSIT',
              },
            ]).body,
          ),
      } as Response
    }) as unknown as typeof fetch
    const client = createApiClient({ baseUrl: 'http://api.test', accessToken: async () => 'TOKEN', fetch: fetchImpl })
    const trips = await httpFleetApi({ client: () => client }).fetchFleetTrips()
    expect(trips).toEqual([
      {
        id: '9',
        code: 'TRIP-0009',
        name: 'Tuyến Thủ Đức',
        vehicleName: 'Xe 1 · 51C-1',
        driverName: 'Nam',
        status: 'IN_TRANSIT',
        departureAt: '2026-10-16T07:30:00',
      },
    ])
  })
})
