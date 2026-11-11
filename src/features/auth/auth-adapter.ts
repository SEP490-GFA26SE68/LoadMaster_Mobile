import { isApiError } from '@/data/http'
import type { User } from '@/types/user'

/**
 * Hợp đồng đăng nhập của app, không phụ thuộc nguồn: email + mật khẩu gõ ở form của app, cả với kho mẫu lẫn Keycloak của backend
 * (bản web dùng cùng cách). Phần còn lại của app chỉ biết `AuthSession`.
 */
export type AuthSession = {
  readonly user: User
  /** Chuỗi app cất vào kho khoá của máy để mở lại phiên ở lần sau; nghĩa của nó do adapter quyết định. */
  readonly saved: string
}

/** Khoá cất phiên trong kho khoá của máy (`@/lib/storage`). */
export const SESSION_KEY = 'phien'

/** Mật khẩu đúng nhưng tài khoản phải đặt mật khẩu mới (mật khẩu tạm): màn đăng nhập mở lối đặt lại mật khẩu. */
export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED'

export function isPasswordChangeRequired(error: unknown): boolean {
  return isApiError(error) && error.code === PASSWORD_CHANGE_REQUIRED
}

export type AuthAdapter = {
  /** Thất bại thì ném lỗi có mã; không để lại phiên nào ở máy chủ định danh. */
  signIn(email: string, password: string): Promise<AuthSession>
  /** Mở lại phiên từ chuỗi đã cất; `null` khi phiên không còn dùng được. */
  restore(saved: string): Promise<AuthSession | null>
  /** Quên phiên ngay ở phần chạy đồng bộ (trước lần `await` đầu tiên), rồi mới đóng phiên ở máy chủ. */
  signOut(): Promise<void>
  /** Token gửi kèm mỗi lượt gọi backend; `null` khi nguồn không dùng token. */
  accessToken(): Promise<string | null>
  /**
   * Backend trả 401 cho token `rejected`: làm mới một lần (chung với lượt làm mới đang chạy) và trả token mới để gọi lại; `null` khi nguồn
   * không dùng token. Không làm mới được nữa: `UNAUTHENTICATED`.
   */
  renewAccessToken(rejected: string): Promise<string | null>
  /** Mã người dùng của backend của phiên đang mở (endpoint của tài xế gửi kèm mã này); `null` khi chưa đăng nhập hoặc đăng nhập trên kho mẫu. */
  backendUserId(): string | null
}
