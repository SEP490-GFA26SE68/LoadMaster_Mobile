import { usePathname, type ErrorBoundaryProps } from 'expo-router'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Screen } from '@/components/Screen'
import { useAuth } from '@/features/auth/AuthProvider'
import { homeOf } from '@/features/auth/landing'
import { dataErrorMessage, useT } from '@/lib/i18n'

import { useReplaceWithHome } from './useGoHome'

/**
 * Màn lỗi chung khi một màn ném lỗi lúc vẽ: `ErrorBoundary` của `app/(app)/_layout.tsx` (cả nhóm đã đăng nhập), `app/sign-in.tsx` và
 * `app/+not-found.tsx` — đều nằm trong `Providers` nên có ngôn ngữ và phiên. Không hiện thông điệp thô, chỉ câu theo mã (`dataErrorMessage`).
 * "Thử lại" dựng lại route đã bắt lỗi; với nhóm `(app)` là cả nhóm, nên màn mở trong lúc dùng không tự mở lại. "Về màn chính" chỉ hiện khi
 * màn chính khác route đang mở (trùng thì nút chỉ làm như "Thử lại"). "Đăng xuất" là lối ra khi chính màn chính hay thanh tab lỗi mãi: nút
 * đăng xuất của màn Tài khoản nằm trong nhóm đang lỗi.
 */
export function RouteErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const t = useT()
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const goHome = useReplaceWithHome()
  return (
    <Screen
      title={t('errors.crash.title')}
      scroll
      footer={
        <>
          <Button onPress={() => void retry()}>{t('common.retry')}</Button>
          {pathname !== homeOf(user) && (
            <Button variant="secondary" onPress={goHome}>
              {t('errors.home')}
            </Button>
          )}
          {user !== null && (
            <Button variant="secondary" onPress={() => void signOut()}>
              {t('account.signOut')}
            </Button>
          )}
        </>
      }>
      <Banner tone="danger">{dataErrorMessage(error, t)}</Banner>
    </Screen>
  )
}
