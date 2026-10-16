import { isApiError } from '@/data/http'
import type { User } from '@/types/user'

/**
 * Hợp đồng đăng nhập của app, không phụ thuộc nguồn. Hai kiểu:
 * - `password`: app tự có form email + mật khẩu (kho mẫu);
 * - `redirect`: app mở trang đăng nhập của máy chủ định danh rồi nhận phiên về (Keycloak của backend, dùng chung với bản web).
 * Màn đăng nhập vẽ theo `kind`; phần còn lại của app chỉ biết `AuthSession`.
 */
export type AuthSession = {
  readonly user: User
  /** Chuỗi app cất vào kho khoá của máy để mở lại phiên ở lần sau; nghĩa của nó do adapter quyết định. */
  readonly saved: string
}

/** Khoá cất phiên trong kho khoá của máy (`@/lib/storage`). */
export const SESSION_KEY = 'phien'

/** Người dùng đóng trang đăng nhập của máy chủ mà không đăng nhập: không phải lỗi, màn đăng nhập không báo gì. */
export const SIGN_IN_CANCELLED = 'SIGN_IN_CANCELLED'

export function isSignInCancelled(error: unknown): boolean {
  return isApiError(error) && error.code === SIGN_IN_CANCELLED
}

type AuthBase = {
  /** Mở lại phiên từ chuỗi đã cất; `null` khi phiên không còn dùng được. */
  restore(saved: string): Promise<AuthSession | null>
  /** Quên phiên ngay ở phần chạy đồng bộ (trước lần `await` đầu tiên), rồi mới đóng phiên ở máy chủ. */
  signOut(): Promise<void>
  /** Token gửi kèm mỗi lượt gọi backend; `null` khi nguồn không dùng token. */
  accessToken(): Promise<string | null>
  /** Mã người dùng của backend của phiên đang mở (endpoint của tài xế gửi kèm mã này); `null` khi chưa đăng nhập hoặc đăng nhập trên kho mẫu. */
  backendUserId(): string | null
}

export type PasswordAuth = AuthBase & {
  readonly kind: 'password'
  signIn(email: string, password: string): Promise<AuthSession>
}

export type RedirectAuth = AuthBase & {
  readonly kind: 'redirect'
  /** Người dùng đóng trang đăng nhập: ném lỗi `SIGN_IN_CANCELLED`. */
  signIn(): Promise<AuthSession>
}

export type AuthAdapter = PasswordAuth | RedirectAuth
