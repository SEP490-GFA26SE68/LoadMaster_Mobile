import {
  AuthRequest,
  CodeChallengeMethod,
  exchangeCodeAsync,
  makeRedirectUri,
  Prompt,
  refreshAsync,
  ResponseType,
  TokenError,
  type DiscoveryDocument,
  type TokenResponse,
} from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'

import type { KeycloakConfig } from '@/data/config'
import { ApiError } from '@/data/http'

import { AUTH_REDIRECT_PATH } from './auth-redirect'

// Bản xem thử trên trình duyệt (`pnpm web`) mở trang đăng nhập trong cửa sổ bật lên; cửa sổ đó nạp lại app và lệnh này trả kết quả về
// cửa sổ chính. Trên điện thoại lệnh không làm gì.
WebBrowser.maybeCompleteAuthSession()

/** Token của một phiên Keycloak. */
export type TokenSet = {
  readonly accessToken: string
  readonly refreshToken: string | null
  /** Lúc token truy cập hết hạn, theo đồng hồ của máy (ms). */
  readonly expiresAt: number
}

/** Ba việc app làm với Keycloak. `keycloak-auth.ts` chỉ biết hợp đồng này; test truyền bản giả. */
export type OAuthClient = {
  /** Mở trang đăng nhập trong trình duyệt; `null` khi người dùng đóng trang mà không đăng nhập. */
  authorize(): Promise<TokenSet | null>
  /** Làm mới token. Keycloak không nhận refresh token nữa: `UNAUTHENTICATED`; không tới được Keycloak: `NETWORK_ERROR` / `TIMEOUT`. */
  refresh(refreshToken: string): Promise<TokenSet>
  /** Đóng phiên ở Keycloak, không mở trình duyệt. */
  endSession(refreshToken: string): Promise<void>
}

/**
 * `offline_access`: phiên của app không hết sau 30 phút không dùng như phiên trình duyệt (realm cho mọi tài khoản quyền này) — tài xế
 * cất điện thoại cả buổi vẫn còn đăng nhập. Đăng xuất đóng đúng phiên của máy này.
 */
const SCOPES = ['openid', 'offline_access']

const TIMEOUT_MS = 15_000

/** Token của realm sống 60 giây; Keycloak luôn trả `expires_in`, số này chỉ phòng khi thiếu. */
const FALLBACK_LIFETIME_SECONDS = 60

function endpointsOf(issuer: string) {
  const base = `${issuer}/protocol/openid-connect`
  return {
    authorizationEndpoint: `${base}/auth`,
    tokenEndpoint: `${base}/token`,
    endSessionEndpoint: `${base}/logout`,
  } satisfies DiscoveryDocument
}

function tokenSetOf(response: TokenResponse): TokenSet {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken ?? null,
    expiresAt: (response.issuedAt + (response.expiresIn ?? FALLBACK_LIFETIME_SECONDS)) * 1000,
  }
}

/** Thư viện đăng nhập không giới hạn thời gian chờ: Keycloak treo thì mọi lượt gọi backend treo theo. */
function withTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new ApiError('TIMEOUT')), TIMEOUT_MS)
    work.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/** Keycloak từ chối theo OAuth (`TokenError`) → mã `rejected`; còn lại là không tới được Keycloak hoặc phản hồi đọc không được. */
function oauthError(error: unknown, rejected: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof TokenError) return new ApiError(rejected, { params: { reason: error.code } })
  return new ApiError('NETWORK_ERROR')
}

const formOf = (fields: Readonly<Record<string, string>>) =>
  Object.entries(fields)
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('&')

/**
 * Đăng nhập Authorization Code + PKCE (S256) qua trình duyệt của hệ điều hành: app không bao giờ thấy mật khẩu. Địa chỉ các endpoint
 * dựng từ `issuer` (đường dẫn chuẩn của Keycloak), không đọc tài liệu discovery: bớt một lượt gọi mỗi lần đăng nhập.
 */
export function createKeycloakOAuth({ issuer, clientId }: KeycloakConfig, fetchImpl: typeof fetch = fetch): OAuthClient {
  const endpoints = endpointsOf(issuer)
  // Router không mở màn nào cho địa chỉ này (`app/+native-intent.tsx`)
  const redirectUri = makeRedirectUri({ scheme: 'loadmaster', path: AUTH_REDIRECT_PATH })

  return {
    async authorize() {
      const request = new AuthRequest({
        clientId,
        redirectUri,
        scopes: SCOPES,
        responseType: ResponseType.Code,
        usePKCE: true,
        codeChallengeMethod: CodeChallengeMethod.S256,
        // Luôn hỏi mật khẩu: điện thoại có thể dùng chung, phiên Keycloak còn trong trình duyệt không được đăng nhập hộ người trước
        prompt: Prompt.Login,
      })
      const result = await request.promptAsync(endpoints, { preferEphemeralSession: true })
      if (result.type === 'error') throw new ApiError('SIGN_IN_FAILED', { params: { reason: result.errorCode ?? '' } })
      if (result.type !== 'success') return null
      const code = result.params.code
      if (code === undefined || request.codeVerifier === undefined) throw new ApiError('SIGN_IN_FAILED')
      try {
        const extraParams = { code_verifier: request.codeVerifier }
        return tokenSetOf(await withTimeout(exchangeCodeAsync({ clientId, code, redirectUri, extraParams }, endpoints)))
      } catch (error) {
        throw oauthError(error, 'SIGN_IN_FAILED')
      }
    },

    async refresh(refreshToken) {
      try {
        return tokenSetOf(await withTimeout(refreshAsync({ clientId, refreshToken }, endpoints)))
      } catch (error) {
        throw oauthError(error, 'UNAUTHENTICATED')
      }
    },

    // Endpoint đăng xuất nhận refresh token của client công khai và đóng đúng phiên đó (thu hồi token thì đóng phiên của mọi máy)
    async endSession(refreshToken) {
      await withTimeout(
        fetchImpl(endpoints.endSessionEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formOf({ client_id: clientId, refresh_token: refreshToken }),
        }),
      )
    },
  }
}
