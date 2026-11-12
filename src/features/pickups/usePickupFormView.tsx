import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { parseDeadline } from '@/features/monitoring/deadline-input'
import { dataErrorMessage, useT, type TFunction } from '@/lib/i18n'
import { space } from '@/theme/tokens'

import { initialPickupValues, toPickupInput, type PickupFormValues } from './pickup-form'
import { pickupFormSchema } from './pickup-form-schema'
import type { PickupCreate, PickupRequestResult, SheetView } from './pickup-model'
import { stopLabeler } from './pickup-stops'
import { PickupPackageRows } from './PickupPackageRows'
import { PickupPointFields } from './PickupPointFields'
import { PickupRulesList } from './PickupRulesList'

type PickupFormOptions = {
  /** Mã chuyến hiện cho người dùng. */
  tripCode: string
  /** Lệnh gửi của nguồn đang dùng: tài xế qua nguồn của tài xế, điều phối viên qua nguồn giám sát. */
  create: PickupCreate
  /** Đóng tờ: "Huỷ" của form, "Đóng" của kết quả. */
  onClose: () => void
}

/**
 * Form "Nhận hàng dọc đường" (như `PickupRequestDialog` của web): điểm nhận, điểm giao, hạn tuỳ chọn, các kiện nhận. Gửi xong kho kiểm
 * mười luật ngay; tờ chuyển sang kết quả Đạt / Không đạt thay vì đóng — chính bước kết quả nói yêu cầu đã gửi, không có toast. Lỗi của kho
 * hiện trong tờ và giữ dữ liệu đang nhập. Trả nội dung tờ (`SheetView`) để tờ "Thêm" của tài xế hiện form ngay trong tờ đang mở; `reset`
 * đưa form về trống.
 */
export function usePickupFormView({ tripCode, create, onClose }: PickupFormOptions): SheetView & { reset: () => void } {
  const t = useT()
  const [created, setCreated] = useState<PickupRequestResult | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<PickupFormValues>({ resolver: zodResolver(pickupFormSchema), defaultValues: initialPickupValues() })
  const reset = () => {
    form.reset(initialPickupValues())
    setCreated(null)
    setFailure(null)
  }
  if (created !== null) return { ...resultView(created, t, onClose), reset }

  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      setCreated(await create.mutateAsync(toPickupInput(values)))
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  })

  return {
    title: t('pickups.dialog.title', { id: tripCode }),
    description: t('pickups.dialog.description'),
    busy: create.isPending,
    reset,
    footer: (
      <>
        <Button variant="secondary" style={styles.flex} disabled={create.isPending} onPress={onClose}>
          {t('pickups.dialog.cancel')}
        </Button>
        <Button write style={styles.flex} loading={create.isPending} onPress={() => void submit()}>
          {t('pickups.dialog.submit')}
        </Button>
      </>
    ),
    body: (
      <>
        <PickupPointFields prefix="pickup" form={form} />
        <PickupPointFields prefix="delivery" form={form} />
        <DeadlineFields form={form} />
        <PickupPackageRows form={form} />
        {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
      </>
    ),
  }
}

/** Bước kết quả: mười luật của lần kiểm ngay khi lưu; còn luật chưa đạt thì nói điều phối viên vẫn duyệt được khi ghi lý do vượt luật. */
function resultView({ request, stops }: PickupRequestResult, t: TFunction, onClose: () => void): SheetView {
  const failed = request.validationResults.filter((result) => !result.passed).length
  return {
    title: t('pickups.result.title', { id: request.id }),
    description: t(`pickups.status.${request.status}`),
    busy: false,
    footer: (
      <Button style={styles.flex} onPress={onClose}>
        {t('pickups.dialog.close')}
      </Button>
    ),
    body: (
      <>
        <AppText variant="label" accessibilityLiveRegion="polite">
          {t('pickups.result.sent', { id: request.id })}
        </AppText>
        <Banner tone={failed === 0 ? 'info' : 'warning'}>{failed === 0 ? t('pickups.result.validated') : t('pickups.result.pending', { count: failed })}</Banner>
        <PickupRulesList results={request.validationResults} stopLabel={stopLabeler(stops, t)} />
      </>
    ),
  }
}

/**
 * Hạn giao tuỳ chọn: ngày và giờ gõ tay. Lỗi gắn ở ô ngày; chữ sai dạng (ngày không có thật, giờ quá 23:59) nói dạng cần gõ, chỉ có một
 * trong hai ô thì nói cần cả hai — câu đọc theo chữ đang gõ.
 */
function DeadlineFields({ form }: { form: UseFormReturn<PickupFormValues> }) {
  const t = useT()
  const [date, time] = useWatch({ control: form.control, name: ['deadlineDate', 'deadlineTime'] })
  const failed = form.formState.errors.deadlineDate?.message !== undefined
  const parsed = parseDeadline(date, time)
  const error = !failed
    ? undefined
    : parsed.kind === 'error' && parsed.code === 'invalid'
      ? t('pickupRequest.deadlineFormat')
      : t('pickups.dialog.errors.deadlineInvalid')
  return (
    <View style={styles.deadline}>
      <Controller
        control={form.control}
        name="deadlineDate"
        render={({ field }) => (
          <TextField
            label={t('pickups.dialog.deadlineDate')}
            hint={t('pickupRequest.deadlineDateHint')}
            error={error}
            code
            keyboardType="numbers-and-punctuation"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <Controller
        control={form.control}
        name="deadlineTime"
        render={({ field }) => (
          <TextField
            label={t('pickups.dialog.deadlineTime')}
            hint={t('pickupRequest.deadlineTimeHint')}
            code
            keyboardType="numbers-and-punctuation"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  deadline: { gap: space[3] },
})
