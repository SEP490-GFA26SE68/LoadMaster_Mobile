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

/** Hai nhóm route theo phiên: chưa đăng nhập chỉ mở được `sign-in`, đã đăng nhập chỉ mở được nhóm `(app)`. */
function RootNavigator() {
  const { status } = useAuth()

  useEffect(() => {
    if (status !== 'restoring') SplashScreen.hide()
  }, [status])

  // Luôn gắn Stack ngay từ frame đầu: trả `null` lúc mở lại phiên trì hoãn commit, Expo Router trên Android gọi
  // `onUnhandledLinking` từ Promise `getInitialURL` trước khi NavigationContainer mount (expo/expo#49378). Splash native
  // vẫn che cho tới khi `status` không còn `restoring`. Lúc đó `signedIn` chưa có nên hiện `sign-in` dưới splash.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status !== 'signedIn'}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  )
}
