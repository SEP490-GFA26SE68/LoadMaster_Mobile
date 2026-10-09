import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { TextField } from '@/components/TextField'
import { dataConfig } from '@/data/config'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, radius, shadow, space } from '@/theme/tokens'

import { useAuth } from './AuthProvider'
import { DemoAccounts } from './DemoAccounts'
import { signInSchema, type SignInValues } from './sign-in-form'

/** Màn đăng nhập: thẻ trắng trên nền dải trời. Nút "Đăng nhập" là nút chính duy nhất của màn. */
export function SignInScreen() {
  const t = useT()
  const insets = useSafeAreaInsets()
  const auth = useAuth()
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } })

  const submit = form.handleSubmit(async ({ email, password }) => {
    setFailure(null)
    try {
      await auth.signIn(email, password)
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  })

  // Câu lỗi của schema là key từ điển không có tham số (`sign-in-form.ts`)
  const errorOf = (key: string | undefined) => (key === undefined ? undefined : (t as unknown as (key: string) => string)(key))

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[6] }]}>
        <View style={styles.column}>
          <View style={styles.head}>
            <AppText variant="display" color={colors.skyText} accessibilityRole="header">
              LoadMaster
            </AppText>
            <LanguageSwitch tone="sky" />
          </View>
          <AppText color={colors.skyText2}>{t('auth.login.subtitle')}</AppText>

          <View style={styles.card}>
            <AppText variant="title" accessibilityRole="header">
              {t('auth.login.title')}
            </AppText>
            {failure !== null && <Banner tone="danger">{failure}</Banner>}
            {auth.kind === 'password' && (
              <>
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <TextField
                      label={t('auth.login.email')}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={errorOf(fieldState.error?.message)}
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
                      error={errorOf(fieldState.error?.message)}
                      secure
                      autoComplete="current-password"
                      textContentType="password"
                      returnKeyType="go"
                      onSubmitEditing={() => void submit()}
                    />
                  )}
                />
              </>
            )}
            <Button loading={form.formState.isSubmitting} onPress={() => void (auth.kind === 'password' ? submit() : auth.signIn().catch((error: unknown) => setFailure(dataErrorMessage(error, t))))}>
              {t('auth.login.submit')}
            </Button>
          </View>

          {auth.kind === 'password' && dataConfig.sources.auth === 'mock' && (
            <DemoAccounts
              onPick={(email, password) => {
                setFailure(null)
                form.reset({ email, password })
              }}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sky },
  scroll: { flexGrow: 1, paddingHorizontal: space[4], alignItems: 'center' },
  column: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, gap: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  card: { gap: space[4], padding: space[5], borderRadius: radius.xl, backgroundColor: colors.bg, ...shadow.card },
})
