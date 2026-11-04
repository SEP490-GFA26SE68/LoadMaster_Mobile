import { useCallback, useState } from 'react'

import { AuthLayout } from './AuthLayout'
import { ForgotPasswordFlow } from './ForgotPasswordFlow'
import type { PasswordResetApi } from './password-reset-api'
import { SignInForm } from './SignInForm'
import { usePasswordReset } from './usePasswordReset'

type Mode =
  | { readonly kind: 'signIn'; readonly email: string; readonly afterReset: boolean }
  | { readonly kind: 'forgot'; readonly email: string }

/**
 * Màn đăng nhập: form email và mật khẩu ngay trong app (cả kho mẫu lẫn Keycloak của backend). Khi nguồn đăng nhập làm được, màn có
 * Đặt lại mật khẩu ngay tại chỗ — không phải một route riêng: xong thì về đăng nhập với email đã điền. `passwordReset` chỉ truyền trong test.
 */
export function SignInScreen({ passwordReset }: { passwordReset?: PasswordResetApi }) {
  const reset = usePasswordReset(passwordReset)
  const [mode, setMode] = useState<Mode>({ kind: 'signIn', email: '', afterReset: false })
  const backToSignIn = useCallback((email: string) => setMode({ kind: 'signIn', email, afterReset: false }), [])

  return (
    <AuthLayout>
      {mode.kind === 'forgot' && reset !== null ? (
        <ForgotPasswordFlow
          api={reset}
          initialEmail={mode.email}
          onDone={(email) => setMode({ kind: 'signIn', email, afterReset: true })}
          onCancel={backToSignIn}
        />
      ) : (
        <SignInForm
          initialEmail={mode.email}
          afterReset={mode.kind === 'signIn' && mode.afterReset}
          onForgot={reset === null ? undefined : (email) => setMode({ kind: 'forgot', email })}
        />
      )}
    </AuthLayout>
  )
}
