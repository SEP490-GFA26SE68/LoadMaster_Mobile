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
import { scopeNote } from './landing'

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

/** Mọi vai trò mở được: người đang đăng nhập, ngôn ngữ, app đang đọc dữ liệu từ đâu, đăng xuất. */
export function AccountScreen() {
  const t = useT()
  const format = useFormat()
  const { user, signOut } = useAuth()
  if (user === null) return null

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
