import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, LogIn, Mail } from 'lucide-react-native'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Lumo } from '@/components/Lumo'
import { TextField } from '@/components/TextField'
import { dataConfig } from '@/data/config'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

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

/**
 * Thẻ đăng nhập bằng email và mật khẩu (V2.3 nâng cấp đồng bộ Web V2.3):
 * - Linh vật Lumo chào đón kèm lời chúc thân thiện
 * - Ô nhập có icon trực quan (Mail, Lock)
 * - Nút chính Đăng nhập nổi bật chuẩn nhận diện Cyan kính
 */
export function SignInForm({ initialEmail, afterReset, onForgot }: SignInFormProps) {
  const t = useT()
  const auth = useAuth()
  const [failure, setFailure] = useState<Failure | null>(null)
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: initialEmail, password: '' },
  })

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
      setFailure({
        message: dataErrorMessage(error, t),
        passwordChange: isPasswordChangeRequired(error) && onForgot !== undefined,
      })
    }
  })

  const forgot = onForgot === undefined ? undefined : () => onForgot(form.getValues('email').trim())

  const headerSlot = (
    <View style={styles.greetingCard}>
      <Lumo size={72} />
      <View style={styles.greetingText}>
        <AppText variant="meta" color={colors.primary} style={styles.greetingBadge}>
          {t('auth.login.greeting')}
        </AppText>
        <AppText variant="title" color={colors.text} accessibilityRole="header" style={styles.greetingTitle}>
          {t('auth.login.title')}
        </AppText>
        <AppText variant="meta" color={colors.text2}>
          {t('auth.login.subtitle')}
        </AppText>
      </View>
    </View>
  )

  return (
    <>
      <AuthCard headerSlot={headerSlot}>
        {failure === null && afterReset && <Banner tone="success">{t('auth.login.resetDone')}</Banner>}
        {failure !== null && <Banner tone="danger">{failure.message}</Banner>}

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              label={t('auth.login.email')}
              placeholder={t('auth.login.emailPlaceholder')}
              icon={Mail}
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
              icon={Lock}
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

        <View style={styles.actions}>
          <Button
            icon={LogIn}
            loading={form.formState.isSubmitting}
            onPress={() => void submit()}
          >
            {t('auth.login.submit')}
          </Button>

          {forgot !== undefined && (
            <Button variant="secondary" onPress={forgot}>
              {failure?.passwordChange === true ? t('auth.login.setNewPassword') : t('auth.login.forgot')}
            </Button>
          )}
        </View>
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

const styles = StyleSheet.create({
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: space[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 195, 212, 0.12)',
  },
  greetingText: {
    flex: 1,
    gap: 2,
  },
  greetingBadge: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  actions: {
    gap: 10,
    marginTop: space[1],
  },
})
