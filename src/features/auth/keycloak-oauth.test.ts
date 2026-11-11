import { createKeycloakOAuth } from './keycloak-oauth'

const CONFIG = { issuer: 'http://kc.test/realms/loadmaster', clientId: 'loadmaster-mobile' }
const TOKEN_URL = 'http://kc.test/realms/loadmaster/protocol/openid-connect/token'
const LOGOUT_URL = 'http://kc.test/realms/loadmaster/protocol/openid-connect/logout'
const NOW = 5_000_000

type Call = { readonly url: string; readonly method: string | undefined; readonly fields: Record<string, string> }

/** `fetch` giả trả lần lượt các phản hồi; ghi lại địa chỉ và các trường form của mỗi lượt gọi. */
function fakeFetch(...replies: readonly (readonly [number, unknown] | Error)[]) {
  const calls: Call[] = []
  const queue = [...replies]
  const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method,
      fields: Object.fromEntries(new URLSearchParams(String(init?.body ?? ''))),
    })
    const reply = queue.shift()
    if (reply === undefined) throw new Error('hết phản hồi giả')
    if (reply instanceof Error) throw reply
    const [status, body] = reply
    return { ok: status >= 200 && status < 300, status, text: async () => (body === null ? '' : JSON.stringify(body)) } as Response
  })
  return { oauth: createKeycloakOAuth(CONFIG, fetchImpl as unknown as typeof fetch, () => NOW), calls }
}

const GRANTED = { access_token: 'AT-1', expires_in: 60, refresh_token: 'RT-1', refresh_expires_in: 1800, token_type: 'Bearer' }

const denied = (description: string) => [400, { error: 'invalid_grant', error_description: description }] as const

describe('đăng nhập bằng email và mật khẩu', () => {
  test('gửi đúng các trường form tới endpoint token; token truy cập hết hạn sau expires_in', async () => {
    const { oauth, calls } = fakeFetch([200, GRANTED])
    await expect(oauth.passwordGrant('driver@loadmaster.vn', 'p&ss=word')).resolves.toEqual({ accessToken: 'AT-1', refreshToken: 'RT-1', expiresAt: NOW + 60_000 })
    expect(calls).toEqual([
      {
        url: TOKEN_URL,
        method: 'POST',
        fields: { client_id: 'loadmaster-mobile', grant_type: 'password', username: 'driver@loadmaster.vn', password: 'p&ss=word', scope: 'openid' },
      },
    ])
  })

  test.each([
    ['Invalid user credentials', 'INVALID_CREDENTIALS'],
    ['Account disabled', 'ACCOUNT_SUSPENDED'],
    ['Account is not fully set up', 'PASSWORD_CHANGE_REQUIRED'],
  ])('Keycloak từ chối "%s": %s', async (description, code) => {
    const { oauth } = fakeFetch(denied(description))
    await expect(oauth.passwordGrant('a@b.vn', 'x')).rejects.toMatchObject({ code, status: 400 })
  })

  test('lý do khác của Keycloak (client chưa bật đăng nhập bằng mật khẩu): SIGN_IN_FAILED', async () => {
    const { oauth } = fakeFetch([401, { error: 'unauthorized_client', error_description: 'Client not allowed for direct access grants' }])
    await expect(oauth.passwordGrant('a@b.vn', 'x')).rejects.toMatchObject({ code: 'SIGN_IN_FAILED', status: 401 })
  })

  test('invalid_grant với câu lạ: SIGN_IN_FAILED', async () => {
    const { oauth } = fakeFetch(denied('Something new'))
    await expect(oauth.passwordGrant('a@b.vn', 'x')).rejects.toMatchObject({ code: 'SIGN_IN_FAILED' })
  })

  test('Keycloak lỗi (5xx): SERVER_ERROR', async () => {
    const { oauth } = fakeFetch([503, null])
    await expect(oauth.passwordGrant('a@b.vn', 'x')).rejects.toMatchObject({ code: 'SERVER_ERROR', status: 503 })
  })

  test('không tới được Keycloak: NETWORK_ERROR', async () => {
    const { oauth } = fakeFetch(new TypeError('Network request failed'))
    await expect(oauth.passwordGrant('a@b.vn', 'x')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })

  test('Keycloak không trả lời trong 15 giây: TIMEOUT', async () => {
    jest.useFakeTimers()
    try {
      const fetchImpl = jest.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
      )
      const oauth = createKeycloakOAuth(CONFIG, fetchImpl as unknown as typeof fetch, () => NOW)
      const call = oauth.passwordGrant('a@b.vn', 'x')
      jest.advanceTimersByTime(15_000)
      await expect(call).rejects.toMatchObject({ code: 'TIMEOUT' })
    } finally {
      jest.useRealTimers()
    }
  })

  test('200 mà thân không phải token: SIGN_IN_FAILED', async () => {
    const { oauth } = fakeFetch([200, { hello: 'world' }])
    await expect(oauth.passwordGrant('a@b.vn', 'x')).rejects.toMatchObject({ code: 'SIGN_IN_FAILED' })
  })
})

describe('làm mới token', () => {
  test('gửi refresh token; Keycloak cấp refresh token mới (xoay vòng)', async () => {
    const { oauth, calls } = fakeFetch([200, { ...GRANTED, access_token: 'AT-2', refresh_token: 'RT-2' }])
    await expect(oauth.refresh('RT-1')).resolves.toEqual({ accessToken: 'AT-2', refreshToken: 'RT-2', expiresAt: NOW + 60_000 })
    expect(calls[0]).toEqual({ url: TOKEN_URL, method: 'POST', fields: { client_id: 'loadmaster-mobile', grant_type: 'refresh_token', refresh_token: 'RT-1' } })
  })

  test('phiên đã hết ("Session not active"): UNAUTHENTICATED', async () => {
    const { oauth } = fakeFetch(denied('Session not active'))
    await expect(oauth.refresh('RT-1')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  test('Keycloak lỗi hoặc mất mạng: giữ nguyên mã để phiên không bị đăng xuất', async () => {
    const { oauth } = fakeFetch([502, null], new TypeError('Network request failed'))
    await expect(oauth.refresh('RT-1')).rejects.toMatchObject({ code: 'SERVER_ERROR' })
    await expect(oauth.refresh('RT-1')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
})

describe('đăng xuất', () => {
  test('gửi refresh token tới endpoint logout', async () => {
    const { oauth, calls } = fakeFetch([204, null])
    await oauth.endSession('RT-1')
    expect(calls).toEqual([{ url: LOGOUT_URL, method: 'POST', fields: { client_id: 'loadmaster-mobile', refresh_token: 'RT-1' } }])
  })

  test('mất mạng hoặc Keycloak lỗi: không ném lỗi', async () => {
    const { oauth } = fakeFetch(new TypeError('Network request failed'), [500, null])
    await expect(oauth.endSession('RT-1')).resolves.toBeUndefined()
    await expect(oauth.endSession('RT-1')).resolves.toBeUndefined()
  })
})
