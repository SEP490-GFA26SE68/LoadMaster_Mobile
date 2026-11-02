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
import { MAX_EXCEPTION_NOTE_LENGTH } from '@/lib/mock-db'

import { useResolveExceptionMutation } from './useMonitoringQueries'

/** Lỗi của form là mã; component dịch. Ghi chú không bắt buộc, chỉ giới hạn độ dài như kho. */
const schema = z.object({ note: z.string().trim().max(MAX_EXCEPTION_NOTE_LENGTH, 'noteTooLong') })
type Values = z.infer<typeof schema>

type ResolveSheetProps = {
  tripId: string
  exceptionId: string
  open: boolean
  onClose: () => void
  /** Kho đã đánh dấu sự cố `exceptionId` là đã xử lý: tờ đóng, thẻ nói đã xử lý. */
  onResolved: (exceptionId: string) => void
}

/**
 * Tờ "Đã xử lý" của điều phối viên cho một sự cố cấp chuyến (bản web đánh dấu ngay bằng một nút; điện thoại thêm ghi chú xử lý không bắt
 * buộc, lưu cùng sự cố và đọc lại ở dòng "Ghi chú xử lý"). Lỗi của kho hiện trong tờ và giữ ghi chú đang nhập. Nơi gọi đổi `key` mỗi lần mở.
 */
export function ResolveSheet({ tripId, exceptionId, open, onClose, onResolved }: ResolveSheetProps) {
  const t = useT()
  const resolve = useResolveExceptionMutation(tripId)
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { note: '' } })

  const submit = form.handleSubmit(async ({ note }) => {
    setFailure(null)
    try {
      await resolve.mutateAsync({ exceptionId, note: note === '' ? undefined : note })
      onResolved(exceptionId)
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  })

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={resolve.isPending}
      title={t('liveTrip.resolve.title', { id: exceptionId })}
      description={t('liveTrip.resolve.description', { tripId })}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={resolve.isPending} onPress={onClose}>
            {t('liveTrip.resolve.cancel')}
          </Button>
          <Button style={styles.flex} loading={resolve.isPending} onPress={() => void submit()}>
            {t('liveTrip.resolve.confirm')}
          </Button>
        </>
      }>
      <Controller
        control={form.control}
        name="note"
        render={({ field, fieldState }) => (
          <TextField
            label={t('liveTrip.resolve.note')}
            hint={t('liveTrip.resolve.noteHint')}
            error={fieldState.error?.message === 'noteTooLong' ? t('liveTrip.resolve.noteTooLong', { max: MAX_EXCEPTION_NOTE_LENGTH }) : undefined}
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
