import { ArrowLeft } from 'lucide-react-native'

import { IconButton } from '@/components/IconButton'
import { useT } from '@/lib/i18n'

import { useLeaveSession } from './useLeaveSession'

/**
 * Lối thoát luôn nhìn thấy của mọi màn trong phiên soạn → xếp (mục 10: màn làm việc toàn màn hình phải có đường ra): nút 56 nền đặc ở mép
 * trái dải trời, đặt vào `leading` của `Screen`. Tên đọc "Về danh sách chuyến"; bấm là `useLeaveSession` — về tab Kho.
 *
 * Bước Soạn hàng (WP-B), bước Xếp (WP-C) và màn Xếp xong (WP-A) dùng đúng nút này, không tự dựng nút quay lại riêng:
 * `<Screen title={trip.id} leading={<SessionExitButton />} …>`.
 */
export function SessionExitButton() {
  const t = useT()
  const leave = useLeaveSession()
  return <IconButton icon={ArrowLeft} tone="sky" label={t('warehouse.backToList')} onPress={leave} />
}
