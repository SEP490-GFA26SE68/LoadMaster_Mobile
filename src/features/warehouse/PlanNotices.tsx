import { StyleSheet, View } from 'react-native'

import { Chip, MockResultTag } from '@/components/Chip'
import type { ViewerSceneModel } from '@/features/viewer3d/scene-input'
import { useT } from '@/lib/i18n'
import { space } from '@/theme/tokens'

/**
 * Nhãn của phương án đang xếp (như `PlanNotices` của web): MOCK RESULT (tên riêng, không dịch) khi phương án là kết quả của mock tối ưu,
 * và "Thứ tự xếp tính lại khi duyệt" khi thứ tự được tính lại lúc duyệt. Không có nhãn nào thì không vẽ gì. Bản duyệt lỗi thời không tới
 * được đây: phiên chặn trước khi bắt đầu.
 *
 * Đặt ở đầu thân màn của bước Soạn hàng (WP-B) và bước Xếp (WP-C), trên `ConfirmNotices`: `<PlanNotices model={useSessionScene(trip, plan)} />`.
 */
export function PlanNotices({ model }: { model: Pick<ViewerSceneModel, 'isMockResult' | 'ordersRecomputed'> }) {
  const t = useT()
  if (!model.isMockResult && !model.ordersRecomputed) return null
  return (
    <View style={styles.row}>
      {model.isMockResult ? <MockResultTag /> : null}
      {model.ordersRecomputed ? <Chip tone="cyan" label={t('warehouse.ordersRecomputed')} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
})
