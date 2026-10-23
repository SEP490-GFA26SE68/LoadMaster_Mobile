import { Hourglass, TriangleAlert } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { Banner } from '@/components/Banner'
import { useT } from '@/lib/i18n'
import { pendingManualConfirms, rejectedConfirms, type Trip } from '@/lib/mock-db'
import { space } from '@/theme/tokens'

/**
 * Dải thông báo về xác nhận tay của phiên, cả bước soạn lẫn bước xếp (như `ConfirmNotices` của web):
 * - mỗi kiện điều phối viên từ chối xác nhận tay mà chưa được kiểm lại — kho đã gỡ kết quả của nó nên phiên quay về đúng kiện đó — một
 *   dải đỏ kèm lý do của điều phối viên;
 * - số xác nhận tay còn chờ duyệt (chưa xong xếp được khi còn chờ) — một dải hổ phách.
 * Không có gì thì không vẽ gì. Dải là `Banner` (cảnh báo được trình đọc màn hình đọc ngay), không có toast.
 *
 * Đặt ở đầu thân màn của bước Soạn hàng (WP-B) và bước Xếp (WP-C), ngay dưới `PlanNotices`: `<ConfirmNotices trip={trip} />`.
 */
export function ConfirmNotices({ trip }: { trip: Trip }) {
  const t = useT()
  const recorded = new Set(trip.loading?.steps.map((step) => step.packageInstanceId))
  const staged = new Set(trip.loading?.stagedIds)
  const rejected = [...rejectedConfirms(trip, 'STAGING', staged), ...rejectedConfirms(trip, 'LOADING', recorded)]
  const pending = pendingManualConfirms(trip, 'STAGING').length + pendingManualConfirms(trip, 'LOADING').length
  if (rejected.length === 0 && pending === 0) return null
  return (
    <View style={styles.stack}>
      {rejected.map((entry) => (
        <Banner key={entry.id} tone="danger" icon={TriangleAlert}>
          {`${t('warehouse.confirms.rejected', { id: entry.packageInstanceId })}\n${t('warehouse.confirms.rejectReason', { reason: entry.manual?.rejectReason ?? '' })}`}
        </Banner>
      ))}
      {pending > 0 ? (
        <Banner tone="warning" icon={Hourglass}>
          {t('warehouse.confirms.pending', { count: pending })}
        </Banner>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: space[2] },
})
