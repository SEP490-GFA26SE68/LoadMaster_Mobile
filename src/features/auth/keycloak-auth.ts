import { z } from 'zod'

import { ApiError, isApiError } from '@/data/http'
import type { Role, User } from '@/types/user'

import { SIGN_IN_CANCELLED, type AuthSession, type RedirectAuth } from './auth-adapter'
import { isActiveOnBackend, roleOfBackend, userFromBackend, type BackendUserProfile } from './backend-user'
import type { OAuthClient, TokenSet } from './keycloak-oauth'

/**
 * Phiên đăng nhập bằng Keycloak của backend. Phần giữ phiên nằm ở đây, tách khỏi thư viện đăng nhập (`keycloak-oauth.ts`) để test được:
 * - token truy cập sống 60 giây và chỉ ở trong bộ nhớ; mỗi lượt gọi backend lấy token qua `accessToken()`, sắp hết hạn thì làm mới —
 *   nhiều lượt gọi cùng lúc chung một lần làm mới;
 * - kho khoá của máy cất refresh token kèm hồ sơ (`saved`), cất lại mỗi khi Keycloak cấp refresh token mới;
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

const text = z
  .string()
  .nullish()
  .transform((value) => value ?? '')

const profileSchema = z.object({
  id: z.number(),
  keycloakId: text,
  username: text,
  email: text,
  fullName: text,
  phoneNumber: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  companyId: z
    .number()
    .nullish()
    .transform((value) => value ?? null),
  userRoleType: z.string(),
  status: z.string(),
})

const savedSchema = z.object({ v: z.literal(1), refreshToken: z.string().min(1), profile: profileSchema })

function profileOf(raw: unknown): BackendUserProfile | null {
  const parsed = profileSchema.safeParse(raw)
  if (!parsed.success) return null
  const profile = parsed.data
  // Tài khoản chưa khai họ tên vẫn có tên để hiện
  return { ...profile, fullName: profile.fullName || profile.username || profile.email }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

const savedOf = (refreshToken: string, profile: BackendUserProfile) => JSON.stringify({ v: 1, refreshToken, profile })

/** Vai trò app biết và tài khoản còn hoạt động; không thì lỗi có mã. */
function roleOf(profile: BackendUserProfile): Role {
  const role = roleOfBackend(profile.userRoleType)
  if (role === null) throw new ApiError('ROLE_UNKNOWN', { params: { role: profile.userRoleType } })
  if (!isActiveOnBackend(profile.status)) throw new ApiError('ACCOUNT_SUSPENDED')
  return role
}

/** Có tài khoản mẫu: mã, công ty là của nó (dữ liệu mẫu gắn với các mã đó), kho của nó bị bỏ; không thì mọi thứ là của backend. */
function userOf(profile: BackendUserProfile, role: Role, standIn: User | null): User {
  if (standIn !== null) return userFromBackend(profile, role, standIn)
  return {
    id: String(profile.id),
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phoneNumber ?? '',
    role,
    status: 'active',
    lastActiveAt: null,
    ...(profile.companyId === null ? {} : { companyId: String(profile.companyId) }),
  }
}

type Live = { readonly tokens: TokenSet; readonly profile: BackendUserProfile }

export function createKeycloakAuth({ oauth, readProfile, persist, standIn, now = Date.now }: KeycloakAuthDeps): RedirectAuth {
  let live: Live | null = null
  /** Tăng mỗi lần đăng xuất: lượt làm mới đang dở của phiên cũ không ghi đè phiên mới, không cất lại phiên đã xoá. */
  let generation = 0
  let refreshing: Promise<TokenSet> | null = null

  async function profileFor(accessToken: string): Promise<BackendUserProfile> {
    let raw: unknown
    try {
      raw = await readProfile(accessToken)
    } catch (error) {
      // Backend không nhận token Keycloak vừa cấp: app gọi Keycloak qua địa chỉ khác địa chỉ backend tin, hoặc client của app không
      // gắn audience mà backend đòi
      if (isApiError(error) && error.code === 'UNAUTHENTICATED') throw new ApiError('SIGN_IN_REJECTED')
      if (isApiError(error) && (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT')) throw error
      throw new ApiError('PROFILE_UNAVAILABLE')
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

  function freshTokens(): Promise<TokenSet> {
    const current = live
    if (current === null) return Promise.reject(new ApiError('UNAUTHENTICATED'))
    if (current.tokens.expiresAt - now() > MIN_VALIDITY_MS) return Promise.resolve(current.tokens)
    if (refreshing === null) {
      const run: Promise<TokenSet> = renew(current).finally(() => {
        if (refreshing === run) refreshing = null
      })
      refreshing = run
    }
    return refreshing
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
    kind: 'redirect',

    async signIn() {
      const tokens = await oauth.authorize()
      if (tokens === null) throw new ApiError(SIGN_IN_CANCELLED)
      try {
        if (tokens.refreshToken === null) throw new ApiError('SIGN_IN_FAILED')
        const profile = await profileFor(tokens.accessToken)
        const session = sessionOf(profile, tokens.refreshToken)
        live = { tokens, profile }
        return session
      } catch (error) {
        // Không vào được app (vai trò lạ, tài khoản bị khoá, không đọc được hồ sơ): đóng luôn phiên vừa mở ở Keycloak
        if (tokens.refreshToken !== null) void oauth.endSession(tokens.refreshToken).catch(() => undefined)
        throw error
      }
    },

    async restore(saved) {
      const stored = savedSchema.safeParse(parseJson(saved))
      if (!stored.success) return null
      let profile = profileOf(stored.data.profile)
      if (profile === null) return null
      // Token truy cập không được cất: mở app là làm mới ngay
      live = { tokens: { accessToken: '', refreshToken: stored.data.refreshToken, expiresAt: 0 }, profile }
      let tokens: TokenSet | null = null
      try {
        tokens = await freshTokens()
      } catch (error) {
        if (isApiError(error) && error.code === 'UNAUTHENTICATED') return null
        // Không tới được Keycloak: vào app bằng hồ sơ đã cất
      }
      if (tokens !== null) {
        try {
          // Đọc lại hồ sơ để thấy vai trò, trạng thái, tên mới; không đọc được thì dùng bản đã cất
          profile = await profileFor(tokens.accessToken)
          live = { tokens: live?.tokens ?? tokens, profile }
        } catch (error) {
          if (isApiError(error) && error.code === 'SIGN_IN_REJECTED') {
            await forget().catch(() => undefined)
            return null
          }
        }
      }
      try {
        return sessionOf(profile, live?.tokens.refreshToken ?? stored.data.refreshToken)
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

    backendUserId() {
      return live === null ? null : String(live.profile.id)
    },
  }
}
