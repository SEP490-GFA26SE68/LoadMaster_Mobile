import { ApiError, isApiError } from '@/data/http'
import type { Role, User } from '@/types/user'

import type { AuthAdapter, AuthSession } from './auth-adapter'
import type { BackendUserProfile } from './backend-user'
import type { OAuthClient, TokenSet } from './keycloak-oauth'
import { profileError, profileOf, readSaved, roleOf, savedOf, userOf } from './keycloak-profile'

/**
 * Phiên đăng nhập bằng Keycloak của backend. Phần giữ phiên nằm ở đây, tách khỏi lượt gọi Keycloak (`keycloak-oauth.ts`) để test được:
 * - token truy cập sống 60 giây và chỉ ở trong bộ nhớ; mỗi lượt gọi backend lấy token qua `accessToken()`, sắp hết hạn thì làm mới —
 *   nhiều lượt gọi cùng lúc chung một lần làm mới; backend trả 401 thì `renewAccessToken()` làm mới một lần để gọi lại;
 * - kho khoá của máy cất refresh token kèm hồ sơ (`saved`), cất lại mỗi khi Keycloak cấp refresh token mới (refresh token xoay vòng);
 * - Keycloak từ chối refresh token (phiên hết, bị đóng, tài khoản bị khoá) là `UNAUTHENTICATED`: app đăng xuất. Không tới được Keycloak
 *   thì không đăng xuất — mở app lúc mất sóng vẫn vào bằng hồ sơ đã cất, lượt gọi sau làm mới lại.
 */

/** Tài khoản mẫu cùng vai trò, khi đăng nhập bằng backend mà feature khác còn chạy trên kho mẫu. */
export type StandIn = {
  /** Mở phiên kho mẫu của tài khoản mẫu có vai trò này; `null` khi không có. */
  open(role: Role): User | null
  close(): Promise<void>
}

export type KeycloakAuthDeps = {
  readonly oauth: OAuthClient
  /** `GET /api/users/me` bằng token vừa có. Lỗi là `ApiError` của client backend. */
  readonly readProfile: (accessToken: string) => Promise<unknown>
  /** Cất phiên khi Keycloak cấp refresh token mới. */
  readonly persist: (saved: string) => Promise<void>
  readonly standIn?: StandIn
  readonly now?: () => number
}

/** Làm mới khi token truy cập còn dưới ngần này: lượt gọi đang bay không mang token hết hạn tới backend. */
const MIN_VALIDITY_MS = 20_000

/** Hồ sơ không dùng được: tài khoản không còn vào app này (phiên bị đóng ở Keycloak, phiên cất bị xoá). */
const SESSION_ENDING = ['SIGN_IN_REJECTED', 'PROFILE_NOT_FOUND']

type Live = { readonly tokens: TokenSet; readonly profile: BackendUserProfile }

