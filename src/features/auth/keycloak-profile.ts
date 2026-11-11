import { z } from 'zod'

import { ApiError, isApiError } from '@/data/http'
import type { Role, User } from '@/types/user'

import { isActiveOnBackend, roleOfBackend, userFromBackend, type BackendUserProfile } from './backend-user'

/** Hồ sơ `GET /api/users/me` của backend → người dùng của app, và chuỗi phiên cất trong kho khoá của máy. Thuần, không gọi mạng. */

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

export function profileOf(raw: unknown): BackendUserProfile | null {
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

/** Chuỗi cất: refresh token kèm hồ sơ (mở app lúc mất sóng vẫn vào được). Token truy cập không bao giờ được cất. */
export const savedOf = (refreshToken: string, profile: BackendUserProfile) => JSON.stringify({ v: 1, refreshToken, profile })

/** Đọc chuỗi cất; `null` khi không phải phiên Keycloak (vd. phiên của kho mẫu trước khi đổi nguồn). */
export function readSaved(saved: string): { readonly refreshToken: string; readonly profile: BackendUserProfile } | null {
  const stored = savedSchema.safeParse(parseJson(saved))
  if (!stored.success) return null
  const profile = profileOf(stored.data.profile)
  return profile === null ? null : { refreshToken: stored.data.refreshToken, profile }
}

/** Vai trò app biết và tài khoản còn hoạt động; không thì lỗi có mã. */
export function roleOf(profile: BackendUserProfile): Role {
  const role = roleOfBackend(profile.userRoleType)
  if (role === null) throw new ApiError('ROLE_UNKNOWN', { params: { role: profile.userRoleType } })
  if (!isActiveOnBackend(profile.status)) throw new ApiError('ACCOUNT_SUSPENDED')
  return role
}

/** Có tài khoản mẫu: mã, công ty là của nó (dữ liệu mẫu gắn với các mã đó), kho của nó bị bỏ; không thì mọi thứ là của backend. */
export function userOf(profile: BackendUserProfile, role: Role, standIn: User | null): User {
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

/** `GET /api/users/me` lỗi → mã của màn đăng nhập. */
export function profileError(error: unknown): ApiError {
  if (!isApiError(error)) return new ApiError('PROFILE_UNAVAILABLE')
  // Backend không nhận token Keycloak vừa cấp: app gọi Keycloak qua địa chỉ khác địa chỉ backend tin, hoặc client của app không gắn
  // audience mà backend đòi
  if (error.code === 'UNAUTHENTICATED') return new ApiError('SIGN_IN_REJECTED')
  // Tài khoản Keycloak chưa gắn với người dùng nào của backend: 404, kèm mã `USER_NOT_FOUND` hoặc không
  if (error.status === 404) return new ApiError('PROFILE_NOT_FOUND')
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') return error
  return new ApiError('PROFILE_UNAVAILABLE')
}
