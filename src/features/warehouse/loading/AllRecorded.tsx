import { CircleCheck, Hourglass } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { useCompleteLoadingMutation } from '../useWarehouseQueries'

/**
 * Mọi kiện đã có kết quả nhưng chuyến chưa sang "Xếp xong — chờ xuất phát" (như `AllRecorded` của web). Bước cuối tự hoàn tất, nên gặp ở
 * đây khi còn xác nhận tay chờ điều phối viên duyệt — kho chặn xong xếp: nút mờ, lý do ngay trên nút —, hoặc khi lần hoàn tất đó không
 * thành (ví dụ mất kết nối). Cho bấm hoàn tất lại, không bịa là đã xong. Thân màn là câu này; nút nằm ở chân màn (`CompleteAction`).
 */
export function AllRecordedCard({ pendingConfirms }: { pendingConfirms: number }) {
  const t = useT()
  const blocked = pendingConfirms > 0
  const Icon = blocked ? Hourglass : CircleCheck
  return (
    <Card>
      <View style={styles.line}>
        <Icon color={blocked ? colors.warning : colors.success} size={24} strokeWidth={1.5} />
        <AppText style={styles.flex}>{blocked ? t('warehouse.confirms.blocked', { count: pendingConfirms }) : t('warehouse.allRecorded')}</AppText>
      </View>
    </Card>
  )
}

type CompleteActionProps = {
  readonly tripId: string
  readonly pendingConfirms: number
  /** Thẻ "Đã xếp" của kiện cuối đang hiện: chờ hết rồi mới cho bấm. */
  readonly busy: boolean
}

/**
 * Nút chính "Hoàn tất xếp hàng" ở chân màn khi mọi kiện đã có kết quả. Còn xác nhận tay chờ duyệt thì nút mờ và nói lý do (thân màn cũng
 * nói); lần hoàn tất không thành thì câu lỗi nằm ngay trên nút (web: toast), bấm lại được. Xong thì phiên sang màn Xếp xong.
 */
export function CompleteAction({ tripId, pendingConfirms, busy }: CompleteActionProps) {
  const t = useT()
  const complete = useCompleteLoadingMutation(tripId)
  const [failure, setFailure] = useState<string | null>(null)
  const blocked = pendingConfirms > 0
  const reason = blocked ? t('warehouse.confirms.blocked', { count: pendingConfirms }) : undefined

  function handleComplete() {
    setFailure(null)
    complete.mutate(undefined, { onError: (error) => setFailure(dataErrorMessage(error, t)) })
  }

  return (
    <>
      {failure === null ? null : (
        // Banner đỏ đã là cảnh báo; khung ngoài chỉ để trình đọc màn hình đọc ngay, không chờ
        <View accessibilityLiveRegion="assertive">
          <Banner tone="danger" onDismiss={() => setFailure(null)}>
            {failure}
          </Banner>
        </View>
      )}
      <Button disabled={blocked || busy} loading={complete.isPending} accessibilityHint={reason} onPress={handleComplete}>
        {t('warehouse.complete')}
      </Button>
    </>
  )
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  flex: { flex: 1 },
})
