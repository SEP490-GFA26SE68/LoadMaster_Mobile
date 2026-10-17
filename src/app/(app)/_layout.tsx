import { Stack } from 'expo-router'

import { useCan } from '@/features/auth/AuthProvider'

/** Mở thẳng một màn chồng (thông báo đẩy, liên kết sâu) vẫn có thanh tab bên dưới để quay về. */
export const unstable_settings = { initialRouteName: '(tabs)' }

/**
 * Nhóm đã đăng nhập: thanh tab đáy (`(tabs)`) và các màn mở chồng lên nó, có lối quay lại — chuyến tài xế, xếp kho, giám sát, tra cứu
 * kiện, thông báo. Màn làm việc nằm sau quyền của nó (`Stack.Protected`).
 */
export default function AppLayout() {
  const can = useCan()
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Protected guard={can('driver.operate')}>
        <Stack.Screen name="trip/[tripId]" />
        <Stack.Screen name="notifications" />
      </Stack.Protected>
      <Stack.Protected guard={can('warehouse.operate')}>
        <Stack.Screen name="warehouse/[tripId]" />
      </Stack.Protected>
      <Stack.Protected guard={can('monitoring.view')}>
        <Stack.Screen name="monitoring/[tripId]" />
      </Stack.Protected>
      <Stack.Protected guard={can('packages.lookup')}>
        <Stack.Screen name="scan" />
      </Stack.Protected>
    </Stack>
  )
}
