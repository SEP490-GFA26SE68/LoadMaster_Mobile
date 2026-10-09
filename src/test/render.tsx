import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import type { AuthAdapter } from '@/features/auth/auth-adapter'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { I18nProvider, type Locale } from '@/lib/i18n'

const FRAME = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }

export type RenderAppOptions = {
  locale?: Locale
  /** Adapter đăng nhập của test; vắng thì dùng adapter theo cấu hình (kho mẫu). */
  auth?: AuthAdapter
}

/** Vẽ một màn trong đủ provider của app (vùng an toàn của điện thoại 390 × 844, cache truy vấn mới, ngôn ngữ cố định, phiên). */
export function renderApp(ui: ReactElement, { locale = 'vi', auth }: RenderAppOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
  return render(
    <SafeAreaProvider initialMetrics={FRAME}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider initialLocale={locale}>
          <AuthProvider {...(auth === undefined ? {} : { adapter: auth })}>{ui}</AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  )
}

/** Xoá kho khoá giả giữa các test (`src/test/setup.ts`). */
export function clearStored(): void {
  ;(globalThis as { clearStoredForTest?: () => void }).clearStoredForTest?.()
}
