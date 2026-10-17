import { createApiClient } from '@/data/http'

import { httpMonitoringApi } from './monitoring-http'

type Call = { method: string; path: string }
type Reply = { status: number; body?: unknown }
const ok = (data: unknown): Reply => ({ status: 200, body: { success: true, code: null, message: 'ok', data, errors: null } })
const fail = (status: number): Reply => ({ status, body: { success: false, code: null, message: 'thô', data: null, errors: null } })

describe('httpMonitoringApi', () => {
  test('bảng giám sát ghép đội xe với tên chuyến trên dashboard', async () => {
    const calls: Call[] = []
    const fetchImpl = (async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname
      calls.push({ method: init.method ?? 'GET', path })
      const routes: Record<string, unknown> = {
        '/api/trips/monitoring': [
          {
            tripId: '41',
            location: { lat: 10.7, lng: 106.7, recordedAt: '2026-10-16T08:00:00Z' },
            exceptions: [{ id: 'EXC-1', type: 'TRAFFIC', description: 'kẹt', delayMinutes: 12, status: 'OPEN' }],
            refreshMs: 1000,
          },
        ],
        '/api/dispatcher/dashboard': {
          trips: [{ tripId: '41', name: 'Tuyến Thủ Đức', vehicleName: 'Xe 1', driverName: 'Dũng' }],
        },
      }
      const data = routes[path]
      const reply = data === undefined ? fail(404) : ok(data)
      return {
        ok: reply.status < 300,
        status: reply.status,
        text: async () => JSON.stringify(reply.body),
      } as Response
    }) as unknown as typeof fetch
    const client = createApiClient({ baseUrl: 'http://api.test', accessToken: async () => 'TOKEN', fetch: fetchImpl })
    const board = await httpMonitoringApi({ client: () => client }).fetchBoard()
    expect(calls.map((call) => call.path).sort()).toEqual(['/api/dispatcher/dashboard', '/api/trips/monitoring'])
    expect(board).toEqual([
      {
        tripId: '41',
        name: 'Tuyến Thủ Đức',
        vehicleName: 'Xe 1',
        driverName: 'Dũng',
        location: { lat: 10.7, lng: 106.7, recordedAt: '2026-10-16T08:00:00Z' },
        exceptionCount: 1,
        refreshMs: 1000,
      },
    ])
  })
})
