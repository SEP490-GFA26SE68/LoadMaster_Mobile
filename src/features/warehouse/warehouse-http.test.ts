import { ApiError, createApiClient } from '@/data/http'

import { httpWarehouseApi } from './warehouse-http'

type Call = { method: string; path: string; query: Record<string, string>; body: unknown }
type Reply = { status: number; body?: unknown }

const ok = (data: unknown): Reply => ({ status: 200, body: { success: true, code: null, message: 'ok', data, errors: null } })
const fail = (status: number): Reply => ({ status, body: { success: false, code: null, message: 'thô', data: null, errors: null } })

const TASK = {
  tripId: 12,
  tripCode: 'TRIP-0012',
  vehicleInfo: '51C-123.45 (Xe tải)',
  totalPackages: 4,
  departureTime: '2026-10-16T07:30:00',
  status: 'PLANNED',
}

const START = {
  tripId: 12,
  tripCode: 'TRIP-0012',
  vehicleInfo: '51C-123.45 (Xe tải)',
  totalPackages: 2,
  status: 'IN_PROGRESS',
  placements: [
    { placementId: 80, packageName: 'Tủ lạnh', trackingBarcode: 'LM-1', posX: 10, posY: 0, posZ: 0, sequence: 1 },
    { placementId: 81, packageName: 'Máy giặt', trackingBarcode: 'LM-2', posX: 80, posY: 0, posZ: 0, sequence: 2 },
  ],
}

function backend(routes: Record<string, (call: Call) => Reply>) {
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
  return { calls, api: httpWarehouseApi({ client: () => client, userId: () => '15' }) }
}

describe('httpWarehouseApi', () => {
  test('đọc nhiệm vụ kèm mã nhân viên kho', async () => {
    const { calls, api } = backend({ 'GET /api/warehouse/tasks': () => ok([TASK]) })
    const tasks = await api.fetchTasks()
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/warehouse/tasks', query: { workerId: '15' } })
    expect(tasks).toEqual([
      { id: '12', code: 'TRIP-0012', vehicleInfo: TASK.vehicleInfo, packageCount: 4, departureAt: TASK.departureTime, status: 'PLANNED', inProgress: false },
    ])
  })

  test('bắt đầu xếp rồi xác nhận kiện đầu', async () => {
    const { calls, api } = backend({
      'POST /api/warehouse/tasks/12/start': () => ok(START),
      'POST /api/warehouse/placements/80/confirm': () => ok({ nextPlacement: START.placements[1] }),
    })
    const started = await api.startLoading('12')
    expect(started.nextId).toBe('80')
    const next = await api.confirmPlacement('12', '80')
    expect(calls[1]?.query).toEqual({ workerId: '15' })
    expect(next.nextId).toBe('81')
    expect(next.placements[0]?.confirmed).toBe(true)
  })

  test('chưa start thì đọc phiên xếp là LOADING_NOT_STARTED', async () => {
    const { api } = backend({})
    await expect(api.fetchLoading('12')).rejects.toMatchObject({ code: 'LOADING_NOT_STARTED' } satisfies Partial<ApiError>)
  })
})
