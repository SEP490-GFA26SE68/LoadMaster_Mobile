import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet } from 'react-native'
import { z } from 'zod'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { TextField } from '@/components/TextField'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { MAX_PICKUP_REASON_LENGTH } from '@/lib/mock-db'

import type { PickupRow } from './pickup-model'
import { useRejectPickupMutation } from './usePickupQueries'

/** Lỗi của form là mã; component dịch (như `PickupRejectDialog` của web). */
const schema = z.object({ reason: z.string().trim().min(1, 'reasonRequired').max(MAX_PICKUP_REASON_LENGTH, 'reasonTooLong') })
type Values = z.infer<typeof schema>

type PickupRejectSheetProps = {
  tripId: string
  row: PickupRow
  open: boolean
  onClose: () => void
  /** Kho đã từ chối yêu cầu: tờ đóng, thẻ nói đã từ chối. */
  onRejected: (pickupId: string) => void
}

/**
 * Tờ "Từ chối yêu cầu nhận hàng" của điều phối viên: lý do bắt buộc, người gửi đọc lý do đó; từ chối không tạo kiện hay điểm nào. Lỗi của
 * kho hiện trong tờ và giữ lý do đang nhập. Nơi gọi đổi `key` mỗi lần mở để form bắt đầu lại.
 */
export function PickupRejectSheet({ tripId, row, open, onClose, onRejected }: PickupRejectSheetProps) {
  const t = useT()
  const reject = useRejectPickupMutation(tripId)
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })
  const id = row.request.id
  const message = (code: string | undefined) =>
    code === 'reasonRequired'
      ? t('pickups.reject.reasonRequired')
      : code === 'reasonTooLong'
        ? t('pickups.reject.reasonTooLong', { max: MAX_PICKUP_REASON_LENGTH })
        : undefined

  const submit = form.handleSubmit(async ({ reason }) => {
    setFailure(null)
    try {
      await reject.mutateAsync({ pickupId: id, reason })
      onRejected(id)
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  })

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={reject.isPending}
      title={t('pickups.reject.title', { id })}
      description={t('pickups.reject.description')}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={reject.isPending} onPress={onClose}>
            {t('pickups.reject.cancel')}
          </Button>
          <Button variant="danger" style={styles.flex} loading={reject.isPending} onPress={() => void submit()}>
            {t('pickups.reject.confirm')}
          </Button>
        </>
      }>
      <Controller
        control={form.control}
        name="reason"
        render={({ field, fieldState }) => (
          <TextField
            label={t('pickups.reject.reason')}
            hint={t('pickups.reject.reasonHint')}
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
