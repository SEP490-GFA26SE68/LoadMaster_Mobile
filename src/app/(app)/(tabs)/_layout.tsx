import { Tabs } from 'expo-router'
import { LayoutDashboard, MapPinned, PackageSearch, Truck, UserRound, Warehouse, type LucideIcon } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '@/features/auth/AuthProvider'
import { hasTab, type WorkTab } from '@/features/auth/landing'
import { useLookupCapabilities } from '@/features/lookup/useLookupQueries'
import { useT } from '@/lib/i18n'
import { colors, space, TOUCH, type as scale } from '@/theme/tokens'

type TabLabel = `nav.${'overview' | 'tripList' | 'monitoring' | 'trips' | 'warehouse' | 'lookup'}`

/** Nhãn và hình của từng tab làm việc; icon như mục điều hướng của bản web. */
const TAB_LOOK: Readonly<Record<WorkTab, { readonly label: TabLabel; readonly icon: LucideIcon }>> = {
  overview: { label: 'nav.overview', icon: LayoutDashboard },
  'trip-list': { label: 'nav.tripList', icon: Truck },
  monitoring: { label: 'nav.monitoring', icon: MapPinned },
  trips: { label: 'nav.trips', icon: Truck },
  warehouse: { label: 'nav.warehouse', icon: Warehouse },
  lookup: { label: 'nav.lookup', icon: PackageSearch },
}

/**
 * Thanh tab đáy của người đã đăng nhập. Mỗi tab làm việc nằm sau `hasTab` (`features/auth/landing.ts`: phạm vi app của vai trò và quyền
 * của màn) qua `Tabs.Protected`: vai trò không có tab thì không thấy và không mở được route. Quản lý công ty: Tổng quan · Chuyến hàng ·
 * Giám sát · Tài khoản; điều phối viên: Chuyến hàng · Giám sát · Tài khoản; tài xế: Chuyến của tôi · Tài khoản; nhân viên kho: Kho · Tra
 * cứu kiện · Tài khoản. Tab có nguồn dữ liệu chưa làm được việc của nó thì ẩn (Tra cứu kiện theo
 * `useLookupCapabilities().available`). Màn mới thêm tên vào `WORK_TABS` / `ROLE_TABS` và một `Tabs.Screen` ở đây, trong issue của màn đó.
 */
export default function AppLayout() {
  const t = useT()
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const lookup = useLookupCapabilities()
  // Tab mà nguồn dữ liệu đang dùng làm được; tab khác luôn có nguồn
  const sourced = (name: WorkTab) => name !== 'lookup' || lookup.available
  const tab = (name: WorkTab) => {
    const { label, icon: Icon } = TAB_LOOK[name]
    return (
      <Tabs.Protected key={name} guard={hasTab(user?.role, name) && sourced(name)}>
        <Tabs.Screen name={name} options={{ title: t(label), tabBarIcon: ({ color }) => <Icon color={color} size={24} strokeWidth={1.5} /> }} />
      </Tabs.Protected>
    )
  }
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
      {tab('overview')}
      {tab('trip-list')}
      {tab('monitoring')}
      {tab('trips')}
      {tab('warehouse')}
      {tab('lookup')}
      <Tabs.Screen name="account" options={{ title: t('nav.account'), tabBarIcon: ({ color }) => <UserRound color={color} size={24} strokeWidth={1.5} /> }} />
    </Tabs>
  )
}
