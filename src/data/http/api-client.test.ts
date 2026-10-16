import { createApiClient } from './api-client'
import { ApiError } from './api-error'

type Call = { url: string; init: RequestInit }

function respond(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) } as Response
}

function clientWith(response: Response | (() => Promise<Response>), token: string | null = 'TOKEN') {
  const calls: Call[] = []
  const onUnauthenticated = jest.fn()
  const client = createApiClient({
    baseUrl: 'http://api.test',
    accessToken: async () => token,
    onUnauthenticated,
    fetch: (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return typeof response === 'function' ? response() : response
    }) as unknown as typeof fetch,
    timeoutMs: 20,
  })
  return { client, calls, onUnauthenticated }
}

async function failure(run: () => Promise<unknown>): Promise<ApiError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('lượt gọi không ném lỗi')
}

describe('createApiClient', () => {
  test('mở phong bì của backend và trả phần data', async () => {
    const { client, calls } = clientWith(respond(200, { success: true, data: [{ id: 7 }] }))
    await expect(client.get('/api/driver/trips', { query: { page: 0, q: 'biên hoà', skip: undefined } })).resolves.toEqual([{ id: 7 }])
    expect(calls[0]?.url).toBe('http://api.test/api/driver/trips?page=0&q=bi%C3%AAn%20ho%C3%A0')
    expect(calls[0]?.init.headers).toMatchObject({ Authorization: 'Bearer TOKEN', Accept: 'application/json' })
  })

  test('gửi body dạng JSON; chưa đăng nhập thì không gắn Authorization', async () => {
    const { client, calls } = clientWith(respond(200, { success: true, data: null }), null)
    await client.post('/api/driver/stops/3/complete', { body: { note: 'xong' } })
    expect(calls[0]?.init).toMatchObject({ method: 'POST', body: '{"note":"xong"}' })
    expect(calls[0]?.init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(calls[0]?.init.headers).not.toHaveProperty('Authorization')
  })

  test('lỗi nghiệp vụ: giữ mã của backend, mã HTTP và tham số', async () => {
    const { client } = clientWith(respond(409, { success: false, code: 'USER_ALREADY_EXISTS', message: 'không dùng', errors: { email: 'a@b.vn' } }))
    const error = await failure(() => client.post('/api/users'))
    expect(error).toMatchObject({ code: 'USER_ALREADY_EXISTS', status: 409, params: { email: 'a@b.vn' } })
  })

  test('401 không kèm mã: UNAUTHENTICATED và báo cho nơi giữ phiên', async () => {
    const { client, onUnauthenticated } = clientWith(respond(401, undefined))
    expect((await failure(() => client.get('/api/users/me'))).code).toBe('UNAUTHENTICATED')
    expect(onUnauthenticated).toHaveBeenCalledTimes(1)
  })

  test('không gia hạn được phiên: không gọi backend, báo cho nơi giữ phiên; lỗi mạng lúc gia hạn thì không', async () => {
    const onUnauthenticated = jest.fn()
    const fetchImpl = jest.fn()
    const clientFor = (error: ApiError) =>
      createApiClient({
        baseUrl: 'http://api.test',
        accessToken: () => Promise.reject(error),
        onUnauthenticated,
        fetch: fetchImpl as unknown as typeof fetch,
      })
    expect((await failure(() => clientFor(new ApiError('UNAUTHENTICATED')).get('/api/driver/trips'))).code).toBe('UNAUTHENTICATED')
    expect(onUnauthenticated).toHaveBeenCalledTimes(1)
    expect((await failure(() => clientFor(new ApiError('NETWORK_ERROR')).get('/api/driver/trips'))).code).toBe('NETWORK_ERROR')
    expect(onUnauthenticated).toHaveBeenCalledTimes(1)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('403 → UNAUTHORIZED, 500 không đọc được → SERVER_ERROR', async () => {
    expect((await failure(() => clientWith(respond(403, undefined)).client.get('/x'))).code).toBe('UNAUTHORIZED')
    const broken = { ok: false, status: 500, text: async () => '<html>' } as Response
    expect((await failure(() => clientWith(broken).client.get('/x'))).code).toBe('SERVER_ERROR')
  })

  test('mất mạng → NETWORK_ERROR', async () => {
    const { client } = clientWith(async () => {
      throw new TypeError('Network request failed')
    })
    expect(await failure(() => client.get('/x'))).toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
  })

  test('quá thời gian chờ → TIMEOUT', async () => {
    const calls: AbortSignal[] = []
    const client = createApiClient({
      baseUrl: 'http://api.test',
      accessToken: async () => null,
      timeoutMs: 10,
      fetch: ((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          calls.push(init.signal as AbortSignal)
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        })) as unknown as typeof fetch,
    })
    expect((await failure(() => client.get('/x'))).code).toBe('TIMEOUT')
    expect(calls[0]?.aborted).toBe(true)
  })
})
