import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { AppText } from './AppText'
import { Button } from './Button'

/** Ba trạng thái chung của một màn đọc dữ liệu: đang tải, lỗi (kèm thử lại), chưa có gì. */
export function LoadingState() {
  const t = useT()
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText color={colors.text2}>{t('common.loading')}</AppText>
    </View>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useT()
  return (
    <View style={styles.center}>
      <AppText variant="heading" accessibilityRole="header">
        {t('common.loadFailed')}
      </AppText>
      <AppText color={colors.text2} style={styles.text} accessibilityRole="alert">
        {message}
      </AppText>
      <Button variant="secondary" onPress={onRetry}>
        {t('common.retry')}
      </Button>
    </View>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.center}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      <AppText color={colors.text2} style={styles.text}>
        {description}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6] },
  text: { textAlign: 'center' },
})
