import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { AppText } from './AppText'
import { Button } from './Button'

/**
 * Ba trạng thái chung của một màn đọc dữ liệu: đang tải, lỗi (kèm thử lại), chưa có gì.
 *
 * Đang tải là một phần tử đọc duy nhất (vai trò `progressbar`, tên là chữ hiện ra); `label` thay câu chung "Đang tải…" khi màn nói được
 * cụ thể hơn ("Đang tải chuyến", "Đang bắt đầu soạn hàng").
 */
export function LoadingState({ label }: { label?: string } = {}) {
  const t = useT()
  const text = label ?? t('common.loading')
  return (
    <View style={styles.center} accessible accessibilityRole="progressbar" accessibilityLabel={text}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText color={colors.text2}>{text}</AppText>
    </View>
  )
}

/**
 * Lần đọc lỗi, kèm nút thử lại. Câu lỗi mang vai trò `alert` trong vùng `accessibilityLiveRegion` như `Banner` — vai trò `alert` một mình
 * không được trình đọc màn hình đọc lên.
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useT()
  return (
    <View style={styles.center}>
      <AppText variant="heading" accessibilityRole="header">
        {t('common.loadFailed')}
      </AppText>
      <AppText color={colors.text2} style={styles.text} accessibilityRole="alert" accessibilityLiveRegion="polite">
        {message}
      </AppText>
      <Button variant="secondary" onPress={onRetry}>
        {t('common.retry')}
      </Button>
    </View>
  )
}

/**
 * Chưa có gì để hiện, hoặc vì sao màn không làm được việc của nó. `alert`: câu là một lỗi (hay kết quả "không tìm thấy" của lần tra) —
 * vai trò `alert` trong vùng `accessibilityLiveRegion` như `ErrorState`, nên trình đọc màn hình đọc ngay khi hiện.
 */
export function EmptyState({ title, description, alert = false }: { title: string; description: string; alert?: boolean }) {
  return (
    <View style={styles.center}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      <AppText
        color={colors.text2}
        style={styles.text}
        accessibilityRole={alert ? 'alert' : undefined}
        accessibilityLiveRegion={alert ? 'polite' : 'none'}>
        {description}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6] },
  text: { textAlign: 'center' },
})
