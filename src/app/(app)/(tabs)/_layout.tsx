import { Tabs } from 'expo-router'
import { ClipboardList, Package, Radio, Truck, UserRound } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useCan } from '@/features/auth/AuthProvider'
import { useT } from '@/lib/i18n'
import { colors, space, TOUCH, type as scale } from '@/theme/tokens'

/**
 * Thanh tab đáy của người đã đăng nhập. Mỗi tab làm việc nằm sau quyền của nó (`Tabs.Protected`): vai trò thiếu quyền không thấy tab
 * và không mở được route. Tài xế: chuyến của tôi; kho: nhiệm vụ xếp; điều phối: chuyến công ty + giám sát; quản lý: giám sát.
 */
export default function AppLayout() {
  const t = useT()
  const can = useCan()
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text3,
        tabBarLabelStyle: { fontSize: scale.meta.fontSize, fontWeight: scale.meta.fontWeight },
        // Mỗi tab cao 56 (vùng chạm tối thiểu) cộng vùng an toàn dưới đáy máy; chiều cao mặc định cắt mất nhãn 14
        tabBarStyle: { height: TOUCH + space[2] + insets.bottom, paddingTop: space[1], paddingBottom: insets.bottom + space[1], backgroundColor: colors.bg, borderTopColor: colors.border },
      }}>
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Protected guard={can('driver.operate')}>
        <Tabs.Screen name="trips" options={{ title: t('nav.trips'), tabBarIcon: ({ color }) => <Truck color={color} size={24} strokeWidth={1.5} /> }} />
      </Tabs.Protected>
      <Tabs.Protected guard={can('warehouse.operate')}>
        <Tabs.Screen name="warehouse" options={{ title: t('nav.warehouse'), tabBarIcon: ({ color }) => <Package color={color} size={24} strokeWidth={1.5} /> }} />
      </Tabs.Protected>
      <Tabs.Protected guard={can('trips.edit')}>
        <Tabs.Screen name="fleet" options={{ title: t('nav.fleet'), tabBarIcon: ({ color }) => <ClipboardList color={color} size={24} strokeWidth={1.5} /> }} />
      </Tabs.Protected>
      <Tabs.Protected guard={can('monitoring.view')}>
        <Tabs.Screen name="monitoring" options={{ title: t('nav.monitoring'), tabBarIcon: ({ color }) => <Radio color={color} size={24} strokeWidth={1.5} /> }} />
      </Tabs.Protected>
      <Tabs.Screen name="account" options={{ title: t('nav.account'), tabBarIcon: ({ color }) => <UserRound color={color} size={24} strokeWidth={1.5} /> }} />
    </Tabs>
  )
}
