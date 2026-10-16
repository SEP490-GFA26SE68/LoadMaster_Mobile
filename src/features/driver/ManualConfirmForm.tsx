import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'
import { z } from 'zod'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { ChoiceGroup } from '@/components/ChoiceGroup'
import { TextField } from '@/components/TextField'
import { useT } from '@/lib/i18n'
import { MANUAL_CONFIRM_REASONS, MAX_MANUAL_NOTE_LENGTH } from '@/lib/mock-db'
import { colors, space } from '@/theme/tokens'

import type { ManualValues, VerifyCandidate } from './useUnloadVerify'

/** Lỗi của form là mã; component dịch qua `verify.errors.<mã>`. */
const ERRORS = ['packageRequired', 'reasonRequired', 'noteRequired', 'noteTooLong'] as const
type ErrorCode = (typeof ERRORS)[number]
const isError = (code: string | undefined): code is ErrorCode => ERRORS.some((item) => item === code)

const schema = z
  .object({
    itemId: z.string().min(1, 'packageRequired' satisfies ErrorCode),
    reason: z.enum(MANUAL_CONFIRM_REASONS, 'reasonRequired' satisfies ErrorCode),
    note: z.string().trim().max(MAX_MANUAL_NOTE_LENGTH, 'noteTooLong' satisfies ErrorCode),
  })
  // "Khác" không tự nói lên chuyện gì: phải có ghi chú
  .refine((values) => values.reason !== 'OTHER' || values.note !== '', { path: ['note'], message: 'noteRequired' satisfies ErrorCode })

type Input = z.input<typeof schema>
type Values = z.output<typeof schema>

/**
 * Mức 3 của đối chiếu kiện (như `PackageVerifyManual` của web): chọn kiện và lý do — "Nhãn rách / mất", "QR không đọc được", "Khác"
 * (bắt buộc ghi chú). Gửi đi là một xác nhận tay chờ điều phối viên duyệt. Chỉ một kiện chọn được thì kiện đó được chọn sẵn. Nơi gọi đặt
 * `key` theo danh sách kiện chọn được: ghi xong một kiện thì danh sách đổi và form bắt đầu lại; lỗi thì giữ nguyên dữ liệu đang nhập.
 */
export function ManualConfirmForm({ candidates, pending, onSubmit }: { candidates: readonly VerifyCandidate[]; pending: boolean; onSubmit: (values: ManualValues) => unknown }) {
  const t = useT()
  const form = useForm<Input, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: { itemId: candidates.length === 1 ? (candidates[0]?.id ?? '') : '', note: '' },
  })
  const message = (code: string | undefined) =>
    isError(code) ? (code === 'noteTooLong' ? t('verify.errors.noteTooLong', { max: MAX_MANUAL_NOTE_LENGTH }) : t(`verify.errors.${code}`)) : undefined

  if (candidates.length === 0) return <AppText color={colors.text2}>{t('verify.manualEmpty')}</AppText>

  const submit = form.handleSubmit(({ itemId, reason, note }) => onSubmit({ itemId, reason, note: note === '' ? undefined : note }))

  return (
    <View style={styles.form}>
      <AppText color={colors.text2}>{t('verify.manualIntro')}</AppText>
      <Controller
        control={form.control}
        name="itemId"
        render={({ field, fieldState }) => (
          <ChoiceGroup
            label={t('verify.manualPackage')}
            choices={candidates.map((candidate) => ({ value: candidate.id, label: candidate.label, description: `${candidate.name} · ${candidate.description}` }))}
            value={field.value === '' ? undefined : field.value}
            onChange={field.onChange}
            error={message(fieldState.error?.message)}
            codeLabels
          />
        )}
      />
      <Controller
        control={form.control}
        name="reason"
        render={({ field, fieldState }) => (
          <ChoiceGroup
            label={t('verify.manualReason')}
            choices={MANUAL_CONFIRM_REASONS.map((reason) => ({ value: reason, label: t(`common.manualConfirmReasons.${reason}`) }))}
            value={field.value}
            onChange={field.onChange}
            error={message(fieldState.error?.message)}
          />
        )}
      />
      <Controller
        control={form.control}
        name="note"
        render={({ field, fieldState }) => (
          <TextField
            label={t('verify.manualNote')}
            hint={t('verify.manualNoteHint')}
            error={message(fieldState.error?.message)}
            multiline
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <Button loading={pending} onPress={() => void submit()}>
        {t('verify.manualSubmit')}
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: space[4] },
})
