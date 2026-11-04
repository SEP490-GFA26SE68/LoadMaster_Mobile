import { z } from 'zod'

import type { KeycloakConfig } from '@/data/config'
import { ApiError } from '@/data/http'

/** Token của một phiên Keycloak. */
export type TokenSet = {
  readonly accessToken: string
  readonly refreshToken: string | null
  /** Lúc token truy cập hết hạn, theo đồng hồ của máy (ms). */
  readonly expiresAt: number
}

/** Ba việc app làm với Keycloak. `keycloak-auth.ts` chỉ biết hợp đồng này; test truyền bản giả. */
export type OAuthClient = {
  /**
   * Đăng nhập bằng email và mật khẩu người dùng gõ ở form của app. Keycloak từ chối: `INVALID_CREDENTIALS`, `ACCOUNT_SUSPENDED`,
   * `PASSWORD_CHANGE_REQUIRED` (mật khẩu đúng nhưng là mật khẩu tạm), lý do khác `SIGN_IN_FAILED`; không tới được Keycloak:
   * `NETWORK_ERROR` / `TIMEOUT` / `SERVER_ERROR`.
   */
  passwordGrant(username: string, password: string): Promise<TokenSet>
  /** Làm mới token. Keycloak không nhận refresh token nữa: `UNAUTHENTICATED`; không tới được Keycloak: `NETWORK_ERROR` / `TIMEOUT` / `SERVER_ERROR`. */
  refresh(refreshToken: string): Promise<TokenSet>
  /** Đóng phiên ở Keycloak. Không bao giờ ném lỗi: đăng xuất ở máy vẫn xong dù lượt gọi này hỏng. */
  endSession(refreshToken: string): Promise<void>
}

const SCOPE = 'openid'

const TIMEOUT_MS = 15_000

/** Token của realm sống 60 giây; Keycloak luôn trả `expires_in`, số này chỉ phòng khi thiếu. */
const FALLBACK_LIFETIME_SECONDS = 60

/**
 * Keycloak từ chối lượt đăng nhập bằng `invalid_grant` và phân biệt lý do ở `error_description`. Tài khoản đang bị khoá tạm vì gõ sai
 * nhiều lần cũng nhận "Invalid user credentials" (Keycloak cố ý không nói): app chỉ có một câu "sai email hoặc mật khẩu".
 */
const DENIALS: Readonly<Record<string, string>> = {
  'invalid user credentials': 'INVALID_CREDENTIALS',
  'account disabled': 'ACCOUNT_SUSPENDED',
  'account is not fully set up': 'PASSWORD_CHANGE_REQUIRED',
}

const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
  refresh_token: z.string().min(1).optional(),
})

const oauthErrorSchema = z.object({ error: z.string(), error_description: z.string().optional() })

type Reply = { readonly status: number; readonly body: unknown }

const formOf = (fields: Readonly<Record<string, string>>) =>
  Object.entries(fields)
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('&')

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

/**
 * Hai endpoint chuẩn của Keycloak (`token`, `logout`), dựng từ `issuer` — không đọc tài liệu discovery, bớt một lượt gọi mỗi lần đăng
 * nhập. Đây là nơi duy nhất của app nói chuyện với Keycloak; backend LoadMaster thì đi qua `src/data/http`.
 */
export function createKeycloakOAuth(
  { issuer, clientId }: KeycloakConfig,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): OAuthClient {
  const base = `${issuer}/protocol/openid-connect`

  async function post(endpoint: 'token' | 'logout', fields: Readonly<Record<string, string>>): Promise<Reply> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const response = await fetchImpl(`${base}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: formOf({ client_id: clientId, ...fields }),
        signal: controller.signal,
      })
      return { status: response.status, body: parseJson(await response.text()) }
    } catch {
      throw new ApiError(controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR')
    } finally {
      clearTimeout(timer)
    }
  }

  /** Phản hồi 2xx đọc được thành token; không thì `null`. */
  function tokensOf({ status, body }: Reply): TokenSet | null {
    if (status < 200 || status >= 300) return null
    const parsed = tokenSchema.safeParse(body)
    if (!parsed.success) return null
    return {
      accessToken: parsed.data.access_token,
      refreshToken: parsed.data.refresh_token ?? null,
      expiresAt: now() + (parsed.data.expires_in ?? FALLBACK_LIFETIME_SECONDS) * 1000,
    }
  }

  /** Lỗi theo OAuth (`{ error, error_description }`) của phản hồi 400 / 401; `null` khi phản hồi không phải loại đó. */
  function oauthErrorOf({ status, body }: Reply) {
    if (status !== 400 && status !== 401) return null
    const parsed = oauthErrorSchema.safeParse(body)
    return parsed.success ? parsed.data : null
  }

  return {
    async passwordGrant(username, password) {
      const reply = await post('token', { grant_type: 'password', username, password, scope: SCOPE })
      const tokens = tokensOf(reply)
      if (tokens !== null) return tokens
      if (reply.status >= 500) throw new ApiError('SERVER_ERROR', { status: reply.status })
      const denial = oauthErrorOf(reply)
      const code = denial?.error === 'invalid_grant' ? DENIALS[(denial.error_description ?? '').trim().toLowerCase()] : undefined
      throw new ApiError(code ?? 'SIGN_IN_FAILED', { status: reply.status, params: { reason: denial?.error ?? '' } })
    },

    async refresh(refreshToken) {
      const reply = await post('token', { grant_type: 'refresh_token', refresh_token: refreshToken })
      const tokens = tokensOf(reply)
      if (tokens !== null) return tokens
      // Phiên ở Keycloak đã hết, bị đóng, hoặc tài khoản bị khoá: không làm mới được nữa
      if (oauthErrorOf(reply) !== null) throw new ApiError('UNAUTHENTICATED', { status: reply.status })
      // Keycloak lỗi hoặc trả thứ đọc không được: giữ phiên, lượt sau thử lại
      throw new ApiError('SERVER_ERROR', { status: reply.status })
    },

    // Đóng đúng phiên của refresh token này (thu hồi token thì đóng phiên của client trên mọi máy)
    async endSession(refreshToken) {
      await post('logout', { refresh_token: refreshToken }).catch(() => undefined)
    },
  }
}
