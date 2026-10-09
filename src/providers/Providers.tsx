import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthProvider } from '@/features/auth/AuthProvider'
import { I18nProvider } from '@/lib/i18n'

/** Lỗi của lượt gọi dữ liệu là lỗi có mã (luật nghiệp vụ, phiên, mạng): thử lại ngầm không sửa được, để màn hiện câu và nút thử lại. */
function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

/** Mọi provider của app, theo thứ tự phụ thuộc: vùng an toàn → cache truy vấn → ngôn ngữ → phiên đăng nhập. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
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
