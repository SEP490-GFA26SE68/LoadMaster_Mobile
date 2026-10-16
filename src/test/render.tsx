import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { getMockDb } from '@/data/mock-db'
import { SESSION_KEY, type AuthAdapter } from '@/features/auth/auth-adapter'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { I18nProvider, type Locale } from '@/lib/i18n'
import { SEED_PASSWORD } from '@/lib/mock-db'
import { writeStored } from '@/lib/storage'
import type { User } from '@/types/user'

const FRAME = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }

export type RenderAppOptions = {
  locale?: Locale
  /** Adapter đăng nhập của test; vắng thì dùng adapter theo cấu hình (kho mẫu). */
  auth?: AuthAdapter
}

/** Vẽ một màn trong đủ provider của app (vùng an toàn của điện thoại 390 × 844, cache truy vấn mới, ngôn ngữ cố định, phiên). */
export function renderApp(ui: ReactElement, { locale = 'vi', auth }: RenderAppOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } })
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

/**
 * Đăng nhập sẵn bằng một tài khoản seed của kho mẫu: kho mở phiên và kho khoá giả cất mã người dùng, nên `AuthProvider` của `renderApp`
 * (với `createMockAuth()`) khôi phục đúng phiên đó — màn có người dùng và quyền như sau khi đăng nhập.
 */
export async function signInAs(email: string): Promise<User> {
  const user = await getMockDb().authenticate(email, SEED_PASSWORD)
  await writeStored(SESSION_KEY, user.id)
  return user
}

/** Xoá kho khoá giả giữa các test (`src/test/setup.ts`). */
export function clearStored(): void {
  ;(globalThis as { clearStoredForTest?: () => void }).clearStoredForTest?.()
}
