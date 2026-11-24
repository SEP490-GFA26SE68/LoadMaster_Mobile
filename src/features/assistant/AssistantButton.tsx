import { useRouter } from 'expo-router'
import { Image, Pressable, StyleSheet } from 'react-native'

import { useAuth } from '@/features/auth/AuthProvider'
import { useT } from '@/lib/i18n'
import { colors, radius, TOUCH } from '@/theme/tokens'

import { assistantShown } from './assistant-visibility'
import { LUMO_WINK_BASE64 } from './lumo-faces'

const WINK = { uri: `data:image/webp;base64,${LUMO_WINK_BASE64}` }

export type AssistantButtonProps = {
  /** Màn đang mở theo route của bản web (`/tai-xe`, `/kho`): máy chủ hiểu route web, câu "Màn này dùng để làm gì?" đi kèm nó. */
  page: string
  /** Tên màn đang mở trên app. */
  title: string
}

/**
 * Nút "Trợ lý AI" 56 × 56 nền đặc trên dải trời của màn kho và màn tài xế (như `TouchAssistant` của bản web): ảnh Lumo nháy mắt, tên chỉ ở
 * nhãn đọc. Mở màn trò chuyện kèm màn đang mở. Chỉ có khi trợ lý dùng được cho người này (`assistant-visibility.ts`).
 */
export function AssistantButton({ page, title }: AssistantButtonProps) {
  const t = useT()
  const router = useRouter()
  const { user } = useAuth()
  if (!assistantShown(user)) return null
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('assistant.launcher.labelApp')}
      onPress={() => router.push({ pathname: '/assistant', params: { page, title } })}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}>
      <Image source={WINK} style={styles.face} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no" />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.skySolid,
    borderColor: colors.skySolidBorder,
    overflow: 'hidden',
  },
  pressed: { backgroundColor: colors.skySolidPressed },
  face: { width: 44, height: 44 },
})
