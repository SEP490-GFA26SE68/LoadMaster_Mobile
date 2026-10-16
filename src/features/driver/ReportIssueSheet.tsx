import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { ChoiceGroup } from '@/components/ChoiceGroup'
import { Sheet } from '@/components/Sheet'
import { TextField } from '@/components/TextField'
import { useT } from '@/lib/i18n'
import { DELIVERY_ISSUE_KINDS } from '@/lib/mock-db'

import type { StopItem } from './driver-model'
import { ISSUE_NOTE_MAX, issueFormSchema, isIssueFormError, type IssueFormInput, type IssueFormValues } from './issue-form.schema'

type ReportIssueSheetProps = {
  open: boolean
  onClose: () => void
  stopNumber: number
  items: readonly StopItem[]
  pending: boolean
  /** `null` khi nguồn đã ghi; lỗi thì trả câu để hiện ngay trong tờ. */
  onSubmit: (values: IssueFormValues) => Promise<string | null>
}

/**
 * "Báo sự cố" một kiện của điểm giao (như `ReportIssueDialog` của web, D-47): chọn kiện, loại sự cố — hàng hỏng, thiếu hàng, khách từ chối,
 * khác (bắt buộc ghi chú) — và ghi chú. Kiện đầu tiên chưa dỡ, chưa báo sự cố được chọn sẵn. Lỗi hiện trong tờ và giữ dữ liệu đang nhập;
 * ghi xong tờ đóng — dòng kiện của điểm tự nói sự cố đã ghi. Nơi gọi đổi `key` mỗi lần mở để form bắt đầu lại theo tiến độ lúc mở.
 */
export function ReportIssueSheet({ open, onClose, stopNumber, items, pending, onSubmit }: ReportIssueSheetProps) {
  const t = useT()
  const [failure, setFailure] = useState<string | null>(null)
  const preselected = items.find((item) => !item.unloaded && item.issueKind === undefined) ?? items[0]
  const form = useForm<IssueFormInput, unknown, IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: { packageInstanceId: preselected?.id ?? '', note: '' },
  })
  const message = (code: string | undefined) =>
    isIssueFormError(code) ? (code === 'noteTooLong' ? t('driver.issue.errors.noteTooLong', { max: ISSUE_NOTE_MAX }) : t(`driver.issue.errors.${code}`)) : undefined

  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    const error = await onSubmit(values)
    if (error === null) onClose()
    else setFailure(error)
  })

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={pending}
      title={t('driver.issue.title', { number: stopNumber })}
      description={t('driver.issue.description')}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={pending} onPress={onClose}>
            {t('driver.issue.cancel')}
          </Button>
          <Button style={styles.flex} loading={pending} onPress={() => void submit()}>
            {t('driver.issue.submit')}
          </Button>
        </>
      }>
      <Controller
        control={form.control}
        name="packageInstanceId"
        render={({ field, fieldState }) => (
          <ChoiceGroup
            label={t('driver.issue.package')}
            choices={items.map((item) => ({ value: item.id, label: item.label, description: item.name }))}
            value={field.value === '' ? undefined : field.value}
            onChange={field.onChange}
            error={message(fieldState.error?.message)}
            codeLabels
          />
        )}
      />
      <Controller
        control={form.control}
        name="kind"
        render={({ field, fieldState }) => (
          <ChoiceGroup
            label={t('driver.issue.kind')}
            choices={DELIVERY_ISSUE_KINDS.map((kind) => ({ value: kind, label: t(`common.deliveryIssueKinds.${kind}`) }))}
            value={field.value}
            onChange={field.onChange}
            error={message(fieldState.error?.message)}
            columns={2}
          />
        )}
      />
      <Controller
        control={form.control}
        name="note"
        render={({ field, fieldState }) => (
          <TextField
            label={t('driver.issue.note')}
            hint={t('driver.issue.noteHint')}
            error={message(fieldState.error?.message)}
            multiline
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
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
