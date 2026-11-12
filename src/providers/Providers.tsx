import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { connectNetworkStatus } from '@/data/network'
import { createQueryClient } from '@/data/query-client'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { I18nProvider } from '@/lib/i18n'

/** Mọi provider của app, theo thứ tự phụ thuộc: vùng an toàn → cache truy vấn → ngôn ngữ → phiên đăng nhập. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  // Trạng thái mạng của máy cho cache truy vấn (thử lại khi có mạng lại) và cho dải "Mất kết nối" của màn tài xế, kho
  useEffect(() => connectNetworkStatus(), [])
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
