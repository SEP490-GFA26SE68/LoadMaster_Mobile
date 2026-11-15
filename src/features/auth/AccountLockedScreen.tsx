import { LogOut } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { Screen } from '@/components/Screen'
import { useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { AccountLock } from './account-lock'
import { useAuth } from './AuthProvider'

/**
 * Màn thay cả nhóm đã đăng nhập khi tài khoản bị khoá ở máy chủ (`account-lock.ts`): nói lý do, ai mở lại được, và lối ra duy nhất là
 * đăng xuất — mọi màn khác chỉ nhận 403. Ký thoả thuận, gia hạn gói là việc của bản web.
 */
export function AccountLockedScreen({ reason }: { reason: AccountLock }) {
  const t = useT()
  const { user, signOut } = useAuth()
  return (
    <Screen
      title={t(`accountLock.${reason}.badge`)}
      scroll
      footer={
        <Button icon={LogOut} onPress={() => void signOut()}>
          {t('accountLock.signOut')}
        </Button>
      }>
      <Card>
        <AppText variant="heading" accessibilityRole="header">
          {t(`accountLock.${reason}.title`)}
        </AppText>
        <AppText color={colors.text2}>{t(`accountLock.${reason}.body`)}</AppText>
        {user !== null && <AppText color={colors.text2}>{user.email}</AppText>}
      </Card>
      <Banner tone="warning">
        {t(`accountLock.${reason}.nextBody`)}
      </Banner>
      <View style={styles.language}>
        <AppText variant="label">{t('language.label')}</AppText>
        <LanguageSwitch />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  language: { gap: space[2] },
})
