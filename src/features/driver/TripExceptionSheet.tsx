import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, type DefaultValues } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'
import { z } from 'zod'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { ChoiceGroup } from '@/components/ChoiceGroup'
import { Sheet } from '@/components/Sheet'
import { TextField } from '@/components/TextField'
import type { SheetView } from '@/features/pickups/pickup-model'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { MAX_EXCEPTION_DELAY_MINUTES, MAX_EXCEPTION_NOTE_LENGTH, TRIP_EXCEPTION_TYPES } from '@/lib/mock-db'

import type { TripExceptionRequest } from './driver-model'

/** Lỗi của form là mã; component dịch qua `tripException.errors.<mã>` (cùng schema với `ReportExceptionDialog` của web). */
const ERRORS = ['typeRequired', 'detailsRequired', 'detailsTooLong', 'delayInvalid'] as const
type ErrorCode = (typeof ERRORS)[number]
const isError = (code: string | undefined): code is ErrorCode => ERRORS.some((item) => item === code)

const schema = z.object({
  type: z.enum(TRIP_EXCEPTION_TYPES, 'typeRequired' satisfies ErrorCode),
  description: z
    .string()
    .trim()
    .min(1, 'detailsRequired' satisfies ErrorCode)
    .max(MAX_EXCEPTION_NOTE_LENGTH, 'detailsTooLong' satisfies ErrorCode),
  delayMinutes: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, 'delayInvalid' satisfies ErrorCode)
    .refine((value) => Number(value) <= MAX_EXCEPTION_DELAY_MINUTES, 'delayInvalid' satisfies ErrorCode),
})
type Input = z.input<typeof schema>
type Values = z.output<typeof schema>
const EMPTY: DefaultValues<Input> = { description: '', delayMinutes: '' }

/** Lệnh ghi sự cố của màn gọi tờ: tài xế ghi qua nguồn của tài xế, điều phối viên qua nguồn giám sát. Trả mã sự cố kho vừa ghi. */
export type ReportTripException = {
  readonly isPending: boolean
  mutateAsync(input: TripExceptionRequest): Promise<{ readonly id: string }>
}

type TripExceptionFormOptions = {
  /** Mã chuyến hiện cho người dùng. */
  tripCode: string
  report: ReportTripException
  onCancel: () => void
  /** Nguồn đã ghi sự cố `id`: tờ đóng, màn nói đã báo. */
  onReported: (id: string) => void
}

/**
 * Form "Báo sự cố" của một chuyến đang chạy (như `ReportExceptionDialog` của web, FE-6-11): sự cố của cả xe — tắc đường, tai nạn, công
 * trình, hỏng xe, khác — kèm mô tả và số phút dự kiến chậm (0 → 480). Khác "Báo sự cố" của từng kiện. Lỗi hiện trong tờ và giữ dữ liệu
 * đang nhập. Trả nội dung tờ (`SheetView`) để tờ "Thêm" của tài xế đổi sang form ngay trong tờ đang mở; `reset` đưa form về trống.
 */
export function useTripExceptionForm({ tripCode, report, onCancel, onReported }: TripExceptionFormOptions): SheetView & { reset: () => void } {
  const t = useT()
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<Input, unknown, Values>({ resolver: zodResolver(schema), defaultValues: EMPTY })
  const message = (code: string | undefined) => {
    if (!isError(code)) return undefined
    if (code === 'detailsTooLong') return t('tripException.errors.detailsTooLong', { max: MAX_EXCEPTION_NOTE_LENGTH })
    if (code === 'delayInvalid') return t('tripException.errors.delayInvalid', { max: MAX_EXCEPTION_DELAY_MINUTES })
    return t(`tripException.errors.${code}`)
  }

  const submit = form.handleSubmit(async ({ type, description, delayMinutes }) => {
    setFailure(null)
    try {
      const { id } = await report.mutateAsync({ type, description, delayMinutes: Number(delayMinutes) })
      onReported(id)
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  })

  return {
    title: t('tripException.title', { id: tripCode }),
    description: t('tripException.description'),
    busy: report.isPending,
    reset: () => {
      form.reset(EMPTY)
      setFailure(null)
    },
    footer: (
      <>
        <Button variant="secondary" style={styles.flex} disabled={report.isPending} onPress={onCancel}>
          {t('tripException.cancel')}
        </Button>
        <Button write style={styles.flex} loading={report.isPending} onPress={() => void submit()}>
          {t('tripException.submit')}
        </Button>
      </>
    ),
    body: (
      <>
        <Controller
          control={form.control}
          name="type"
          render={({ field, fieldState }) => (
            <ChoiceGroup
              label={t('tripException.type')}
              choices={TRIP_EXCEPTION_TYPES.map((type) => ({ value: type, label: t(`common.tripExceptionTypes.${type}`) }))}
              value={field.value}
              onChange={field.onChange}
              error={message(fieldState.error?.message)}
            />
          )}
        />
        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <TextField
              label={t('tripException.details')}
              hint={t('tripException.detailsHint')}
              error={message(fieldState.error?.message)}
              multiline
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={form.control}
          name="delayMinutes"
          render={({ field, fieldState }) => (
            <TextField
              label={t('tripException.delay')}
              hint={t('tripException.delayHint', { max: MAX_EXCEPTION_DELAY_MINUTES })}
              error={message(fieldState.error?.message)}
              code
              keyboardType="number-pad"
              maxLength={3}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        {failure === null ? null : (
          <View accessibilityRole="alert">
            <Banner tone="danger">{failure}</Banner>
          </View>
        )}
      </>
    ),
  }
}

type TripExceptionSheetProps = Omit<TripExceptionFormOptions, 'onCancel'> & {
  open: boolean
  onClose: () => void
}

/**
 * Tờ "Báo sự cố" đứng riêng — màn giám sát một chuyến của điều phối viên. Nơi gọi đổi `key` mỗi lần mở để form bắt đầu lại. Tài xế mở
 * cùng form từ tờ "Thêm" của màn điểm giao (`StopMoreActions`).
 */
export function TripExceptionSheet({ open, onClose, ...options }: TripExceptionSheetProps) {
  const view = useTripExceptionForm({ ...options, onCancel: onClose })
  return (
    <Sheet open={open} onClose={onClose} busy={view.busy} title={view.title} description={view.description} footer={view.footer}>
      {view.body}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
