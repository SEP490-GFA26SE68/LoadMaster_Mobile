import { useEffect, useState } from 'react'
import { BackHandler } from 'react-native'

import { AppText } from '@/components/AppText'
import { isApiError } from '@/data/http'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors } from '@/theme/tokens'

import { AuthCard } from './AuthLayout'
import { ResetCodeStep, ResetEmailStep, ResetPasswordStep } from './ForgotPasswordSteps'
import type { PasswordResetApi } from './password-reset-api'
import { usePasswordResetSteps } from './usePasswordReset'

type Step =
  /** `reason`: câu nói vì sao quay về bước đầu. */
  | { readonly kind: 'email'; readonly reason: string | null }
  | { readonly kind: 'code'; readonly sentAt: number; readonly resent: boolean }
  | { readonly kind: 'password'; readonly resetToken: string }

const STEP_NUMBER = { email: 1, code: 2, password: 3 } as const

type ForgotPasswordFlowProps = {
  readonly api: PasswordResetApi
  readonly initialEmail: string
  /** Đã đặt mật khẩu mới cho email này. */
  readonly onDone: (email: string) => void
  /** Về màn đăng nhập (hoặc màn đã mở bước này), giữ email đang nhập. */
  readonly onCancel: (email: string) => void
  /** Chữ của nút thoát; vắng là "Về đăng nhập". */
  readonly cancelLabel?: string
}

/**
 * Đặt lại mật khẩu qua mã gửi tới email, ngay trong màn đăng nhập: email → mã 6 số → mật khẩu mới. Phiên đặt lại hết hạn ở bước cuối thì
 * quay về bước đầu kèm lý do. Nút quay lại của Android lùi về bước đầu, rồi về màn đăng nhập.
 */
export function ForgotPasswordFlow({ api, initialEmail, onDone, onCancel, cancelLabel }: ForgotPasswordFlowProps) {
  const t = useT()
  const { request, verify, reset } = usePasswordResetSteps(api)
  const [email, setEmail] = useState(initialEmail)
  const [step, setStep] = useState<Step>({ kind: 'email', reason: null })

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step.kind === 'email') onCancel(email)
      else setStep({ kind: 'email', reason: null })
      return true
    })
    return () => subscription.remove()
  }, [email, onCancel, step.kind])

  const sendCode = async (address: string) => {
    await request.mutateAsync(address)
    setEmail(address)
    setStep({ kind: 'code', sentAt: Date.now(), resent: false })
  }

  const resendCode = async () => {
    await request.mutateAsync(email)
    setStep({ kind: 'code', sentAt: Date.now(), resent: true })
  }

  const verifyCode = async (otp: string) => {
    const resetToken = await verify.mutateAsync({ email, otp })
    setStep({ kind: 'password', resetToken })
  }

  const setPassword = (resetToken: string) => async (password: string) => {
    try {
      await reset.mutateAsync({ resetToken, password })
    } catch (error) {
      // Phiên đặt lại hết hạn: mã đã dùng không xin lại phiên được, phải bắt đầu lại từ email
      if (isApiError(error) && error.code === 'RESET_SESSION_EXPIRED') {
        setStep({ kind: 'email', reason: dataErrorMessage(error, t) })
        return
      }
      throw error
    }
    onDone(email)
  }

  return (
    <AuthCard title={t('auth.forgot.title')}>
      <AppText color={colors.text2}>{t('auth.forgot.step', { step: STEP_NUMBER[step.kind] })}</AppText>
      {step.kind === 'email' && <ResetEmailStep initialEmail={email} reason={step.reason} onSubmit={sendCode} onCancel={onCancel} cancelLabel={cancelLabel} />}
      {step.kind === 'code' && (
        <ResetCodeStep
          email={email}
          sentAt={step.sentAt}
          resent={step.resent}
          onVerify={verifyCode}
          onResend={resendCode}
          onChangeEmail={() => setStep({ kind: 'email', reason: null })}
        />
      )}
      {step.kind === 'password' && <ResetPasswordStep email={email} onSubmit={setPassword(step.resetToken)} onCancel={() => onCancel(email)} cancelLabel={cancelLabel} />}
    </AuthCard>
  )
}