export function createKeycloakAuth({ oauth, readProfile, persist, standIn, now = Date.now }: KeycloakAuthDeps): AuthAdapter {
  let live: Live | null = null
  /** Tăng mỗi lần đăng xuất: lượt làm mới đang dở của phiên cũ không ghi đè phiên mới, không cất lại phiên đã xoá. */
  let generation = 0
  let refreshing: Promise<TokenSet> | null = null

  async function profileFor(accessToken: string): Promise<BackendUserProfile> {
    let raw: unknown
    try {
      raw = await readProfile(accessToken)
    } catch (error) {
      throw profileError(error)
    }
    const profile = profileOf(raw)
    if (profile === null) throw new ApiError('PROFILE_UNAVAILABLE')
    return profile
  }

  function sessionOf(profile: BackendUserProfile, refreshToken: string): AuthSession {
    const role = roleOf(profile)
    return { user: userOf(profile, role, standIn?.open(role) ?? null), saved: savedOf(refreshToken, profile) }
  }

  async function renew(from: Live): Promise<TokenSet> {
    const started = generation
    const refreshToken = from.tokens.refreshToken
    if (refreshToken === null) {
      live = null
      throw new ApiError('UNAUTHENTICATED')
    }
    let next: TokenSet
    try {
      next = await oauth.refresh(refreshToken)
    } catch (error) {
      if (isApiError(error) && error.code === 'UNAUTHENTICATED' && started === generation) live = null
      throw error
    }
    if (started !== generation || live === null) throw new ApiError('UNAUTHENTICATED')
    const tokens: TokenSet = { ...next, refreshToken: next.refreshToken ?? refreshToken }
    live = { tokens, profile: live.profile }
    if (tokens.refreshToken !== null && tokens.refreshToken !== refreshToken) await persist(savedOf(tokens.refreshToken, live.profile))
    return tokens
  }

  /** Một lần làm mới cho mọi lượt gọi đang chờ. */
  function renewOnce(current: Live): Promise<TokenSet> {
    if (refreshing === null) {
      const run: Promise<TokenSet> = renew(current).finally(() => {
        if (refreshing === run) refreshing = null
      })
      refreshing = run
    }
    return refreshing
  }

  function freshTokens(): Promise<TokenSet> {
    const current = live
    if (current === null) return Promise.reject(new ApiError('UNAUTHENTICATED'))
    if (current.tokens.expiresAt - now() > MIN_VALIDITY_MS) return Promise.resolve(current.tokens)
    return renewOnce(current)
  }

  /** Quên phiên ngay (phần đồng bộ), rồi đóng phiên kho mẫu và phiên Keycloak. */
  async function forget(): Promise<void> {
    const refreshToken = live?.tokens.refreshToken ?? null
    live = null
    refreshing = null
    generation += 1
    try {
      await standIn?.close()
    } finally {
      if (refreshToken !== null) await oauth.endSession(refreshToken)
    }
  }

  return {
    async signIn(email, password) {
      const tokens = await oauth.passwordGrant(email, password)
      try {
        if (tokens.refreshToken === null) throw new ApiError('SIGN_IN_FAILED')
        const profile = await profileFor(tokens.accessToken)
        const session = sessionOf(profile, tokens.refreshToken)
        live = { tokens, profile }
        return session
      } catch (error) {
        // Không vào được app (chưa gắn người dùng ở backend, vai trò lạ, tài khoản bị khoá, không đọc được hồ sơ): đóng luôn phiên vừa
        // mở ở Keycloak — không để lại phiên app không dùng được
        if (tokens.refreshToken !== null) void oauth.endSession(tokens.refreshToken)
        throw error
      }
    },

    async restore(saved) {
      const stored = readSaved(saved)
      if (stored === null) return null
      let profile = stored.profile
      // Token truy cập không được cất: mở app là làm mới ngay
      live = { tokens: { accessToken: '', refreshToken: stored.refreshToken, expiresAt: 0 }, profile }
      let tokens: TokenSet | null = null
      try {
        tokens = await freshTokens()
      } catch (error) {
        if (isApiError(error) && error.code === 'UNAUTHENTICATED') return null
        // Không tới được Keycloak: vào app bằng hồ sơ đã cất
      }
      if (tokens !== null) {
        try {
          // Đọc lại hồ sơ để thấy vai trò, trạng thái, tên mới; không đọc được (máy chủ lỗi, mất sóng) thì dùng bản đã cất
          profile = await profileFor(tokens.accessToken)
          live = { tokens: live?.tokens ?? tokens, profile }
        } catch (error) {
          if (isApiError(error) && SESSION_ENDING.includes(error.code)) {
            await forget().catch(() => undefined)
            return null
          }
        }
      }
      try {
        return sessionOf(profile, live?.tokens.refreshToken ?? stored.refreshToken)
      } catch {
        // Vai trò không còn dùng được hoặc tài khoản đã bị khoá
        await forget().catch(() => undefined)
        return null
      }
    },

    signOut: forget,

    async accessToken() {
      if (live === null) return null
      return (await freshTokens()).accessToken
    },

    async renewAccessToken(rejected) {
      const current = live
      if (current === null) throw new ApiError('UNAUTHENTICATED')
      if (refreshing !== null) return (await refreshing).accessToken
      // Token đã được làm mới từ lúc lượt gọi bị từ chối rời máy: gọi lại bằng token mới, không làm mới thêm
      if (current.tokens.accessToken !== rejected) return current.tokens.accessToken
      return (await renewOnce(current)).accessToken
    },

    backendUserId() {
      return live === null ? null : String(live.profile.id)
    },
  }
}
