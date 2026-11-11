import { z } from 'zod'

import { ApiError, isApiError, publicApi, type ApiClient } from '@/data/http'

import type { PasswordResetApi } from './password-reset-api'

const verifiedSchema = z.object({ resetToken: z.string().min(1) })

/** Từng bước: mã `ErrorCode` máy chủ trả → mã app hiện câu. Mã có câu riêng giữ tên của máy chủ. */
const REQUEST_REFUSALS = new Map([
  ['OTP_RESEND_COOLDOWN', 'OTP_RESEND_COOLDOWN'],
  ['OTP_REQUEST_LIMIT_EXCEEDED', 'OTP_REQUEST_LIMIT_EXCEEDED'],
])

const VERIFY_REFUSALS = new Map([
  ['OTP_EXPIRED', 'OTP_EXPIRED'],
  ['OTP_INCORRECT', 'OTP_INCORRECT'],
  ['OTP_ATTEMPTS_EXCEEDED', 'OTP_ATTEMPTS_EXCEEDED'],
])

/** Mã phiên hết hạn, hoặc trỏ tới tài khoản không còn (404): cả hai phải bắt đầu lại từ bước nhập email. */
const RESET_REFUSALS = new Map([
  ['RESET_TOKEN_INVALID', 'RESET_SESSION_EXPIRED'],
  ['USER_NOT_FOUND', 'RESET_SESSION_EXPIRED'],
])

/**
 * Máy chủ từ chối một bước: mã nghiệp vụ đã biết đổi theo bảng của bước; 400 / 429 không kèm mã (máy chủ trước khi gắn mã) hoặc kèm mã
 * lạ đổi sang mã chung của bước, để màn hiện câu của app chứ không hiện câu thô. Lỗi khác (mất mạng, quá giờ, máy chủ lỗi) giữ nguyên mã.
 */
function refusedAs(fallback: string, known: ReadonlyMap<string, string>): (error: unknown) => never {
  return (error) => {
    if (!isApiError(error)) throw error
    const precise = known.get(error.code)
    if (precise !== undefined) throw new ApiError(precise, { status: error.status })
    if (error.status === 400 || error.status === 429) throw new ApiError(fallback, { status: error.status })
    throw error
  }
}

/** Adapter backend của Đặt lại mật khẩu. `client` chỉ truyền trong test. */
export function httpPasswordReset(client: () => ApiClient = publicApi): PasswordResetApi {
  return {
    supported: true,

    async requestCode(email) {
      await client()
        .post('/api/auth/password-reset/request', { body: { email } })
        .catch(refusedAs('RESET_REQUEST_REFUSED', REQUEST_REFUSALS))
    },

    async verifyCode(email, otp) {
      const data = await client()
        .post<unknown>('/api/auth/password-reset/verify', { body: { email, otp } })
        .catch(refusedAs('RESET_CODE_INVALID', VERIFY_REFUSALS))
      const verified = verifiedSchema.safeParse(data)
      if (!verified.success) throw new ApiError('SERVER_ERROR')
      return verified.data.resetToken
    },

    async resetPassword(resetToken, newPassword) {
      await client()
        .post('/api/auth/password-reset/reset', { body: { resetToken, newPassword } })
        .catch(refusedAs('RESET_SESSION_EXPIRED', RESET_REFUSALS))
    },
  }
}
