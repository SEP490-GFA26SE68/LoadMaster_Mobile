/**
 * Hàm → endpoint backend của Đặt lại mật khẩu (endpoint mở: không gửi token); mỗi nguồn là một adapter (`password-reset-http.ts`
 * backend). Kho mẫu không có đặt lại mật khẩu: nguồn mẫu không làm được việc nào (`supported: false`) và màn đăng nhập không hiện lối vào.
 *   requestCode      POST /api/auth/password-reset/request
 *   verifyCode       POST /api/auth/password-reset/verify
 *   resetPassword    POST /api/auth/password-reset/reset
 */
import { createAdapter } from '@/data/adapter'
import { ApiError } from '@/data/http'

import { httpPasswordReset } from './password-reset-http'

/**
 * Hợp đồng của Đặt lại mật khẩu. Máy chủ nói lý do từ chối bằng mã thì giữ mã đó: xin mã `OTP_RESEND_COOLDOWN`,
 * `OTP_REQUEST_LIMIT_EXCEEDED`; xác nhận `OTP_EXPIRED`, `OTP_INCORRECT`, `OTP_ATTEMPTS_EXCEEDED`. Không kèm mã thì mỗi bước một mã chung:
 * `RESET_REQUEST_REFUSED` (vừa xin mã, hoặc xin quá nhiều lần), `RESET_CODE_INVALID` (mã sai, hết hạn hoặc hết lượt thử). Đặt mật khẩu bị
 * từ chối luôn là `RESET_SESSION_EXPIRED` (phiên đặt lại hết hạn): màn quay về bước nhập email.
 */
export type PasswordResetApi = {
  /** Nguồn đang dùng làm được việc này. */
  readonly supported: boolean
  // POST /api/auth/password-reset/request — luôn thành công dù email có tài khoản hay không (không lộ email nào có thật)
  requestCode(email: string): Promise<void>
  // POST /api/auth/password-reset/verify — trả mã phiên đặt lại
  verifyCode(email: string, otp: string): Promise<string>
  // POST /api/auth/password-reset/reset
  resetPassword(resetToken: string, newPassword: string): Promise<void>
}

const notSupported = () => Promise.reject(new ApiError('NOT_SUPPORTED'))

const UNSUPPORTED: PasswordResetApi = { supported: false, requestCode: notSupported, verifyCode: notSupported, resetPassword: notSupported }

/** Đặt lại mật khẩu đi theo nguồn của đăng nhập: chỉ có khi đăng nhập dùng Keycloak của backend. */
const adapter = createAdapter<PasswordResetApi>('auth', { mock: () => UNSUPPORTED, http: () => httpPasswordReset() })

// POST /api/auth/password-reset/request · POST /api/auth/password-reset/verify · POST /api/auth/password-reset/reset
export function passwordResetApi(): PasswordResetApi {
  return adapter()
}
