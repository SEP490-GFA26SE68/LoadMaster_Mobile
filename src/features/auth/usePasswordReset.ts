import { useMutation } from '@tanstack/react-query'

import { passwordResetApi, type PasswordResetApi } from './password-reset-api'

/**
 * Nguồn của Đặt lại mật khẩu khi nguồn đang dùng làm được việc này; `null` thì màn không có lối vào (kho mẫu, nguồn chưa nối).
 * `injected` chỉ truyền trong test.
 */
export function usePasswordReset(injected?: PasswordResetApi): PasswordResetApi | null {
  if (injected !== undefined) return injected.supported ? injected : null
  try {
    const api = passwordResetApi()
    return api.supported ? api : null
  } catch {
    return null
  }
}

/** Ba bước của Đặt lại mật khẩu. Không đọc, không làm mới dữ liệu nào của app: người dùng chưa đăng nhập. */
export function usePasswordResetSteps(api: PasswordResetApi) {
  const request = useMutation({ mutationFn: (email: string) => api.requestCode(email) })
  const verify = useMutation({ mutationFn: ({ email, otp }: { email: string; otp: string }) => api.verifyCode(email, otp) })
  const reset = useMutation({ mutationFn: ({ resetToken, password }: { resetToken: string; password: string }) => api.resetPassword(resetToken, password) })
  return { request, verify, reset }
}
