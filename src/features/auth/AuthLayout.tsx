import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppText } from '@/components/AppText'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, radius, shadow, space } from '@/theme/tokens'

/** Khung của màn đăng nhập và Đặt lại mật khẩu: tên app, nút đổi ngôn ngữ và một câu giới thiệu trên nền dải trời. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const t = useT()
  const insets = useSafeAreaInsets()
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
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/** Thẻ trắng chứa form; tiêu đề thẻ là tiêu đề của màn. */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sky },
  scroll: { flexGrow: 1, paddingHorizontal: space[4], alignItems: 'center' },
  column: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, gap: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  card: { gap: space[4], padding: space[5], borderRadius: radius.xl, backgroundColor: colors.bg, ...shadow.card },
})
