import { useRouter } from 'expo-router'
import { Bell } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { IconButton } from '@/components/IconButton'
import { useAuth } from '@/features/auth/AuthProvider'
import { useT } from '@/lib/i18n'
import { colors, palette } from '@/theme/tokens'

import { useReadNotifications } from './notification-read'
import { useDriverCapabilities, useNotificationsQuery } from './useDriverQueries'

/**
 * Chuông ở dải trời của "Chuyến của tôi" và màn điểm giao (như chuông 56 px của web ở màn tài xế): mở màn Thông báo. Có thông báo chưa đọc thì một chấm hổ
 * phách ở góc — chỉ để nhìn, tên đọc của nút nói số chưa đọc. Nguồn dữ liệu chưa có thông báo thì không có chuông.
 */
export function NotificationBell() {
  const t = useT()
  const router = useRouter()
  const { user } = useAuth()
  const { notifications } = useDriverCapabilities()
  const query = useNotificationsQuery(notifications)
  const read = useReadNotifications(user?.id ?? '')
  if (!notifications) return null
  const unread = (query.data ?? []).filter((entry) => !read.has(entry.id)).length
  return (
    <IconButton
      icon={Bell}
      tone="sky"
      label={unread > 0 ? t('notifications.labelUnread', { count: unread }) : t('notifications.label')}
      badge={unread > 0 ? <View style={styles.dot} /> : undefined}
      onPress={() => router.push('/notifications')}
    />
  )
}

const styles = StyleSheet.create({
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: palette.amber[500], borderWidth: 2, borderColor: colors.skySolid },
})
