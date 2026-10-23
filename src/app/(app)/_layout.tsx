import { Stack } from 'expo-router'

import { useCan } from '@/features/auth/AuthProvider'

/** Mở thẳng một màn chồng (thông báo đẩy, liên kết sâu) vẫn có thanh tab bên dưới để quay về. */
export const unstable_settings = { initialRouteName: '(tabs)' }

/**
 * Màn nào trong nhóm (kể cả thanh tab) ném lỗi lúc vẽ thì cả nhóm nhường chỗ cho màn lỗi chung, nên route mới trong nhóm không tự bắt
 * lỗi. "Thử lại" dựng lại cả nhóm từ đầu.
 */
export { RouteErrorScreen as ErrorBoundary } from '@/features/errors/RouteErrorScreen'

/**
 * Nhóm đã đăng nhập: thanh tab đáy (`(tabs)`) và các màn mở chồng lên nó, có lối quay lại — một chuyến của tài xế, phiên soạn → xếp một
 * chuyến của nhân viên kho, thông báo (của cả hai vai trò). Màn làm việc nằm sau quyền của nó (`Stack.Protected`): vai trò thiếu quyền
 * không mở được route. Màn chồng mới thêm một `Stack.Screen` ở đây.
 */
export default function AppLayout() {
  const can = useCan()
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Protected guard={can('driver.operate')}>
        <Stack.Screen name="trip/[tripId]" />
      </Stack.Protected>
      <Stack.Protected guard={can('warehouse.operate')}>
        <Stack.Screen name="loading/[tripId]" />
      </Stack.Protected>
      <Stack.Protected guard={can('driver.operate') || can('warehouse.operate')}>
        <Stack.Screen name="notifications" />
      </Stack.Protected>
    </Stack>
  )
}
