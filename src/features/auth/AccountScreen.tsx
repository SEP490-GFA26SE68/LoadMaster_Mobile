import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { Screen } from '@/components/Screen'
import { dataConfig, FEATURES } from '@/data/config'
import { useFormat, useT } from '@/lib/i18n'
import { colors, radius, shadow, space } from '@/theme/tokens'
import { initialsOf } from '@/types/user'

import { useAuth } from './AuthProvider'
import { ForgotPasswordFlow } from './ForgotPasswordFlow'
import { scopeNote } from './landing'
import type { PasswordResetApi } from './password-reset-api'
import { usePasswordReset } from './usePasswordReset'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText color={colors.text2}>{label}</AppText>
      <AppText variant="label" style={styles.rowValue}>
        {value}
      </AppText>
    </View>
  )
}

type PasswordMode = 'idle' | 'changing' | 'changed'

/**
 * Mọi vai trò mở được: người đang đăng nhập, ngôn ngữ, app đang đọc dữ liệu từ đâu, đổi mật khẩu, đăng xuất. Đổi mật khẩu dùng lại ba bước
 * của Đặt lại mật khẩu (mã gửi tới email, điền sẵn email đăng nhập) — chỉ khi nguồn đăng nhập làm được việc đó (máy chủ; kho mẫu không gửi
 * được mã nên không có nút). Đổi xong vẫn giữ phiên. `passwordReset` chỉ truyền trong test.
 */
export function AccountScreen({ passwordReset }: { passwordReset?: PasswordResetApi } = {}) {
  const t = useT()
  const format = useFormat()
  const { user, signOut } = useAuth()
  const reset = usePasswordReset(passwordReset)
  const [password, setPassword] = useState<PasswordMode>('idle')
  const backToAccount = useCallback(() => setPassword('idle'), [])
  if (user === null) return null

  if (password === 'changing' && reset !== null) {
    return (
      <Screen title={t('account.changePassword')} scroll>
        <ForgotPasswordFlow
          api={reset}
          initialEmail={user.email}
          onDone={() => setPassword('changed')}
          onCancel={backToAccount}
          cancelLabel={t('account.backToAccount')}
        />
      </Screen>
    )
  }

  const note = scopeNote(user.role)
  const onHttp = FEATURES.filter((feature) => dataConfig.sources[feature] === 'http')
  const url = dataConfig.apiUrl ?? ''
  const source =
    dataConfig.mode === 'mock'
      ? t('account.dataSource.mock')
      : dataConfig.mode === 'http'
        ? t('account.dataSource.http', { url })
        : t('account.dataSource.mixed', { url, features: format.list(onHttp) })

  return (
    <Screen title={t('account.title')} scroll>
      <View style={styles.card}>
        <View style={styles.identity}>
          <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <AppText variant="heading" color={colors.onPrimary}>
              {initialsOf(user.fullName)}
            </AppText>
          </View>
          <View style={styles.identityText}>
            <AppText variant="heading">{user.fullName}</AppText>
            <AppText color={colors.text2}>{t(`roles.${user.role}`)}</AppText>
          </View>
        </View>
        <Row label={t('account.email')} value={user.email} />
        {user.phone !== '' && <Row label={t('account.phone')} value={user.phone} />}
        {user.depot !== undefined && <Row label={t('account.depot')} value={user.depot} />}
      </View>

      {note !== null && <Banner tone="info">{t(`account.scope.${note}`)}</Banner>}

      <View style={styles.card}>
        <AppText variant="label">{t('language.label')}</AppText>
        <LanguageSwitch />
      </View>

      <View style={styles.card}>
        <AppText variant="label">{t('account.dataSource.title')}</AppText>
        <AppText color={colors.text2}>{source}</AppText>
      </View>

      {password === 'changed' ? (
        <Banner tone="success" onDismiss={backToAccount}>
          {t('account.passwordChanged')}
        </Banner>
      ) : null}

      {reset === null ? null : (
        <Button variant="secondary" onPress={() => setPassword('changing')}>
          {t('account.changePassword')}
        </Button>
      )}

      <Button variant="secondary" onPress={() => void signOut()}>
        {t('account.signOut')}
      </Button>
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  identityText: { flex: 1, gap: 2 },
  avatar: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryFill },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[4], paddingTop: space[3], borderTopWidth: 1, borderTopColor: colors.lineSoft },
  rowValue: { flexShrink: 1, textAlign: 'right' },
})
