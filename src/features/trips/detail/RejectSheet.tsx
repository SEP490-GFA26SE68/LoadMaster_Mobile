import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet } from 'react-native'
import { z } from 'zod'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { TextField } from '@/components/TextField'
import { useT } from '@/lib/i18n'
import { MAX_MANUAL_NOTE_LENGTH } from '@/lib/mock-db'

import type { ManualConfirmRow } from '../trips-model'

/** Lỗi của form là mã; component dịch. */
const schema = z.object({ reason: z.string().trim().min(1, 'reasonRequired').max(MAX_MANUAL_NOTE_LENGTH, 'reasonTooLong') })
type RejectValues = z.infer<typeof schema>

/**
 * Tờ "Từ chối xác nhận tay" (như `ManualConfirmRejectDialog` của web): lý do bắt buộc — người gửi đọc nó để biết phải kiểm lại gì. Kho
 * từ chối thì câu lỗi hiện trong tờ và lý do đang nhập giữ nguyên; ghi xong tờ đóng, thẻ nói kết quả. Nơi gọi đổi `key` theo xác nhận
 * tay mỗi lần mở để form bắt đầu lại.
 */
export function RejectSheet({ row, pending, onClose, onConfirm }: {
  /** Xác nhận tay sắp bị từ chối; `null` là tờ đóng. */
  row: ManualConfirmRow | null
  pending: boolean
  onClose: () => void
  /** `null` khi kho đã ghi; lỗi thì trả câu để hiện trong tờ. */
  onConfirm: (reason: string) => Promise<string | null>
}) {
  const t = useT()
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<RejectValues>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })
  const message = (code: string | undefined) =>
    code === 'reasonRequired'
      ? t('trips.manualConfirms.rejectDialog.reasonRequired')
      : code === 'reasonTooLong'
        ? t('trips.manualConfirms.rejectDialog.reasonTooLong', { max: MAX_MANUAL_NOTE_LENGTH })
        : undefined

  const submit = form.handleSubmit(async ({ reason }) => {
    setFailure(null)
    const error = await onConfirm(reason)
    if (error === null) onClose()
    else setFailure(error)
  })

  return (
    <Sheet
      open={row !== null}
      onClose={onClose}
      busy={pending}
      title={t('trips.manualConfirms.rejectDialog.title', { id: row?.packageInstanceId ?? '' })}
      description={t('trips.manualConfirms.rejectDialog.description')}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={pending} onPress={onClose}>
            {t('trips.manualConfirms.rejectDialog.cancel')}
          </Button>
          <Button variant="danger" style={styles.flex} loading={pending} onPress={() => void submit()}>
            {t('trips.manualConfirms.rejectDialog.confirm')}
          </Button>
        </>
      }>
      <Controller
        control={form.control}
        name="reason"
        render={({ field, fieldState }) => (
          <TextField
            label={t('trips.manualConfirms.rejectDialog.reason')}
            hint={t('trips.manualConfirms.rejectDialog.reasonHint')}
            error={message(fieldState.error?.message)}
            multiline
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
