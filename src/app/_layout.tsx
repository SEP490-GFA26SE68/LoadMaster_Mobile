import '@/polyfills'

import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import { useAuth } from '@/features/auth/AuthProvider'
import { Providers } from '@/providers/Providers'

void SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="light" />
      <RootNavigator />
    </Providers>
  )
}

/**
 * Hai nhóm route theo phiên: chưa đăng nhập chỉ mở được `sign-in`, đã đăng nhập chỉ mở được nhóm `(app)`. Lúc đang mở lại phiên cả hai
 * nhóm đều mở (chưa quyết gì), để địa chỉ mở app vẫn còn khi phiên mở lại xong.
 */
function RootNavigator() {
  const { status } = useAuth()

  useEffect(() => {
    if (status !== 'restoring') SplashScreen.hide()
  }, [status])

  // Luôn gắn Stack ngay từ frame đầu: trả `null` lúc mở lại phiên trì hoãn commit, Expo Router trên Android gọi
  // `onUnhandledLinking` từ Promise `getInitialURL` trước khi NavigationContainer mount (expo/expo#49378). Chặn `(app)` lúc đang mở
  // lại phiên thì liên kết sâu — thông báo, phiên của một chuyến — bị đẩy sang `sign-in` rồi mất; nên lúc đó `(app)` vẫn mở được
  // (nó chờ, không vẽ gì, dưới splash), chỉ khi chắc chắn chưa đăng nhập mới chặn.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status !== 'signedOut'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status !== 'signedIn'}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  )
}
