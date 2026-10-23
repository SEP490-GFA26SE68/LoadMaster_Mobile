import { useRouter } from 'expo-router'
import { Bell } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { IconButton } from '@/components/IconButton'
import { useAuth, useCan } from '@/features/auth/AuthProvider'
import { useDriverCapabilities, useNotificationsQuery } from '@/features/driver/useDriverQueries'
import { useWarehouseCapabilities, useWarehouseNotifications } from '@/features/warehouse/useWarehouseQueries'
import { useT } from '@/lib/i18n'
import { colors, palette } from '@/theme/tokens'

import { useReadNotifications } from './notification-read'

/**
 * Chuông ở dải trời của màn kho và màn tài xế (như chuông 56 px của web ở hai màn đó): mở màn Thông báo. Tài xế (`driver.operate`) đếm
 * thông báo về chuyến của mình, nhân viên kho (`warehouse.operate`) đếm thông báo của kho. Có thông báo chưa đọc thì một chấm hổ phách ở
 * góc — chỉ để nhìn, tên đọc của nút nói số chưa đọc. Vai trò khác, hoặc nguồn dữ liệu của vai trò chưa có thông báo, thì không có chuông.
 */
export function NotificationBell() {
  const can = useCan()
  if (can('driver.operate')) return <DriverBell />
  if (can('warehouse.operate')) return <WarehouseBell />
  return null
}

function DriverBell() {
  const { notifications } = useDriverCapabilities()
  const query = useNotificationsQuery(notifications)
  return notifications ? <BellButton entries={query.data} /> : null
}

function WarehouseBell() {
  const { notifications } = useWarehouseCapabilities()
  const query = useWarehouseNotifications()
  return notifications ? <BellButton entries={query.data} /> : null
}

function BellButton({ entries }: { entries: readonly { readonly id: string }[] | undefined }) {
  const t = useT()
  const router = useRouter()
  const { user } = useAuth()
  const read = useReadNotifications(user)
  const unread = (entries ?? []).filter((entry) => !read.has(entry.id)).length
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
