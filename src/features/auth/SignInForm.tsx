import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { dataConfig } from '@/data/config'
import { dataErrorMessage, useT } from '@/lib/i18n'

import { isPasswordChangeRequired } from './auth-adapter'
import { AuthCard } from './AuthLayout'
import { useAuth } from './AuthProvider'
import { DemoAccounts } from './DemoAccounts'
import { fieldErrorText, signInSchema, type SignInValues } from './sign-in-form'

type Failure = {
  readonly message: string
  /** Máy chủ đòi đặt mật khẩu mới: nút phụ của thẻ mở Đặt lại mật khẩu với email đang nhập. */
  readonly passwordChange: boolean
}

type SignInFormProps = {
  /** Email điền sẵn (vừa đặt lại mật khẩu, hoặc vừa quay về từ bước đặt lại). */
  readonly initialEmail: string
  /** Vừa đặt lại mật khẩu xong: thẻ báo đã đặt, và máy chủ còn đòi mật khẩu mới thì không mời làm lại vòng đó. */
  readonly afterReset: boolean
  /** Mở Đặt lại mật khẩu với email đang nhập; vắng khi nguồn đăng nhập không làm được việc này (kho mẫu). */
  readonly onForgot?: ((email: string) => void) | undefined
}

/** Thẻ đăng nhập bằng email và mật khẩu. Nút "Đăng nhập" là nút chính duy nhất của màn. */
export function SignInForm({ initialEmail, afterReset, onForgot }: SignInFormProps) {
  const t = useT()
  const auth = useAuth()
  const [failure, setFailure] = useState<Failure | null>(null)
  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: initialEmail, password: '' } })

  const submit = form.handleSubmit(async ({ email, password }) => {
    setFailure(null)
    try {
      await auth.signIn(email, password)
    } catch (error) {
      if (isPasswordChangeRequired(error) && afterReset) {
        // Máy chủ đặt mật khẩu vừa đặt thành mật khẩu tạm: mời đặt lại lần nữa chỉ dẫn vào cùng vòng đó
        setFailure({ message: t('auth.login.resetNotApplied'), passwordChange: false })
        return
      }
      setFailure({ message: dataErrorMessage(error, t), passwordChange: isPasswordChangeRequired(error) && onForgot !== undefined })
    }
  })

  const forgot = onForgot === undefined ? undefined : () => onForgot(form.getValues('email').trim())

  return (
    <>
      <AuthCard title={t('auth.login.title')}>
        {failure === null && afterReset && <Banner tone="success">{t('auth.login.resetDone')}</Banner>}
        {failure !== null && <Banner tone="danger">{failure.message}</Banner>}
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
              returnKeyType="next"
            />
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              label={t('auth.login.password')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldErrorText(t, fieldState.error?.message)}
              secure
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
            />
          )}
        />
        <Button loading={form.formState.isSubmitting} onPress={() => void submit()}>
          {t('auth.login.submit')}
        </Button>
        {forgot !== undefined && (
          <Button variant="secondary" onPress={forgot}>
            {failure?.passwordChange === true ? t('auth.login.setNewPassword') : t('auth.login.forgot')}
          </Button>
        )}
      </AuthCard>

      {dataConfig.sources.auth === 'mock' && (
        <DemoAccounts
          onPick={(email, password) => {
            setFailure(null)
            form.reset({ email, password })
          }}
        />
      )}
    </>
  )
}
