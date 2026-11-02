import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'
import { z } from 'zod'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { LoadingState } from '@/components/StateView'
import { TextField } from '@/components/TextField'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { MAX_PICKUP_REASON_LENGTH } from '@/lib/mock-db'
import { colors, radius, space } from '@/theme/tokens'

import type { PickupApprovalResult, PickupRow } from './pickup-model'
import { PickupRulesList } from './PickupRulesList'
import { useApprovePickupMutation, useValidatePickupMutation } from './usePickupQueries'

/** Lỗi của form là mã; component dịch. Lý do chỉ bắt buộc khi còn luật không đạt — xét lúc bấm Duyệt (như bản web). */
const schema = z.object({ reason: z.string().trim().max(MAX_PICKUP_REASON_LENGTH, 'reasonTooLong') })
type Values = z.infer<typeof schema>

type PickupApproveSheetProps = {
  tripId: string
  row: PickupRow
  stopLabel: (stopId: string) => string
  open: boolean
  onClose: () => void
}

/**
 * Tờ "Duyệt yêu cầu nhận hàng" của điều phối viên (như `PickupApproveDialog` của web). Mở tờ là kiểm lại mười luật theo chuyến lúc này.
 * Đạt cả mười thì duyệt ngay; còn luật không đạt thì lý do vượt luật là bắt buộc — báo thiếu ngay ô nhập. Duyệt xong tờ chuyển sang bước
 * "Đã duyệt": các kiện vừa vào kho kiện kèm mã QR bằng chữ để đọc cho bên gửi (điện thoại không in nhãn). Nơi gọi đổi `key` mỗi lần mở.
 */
export function PickupApproveSheet({ tripId, row, stopLabel, open, onClose }: PickupApproveSheetProps) {
  const t = useT()
  const { request } = row
  const validate = useValidatePickupMutation(tripId)
  const approve = useApprovePickupMutation(tripId)
  const [approved, setApproved] = useState<PickupApprovalResult | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })
  // Kiểm lại đúng một lần mỗi lượt mở (tờ dựng lại theo `key` của nơi gọi)
  const checked = useRef(false)
  const { mutate: check } = validate
  useEffect(() => {
    if (!open || checked.current) return
    checked.current = true
    check(request.id)
  }, [check, open, request.id])

  if (approved !== null) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={t('pickups.approve.doneTitle', { id: approved.request.id })}
        description={t('pickupRequest.approvedDescription', { count: approved.packages.length })}
        footer={
          <Button style={styles.flex} onPress={onClose}>
            {t('pickups.approve.close')}
          </Button>
        }>
        <AppText variant="heading" accessibilityRole="header">
          {t('pickups.approve.packages')}
        </AppText>
        <View style={styles.packages}>
          {approved.packages.map((pkg, index) => (
            <View key={pkg.id} style={[styles.package, index > 0 && styles.divider]} accessible>
              <AppText variant="label" style={styles.code}>
                {pkg.id}
              </AppText>
              <AppText style={styles.code}>{t('pickups.approve.packageRow', { code: pkg.packageCode, qr: pkg.qrToken })}</AppText>
            </View>
          ))}
        </View>
      </Sheet>
    )
  }

  const results = validate.data?.validationResults ?? request.validationResults
  const failed = results.filter((result) => !result.passed).length
  const message = (code: string | undefined) =>
    code === 'reasonRequired'
      ? t('pickups.approve.reasonRequired')
      : code === 'reasonTooLong'
        ? t('pickups.approve.reasonTooLong', { max: MAX_PICKUP_REASON_LENGTH })
        : undefined

  const submit = form.handleSubmit(async ({ reason }) => {
    if (failed > 0 && reason === '') {
      form.setError('reason', { message: 'reasonRequired' })
      return
    }
    setFailure(null)
    try {
      setApproved(await approve.mutateAsync({ pickupId: request.id, input: failed > 0 ? { overrideReason: reason } : {} }))
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  })

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={approve.isPending}
      title={t('pickups.approve.title', { id: request.id })}
      description={t('pickups.approve.description')}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={approve.isPending} onPress={onClose}>
            {t('pickups.approve.cancel')}
          </Button>
          <Button style={styles.flex} loading={approve.isPending} disabled={validate.isPending} onPress={() => void submit()}>
            {t('pickups.approve.confirm')}
          </Button>
        </>
      }>
      {validate.isPending && results.length === 0 ? (
        <LoadingState label={t('pickups.approve.checking')} />
      ) : (
        <>
          <Banner tone={failed === 0 ? 'info' : 'warning'}>{failed === 0 ? t('pickups.approve.allPassed') : t('pickups.approve.someFailed', { count: failed })}</Banner>
          {validate.isPending ? <AppText color={colors.text2}>{t('pickups.approve.checking')}</AppText> : null}
          <PickupRulesList results={results} stopLabel={stopLabel} />
        </>
      )}
      {failed > 0 ? (
        <Controller
          control={form.control}
          name="reason"
          render={({ field, fieldState }) => (
            <TextField
              label={t('pickups.approve.reason')}
              hint={t('pickups.approve.reasonHint')}
              error={message(fieldState.error?.message)}
              multiline
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      ) : null}
      {validate.isError ? <Banner tone="danger">{dataErrorMessage(validate.error, t)}</Banner> : null}
      {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  packages: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  package: { gap: space[1], padding: space[3] },
  divider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  code: { fontVariant: ['tabular-nums'] },
})
