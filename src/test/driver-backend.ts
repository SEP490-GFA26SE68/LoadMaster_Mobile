import { ApiError, createApiClient, type ApiClient } from '@/data/http'
import { httpDriverApi } from '@/features/driver/driver-http'
import type { DriverTripScreen, StopScreen } from '@/features/driver/driver-model'

/*
 * Máy chủ giả cho test màn tài xế nối backend: trả theo `PHƯƠNG_THỨC đường-dẫn`, ghi lại mọi lượt gọi. Bảng `routes` đọc lúc gọi, nên test
 * đổi câu trả lời giữa chừng bằng cách gán vào bảng đó.
 */

export type Call = { method: string; path: string; query: Record<string, string>; body: unknown }
export type Reply = { status: number; body?: unknown }
export type Routes = Record<string, (call: Call) => Reply>

/** Phong bì của backend: lỗi có handler riêng (và mọi lỗi trước khi backend gắn mã) không kèm mã; lỗi `AppException` kèm tên `ErrorCode`. */
export const ok = (data: unknown): Reply => ({ status: 200, body: { success: true, code: null, message: 'ok', data, errors: null } })
export const fail = (status: number, code: string | null = null): Reply => ({
  status,
  body: { success: false, code, message: 'thông điệp thô', data: null, errors: null },
})

export const TRIP = {
  tripId: 41,
  tripCode: 'TRIP-0041',
  vehicleLicensePlate: '51C-123.45',
  stopCount: 3,
  departureTime: '2026-10-16T07:30:00.123456',
  status: 'IN_TRANSIT',
}

/** Điểm 2 của chuyến 41: đã đến lúc 09:15 giờ Việt Nam, hai kiện chưa dỡ. */
export const STOP = {
  stopId: 902,
  stopSequence: 2,
  stopName: 'Điện máy Xanh Biên Hoà',
  address: '12 Phạm Văn Thuận, Biên Hoà',
  actualArrival: '2026-10-16T09:15:00',
  packages: [
    {
      packageId: 7001,
      packageName: 'Tủ lạnh 180L',
      trackingBarcode: 'LM-AB12-CD34-EF56',
      qrToken: 'lm-qr-7001',
      packageCode: 'DMX-01',
      weight: 62.5,
      unloadOrder: 1,
    },
    { packageId: 7002, packageName: null, trackingBarcode: null, weight: null, unloadOrder: 2 },
  ],
}

export const STOP_KEY = { number: 2, ref: '902' }

export function fakeDriverBackend(routes: Routes) {
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
  const client: ApiClient = createApiClient({ baseUrl: 'http://api.test', accessToken: async () => 'TOKEN', fetch: fetchImpl })
  return { calls, client, routes }
}

/** Nguồn backend của tài xế trên máy chủ giả; `user.id` đổi được để giả đổi người đăng nhập. */
export function backend(routes: Routes, user: { id: string | null } = { id: '15' }) {
  const { calls, client } = fakeDriverBackend(routes)
  const driver = httpDriverApi({ client: () => client, userId: () => user.id })
  return { calls, driver, user }
}

/** Chuyến 41 đang vận chuyển (điểm 2 là điểm hiện tại), chuyến 42 đã giao. */
export const onTrip = (extra: Routes = {}): Routes => ({
  'GET /api/driver/trips': () => ok([TRIP, { ...TRIP, tripId: 42, tripCode: 'TRIP-0042', status: 'DELIVERED' }]),
  'GET /api/driver/trips/41/current-stop': () => ok(STOP),
  ...extra,
})

export async function failure(run: () => Promise<unknown>): Promise<ApiError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('lượt gọi không ném lỗi')
}

export function stopOf(screen: DriverTripScreen): StopScreen {
  if (screen.kind !== 'stop') throw new Error(`màn là ${screen.kind}, không phải điểm giao`)
  return screen.screen
}
