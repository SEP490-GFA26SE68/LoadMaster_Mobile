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

type AuthBase = {
  /** Mở lại phiên từ chuỗi đã cất; `null` khi phiên không còn dùng được. */
  restore(saved: string): Promise<AuthSession | null>
  signOut(): Promise<void>
  /** Token gửi kèm mỗi lượt gọi backend; `null` khi nguồn không dùng token. */
  accessToken(): Promise<string | null>
}

export type PasswordAuth = AuthBase & {
  readonly kind: 'password'
  signIn(email: string, password: string): Promise<AuthSession>
}

export type RedirectAuth = AuthBase & {
  readonly kind: 'redirect'
  signIn(): Promise<AuthSession>
}

export type AuthAdapter = PasswordAuth | RedirectAuth
