import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Screen } from '@/components/Screen'
import { useT } from '@/lib/i18n'

import { useReturnHome } from './useGoHome'

/**
 * Địa chỉ không khớp route nào (liên kết sâu đã cũ, gõ sai): nói rõ app không có màn đó và đưa về màn chính — đã đăng nhập về màn của
 * vai trò, chưa đăng nhập về màn đăng nhập; liên kết mở lúc app đang chạy thì về màn chính của nhóm đang mở (`useReturnHome`). Lượt
 * Keycloak trả phiên về (`loadmaster://auth`) không tới đây: `app/+native-intent.tsx` chặn trước khi router tìm route.
 */
export function NotFoundScreen() {
  const t = useT()
  const goHome = useReturnHome()
  return (
    <Screen title={t('errors.notFound.title')} scroll footer={<Button onPress={goHome}>{t('errors.home')}</Button>}>
      <Banner tone="info">{t('errors.notFound.description')}</Banner>
    </Screen>
  )
}
