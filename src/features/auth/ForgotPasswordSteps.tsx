import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors } from '@/theme/tokens'

import {
  fieldErrorText,
  resetCodeSchema,
  resetEmailSchema,
  resetPasswordSchema,
  type ResetCodeValues,
  type ResetEmailValues,
  type ResetPasswordValues,
} from './sign-in-form'

/** Máy chủ chỉ gửi mã mới sau ngần này kể từ lần gửi trước. */
export const RESEND_COOLDOWN_MS = 60_000

/** Lỗi của bước, hoặc câu báo của bước khi không có lỗi. */
function StepNotice({ error, notice }: { error: unknown; notice?: string | null | undefined }) {
  const t = useT()
  if (error !== null && error !== undefined) return <Banner tone="danger">{dataErrorMessage(error, t)}</Banner>
  if (notice !== null && notice !== undefined) return <Banner tone="success">{notice}</Banner>
  return null
}

type EmailStepProps = {
  readonly initialEmail: string
  /** Câu nói vì sao quay về bước này (phiên đặt lại vừa hết hạn). */
  readonly reason: string | null
  readonly onSubmit: (email: string) => Promise<void>
  readonly onCancel: (email: string) => void
}

/** Bước 1: email nhận mã. */
export function ResetEmailStep({ initialEmail, reason, onSubmit, onCancel }: EmailStepProps) {
  const t = useT()
  const [error, setError] = useState<unknown>(null)
  const form = useForm<ResetEmailValues>({ resolver: zodResolver(resetEmailSchema), defaultValues: { email: initialEmail } })
  const submit = form.handleSubmit(async ({ email }) => {
    setError(null)
    await onSubmit(email).catch(setError)
  })

  return (
    <>
      {error === null && reason !== null && <Banner tone="warning">{reason}</Banner>}
      <StepNotice error={error} />
      <AppText color={colors.text2}>{t('auth.forgot.emailIntro')}</AppText>
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.login.email')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldErrorText(t, fieldState.error?.message)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            returnKeyType="send"
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      <Button loading={form.formState.isSubmitting} onPress={() => void submit()}>
        {t('auth.forgot.sendCode')}
      </Button>
      <Button variant="secondary" onPress={() => onCancel(form.getValues('email').trim())}>
        {t('auth.forgot.backToSignIn')}
      </Button>
    </>
  )
}

/** Số giây còn phải chờ trước khi xin được mã mới, đếm lùi mỗi giây; 0 khi đã xin được. */
function useResendWait(sentAt: number): number {
  const until = sentAt + RESEND_COOLDOWN_MS
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [until])
  // Vừa gửi lại mã mà nhịp đếm chưa chạy: `now` còn là lúc nhịp trước dừng, không để số giây vượt quá thời gian chờ
  return Math.min(RESEND_COOLDOWN_MS / 1000, Math.max(0, Math.ceil((until - now) / 1000)))
}

type CodeStepProps = {
  readonly email: string
  /** Lúc máy chủ nhận lần gửi mã gần nhất. */
  readonly sentAt: number
  /** Vừa gửi lại mã: thẻ báo đã gửi. */
  readonly resent: boolean
  readonly onVerify: (otp: string) => Promise<void>
  readonly onResend: () => Promise<void>
  readonly onChangeEmail: () => void
}

/** Bước 2: mã xác nhận 6 số gửi tới email. */
export function ResetCodeStep({ email, sentAt, resent, onVerify, onResend, onChangeEmail }: CodeStepProps) {
  const t = useT()
  const [error, setError] = useState<unknown>(null)
  const [resending, setResending] = useState(false)
  const wait = useResendWait(sentAt)
  const form = useForm<ResetCodeValues>({ resolver: zodResolver(resetCodeSchema), defaultValues: { code: '' } })
  const submit = form.handleSubmit(async ({ code }) => {
    setError(null)
    await onVerify(code).catch(setError)
  })
  const resend = async () => {
    setError(null)
    setResending(true)
    await onResend().catch(setError)
    setResending(false)
  }

  return (
    <>
      <StepNotice error={error} notice={resent ? t('auth.forgot.resent', { email }) : null} />
      <AppText color={colors.text2}>{t('auth.forgot.codeIntro', { email })}</AppText>
      <Controller
        control={form.control}
        name="code"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.forgot.code')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldErrorText(t, fieldState.error?.message)}
            code
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      <Button loading={form.formState.isSubmitting} onPress={() => void submit()}>
        {t('auth.forgot.verify')}
      </Button>
      <Button variant="secondary" loading={resending} disabled={wait > 0} onPress={() => void resend()}>
        {t('auth.forgot.resend')}
      </Button>
      {wait > 0 && <AppText color={colors.text2}>{t('auth.forgot.resendIn', { count: wait })}</AppText>}
      <Button variant="secondary" onPress={onChangeEmail}>
        {t('auth.forgot.changeEmail')}
      </Button>
    </>
  )
}

type PasswordStepProps = {
  readonly email: string
  readonly onSubmit: (password: string) => Promise<void>
  readonly onCancel: () => void
}

/** Bước 3: mật khẩu mới, nhập hai lần. */
export function ResetPasswordStep({ email, onSubmit, onCancel }: PasswordStepProps) {
  const t = useT()
  const [error, setError] = useState<unknown>(null)
  const form = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirm: '' } })
  const submit = form.handleSubmit(async ({ password }) => {
    setError(null)
    await onSubmit(password).catch(setError)
  })

  return (
    <>
      <StepNotice error={error} />
      <AppText color={colors.text2}>{t('auth.forgot.passwordIntro', { email })}</AppText>
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.forgot.newPassword')}
            hint={t('auth.forgot.newPasswordHint')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldErrorText(t, fieldState.error?.message)}
            secure
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={form.control}
        name="confirm"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.forgot.confirm')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldErrorText(t, fieldState.error?.message)}
            secure
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      <Button loading={form.formState.isSubmitting} onPress={() => void submit()}>
        {t('auth.forgot.submit')}
      </Button>
      <Button variant="secondary" onPress={onCancel}>
        {t('auth.forgot.backToSignIn')}
      </Button>
    </>
  )
}
