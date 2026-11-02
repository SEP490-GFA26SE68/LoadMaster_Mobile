import { useState } from 'react'
import { StyleSheet } from 'react-native'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { useT } from '@/lib/i18n'

import type { ShortageRow } from '../trips-model'

/**
 * Tờ hỏi lại trước khi bỏ một kiện kho báo thiếu khỏi chuyến (như hộp xác nhận của web): chuyến sẽ quay về Đã lập kế hoạch, phương án
 * lỗi thời, kiện về kho kiện kèm cờ "Không tìm thấy". Kho từ chối thì câu lỗi hiện trong tờ; ghi xong tờ đóng, thẻ nói kết quả. Nơi gọi
 * đổi `key` theo kiện mỗi lần mở.
 */
export function DropSheet({ row, pending, onClose, onConfirm }: {
  /** Kiện sắp bỏ; `null` là tờ đóng. */
  row: ShortageRow | null
  pending: boolean
  onClose: () => void
  /** `null` khi kho đã ghi; lỗi thì trả câu để hiện trong tờ. */
  onConfirm: () => Promise<string | null>
}) {
  const t = useT()
  const [failure, setFailure] = useState<string | null>(null)

  async function confirm() {
    setFailure(null)
    const error = await onConfirm()
    if (error === null) onClose()
    else setFailure(error)
  }

  return (
    <Sheet
      open={row !== null}
      onClose={onClose}
      busy={pending}
      title={t('trips.shortages.dropDialog.title', { id: row?.packageInstanceId ?? '' })}
      description={t('trips.shortages.dropDialog.description')}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={pending} onPress={onClose}>
            {t('trips.shortages.dropDialog.cancel')}
          </Button>
          <Button variant="danger" style={styles.flex} loading={pending} onPress={() => void confirm()}>
            {t('trips.shortages.dropDialog.confirm')}
          </Button>
        </>
      }>
      {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
