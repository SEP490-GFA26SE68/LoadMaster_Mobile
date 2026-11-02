import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch, type Control } from 'react-hook-form'
import { StyleSheet } from 'react-native'
import { z } from 'zod'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { ChoiceGroup } from '@/components/ChoiceGroup'
import { Sheet } from '@/components/Sheet'
import { LoadingState } from '@/components/StateView'
import { TextField } from '@/components/TextField'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { MAX_EXCEPTION_NOTE_LENGTH } from '@/lib/mock-db'
import { colors } from '@/theme/tokens'

import { deadlineText, parseDeadline } from './deadline-input'
import type { TripRequirementRow } from './monitoring-api'
import type { EscalationRow } from './monitoring-view'
import { useMoment } from './useMoment'
import { useRenegotiateDeadlineMutation, useTripRequirementsQuery } from './useMonitoringQueries'

/** Lỗi của form là mã; component dịch qua `monitoring.renegotiate.errors`. Hạn có ở tương lai hay không do kho xét theo đồng hồ của nó. */
const ERRORS = ['requirementRequired', 'noteRequired', 'noteTooLong', 'deadlineInvalid'] as const
type ErrorCode = (typeof ERRORS)[number]
const isError = (code: string | undefined): code is ErrorCode => ERRORS.some((item) => item === code)

const schema = z
  .object({
    requirementId: z.string().min(1, 'requirementRequired' satisfies ErrorCode),
    contactNote: z
      .string()
      .trim()
      .min(1, 'noteRequired' satisfies ErrorCode)
      .max(MAX_EXCEPTION_NOTE_LENGTH, 'noteTooLong' satisfies ErrorCode),
    date: z.string(),
    time: z.string(),
  })
  .superRefine((value, ctx) => {
    if (parseDeadline(value.date, value.time).kind !== 'ok') ctx.addIssue({ code: 'custom', path: ['date'], message: 'deadlineInvalid' satisfies ErrorCode })
  })
type Input = z.input<typeof schema>
type Values = z.output<typeof schema>

type RenegotiateSheetProps = {
  /** Sự cố đã chuyển quản lý cần gia hạn, chuyến của nó và các điểm chưa giao kèm giờ đến. */
  row: EscalationRow
  open: boolean
  onClose: () => void
  /** Kho đã ghi hạn mới cho yêu cầu `requirementId`: tờ đóng, màn nói đã lưu. */
  onDone: (requirementId: string) => void
}

/**
 * "Liên hệ khách và nhập hạn mới" của quản lý công ty (như `RenegotiateDialog` của web): chọn yêu cầu giao của chuyến còn đang giao, ghi
 * việc đã liên hệ khách (bắt buộc) và nhập hạn mới bằng hai ô chữ — ngày, giờ theo giờ của máy, điền sẵn hạn hiện tại của yêu cầu chọn sẵn
 * (yêu cầu ở điểm xe đang tới lúc báo sự cố, không có thì yêu cầu đầu tiên). Kho từ chối hạn không ở tương lai; lỗi hiện trong tờ và giữ
 * dữ liệu đang nhập. Nơi gọi đổi `key` mỗi lần mở.
 */
export function RenegotiateSheet({ row, open, onClose, onDone }: RenegotiateSheetProps) {
  const t = useT()
  const format = useFormat()
  const query = useTripRequirementsQuery(row.trip.tripId, true)
  const renegotiate = useRenegotiateDeadlineMutation(row.trip.tripId)
  const [failure, setFailure] = useState<string | null>(null)
  // Yêu cầu còn đang giao và còn điểm giao trong chuyến mới gia hạn được
  const requirements = (query.data ?? []).filter((item) => item.status === 'IN_TRIP' && item.stopNumber !== undefined)
  const initial = requirements.find((item) => item.stopNumber === row.exception.stopNumber) ?? requirements[0]
  const parts = initial === undefined ? { date: '', time: '' } : deadlineText(initial.requirement.deadline)
  // Dựng form trước khi tải xong yêu cầu giao (tờ là một Modal: không đổi tờ giữa chừng); tải xong thì điền giá trị chọn sẵn
  const form = useForm<Input, unknown, Values>({
    resolver: zodResolver(schema),
    values: { requirementId: initial?.requirement.id ?? '', contactNote: '', date: parts.date, time: parts.time },
    resetOptions: { keepDirtyValues: true },
  })
  const message = (code: string | undefined) => {
    if (!isError(code)) return undefined
    return code === 'noteTooLong' ? t('monitoring.renegotiate.errors.noteTooLong', { max: MAX_EXCEPTION_NOTE_LENGTH }) : t(`monitoring.renegotiate.errors.${code}`)
  }
  const ready = query.isSuccess && requirements.length > 0

  const submit = form.handleSubmit(async ({ requirementId, contactNote, date, time }) => {
    const deadline = parseDeadline(date, time)
    if (deadline.kind !== 'ok') return
    setFailure(null)
    try {
      await renegotiate.mutateAsync({ exceptionId: row.exception.id, input: { requirementId, deadline: deadline.iso, contactNote } })
      onDone(requirementId)
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  })

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={renegotiate.isPending}
      title={t('monitoring.renegotiate.title')}
      description={t('monitoring.renegotiate.description', { id: row.exception.id, tripId: row.trip.tripId })}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={renegotiate.isPending} onPress={onClose}>
            {t('monitoring.renegotiate.cancel')}
          </Button>
          {ready ? (
            <Button style={styles.flex} loading={renegotiate.isPending} onPress={() => void submit()}>
              {t('monitoring.renegotiate.submit')}
            </Button>
          ) : null}
        </>
      }>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <Banner tone="danger">{dataErrorMessage(query.error, t)}</Banner>
      ) : !ready ? (
        <Banner tone="info">{t('monitoring.renegotiate.noRequirements')}</Banner>
      ) : (
        <>
          <Controller
            control={form.control}
            name="requirementId"
            render={({ field, fieldState }) => (
              <ChoiceGroup
                label={t('monitoring.renegotiate.requirement')}
                choices={requirements.map(({ requirement, stopNumber }) => ({
                  value: requirement.id,
                  label: t('monitoring.renegotiate.requirementOption', {
                    id: requirement.id,
                    destination: requirement.destinationName,
                    number: format.integer(stopNumber ?? 0),
                  }),
                }))}
                value={field.value}
                onChange={field.onChange}
                error={message(fieldState.error?.message)}
              />
            )}
          />
          <CurrentDeadline control={form.control} row={row} requirements={requirements} />
          <Controller
            control={form.control}
            name="contactNote"
            render={({ field, fieldState }) => (
              <TextField
                label={t('monitoring.renegotiate.contactNote')}
                hint={t('monitoring.renegotiate.contactHint')}
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
            name="date"
            render={({ field, fieldState }) => (
              <TextField
                label={t('monitoring.renegotiate.date')}
                hint={t('liveTrip.deadline.dateHint')}
                error={message(fieldState.error?.message)}
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
            name="time"
            render={({ field }) => (
              <TextField
                label={t('monitoring.renegotiate.time')}
                hint={t('liveTrip.deadline.timeHint')}
                code
                keyboardType="numbers-and-punctuation"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          {failure === null ? null : <Banner tone="danger">{failure}</Banner>}
        </>
      )}
    </Sheet>
  )
}

/** Hạn hiện tại của yêu cầu đang chọn và giờ đến dự kiến của điểm giao của nó — con số quản lý cần khi thoả thuận hạn mới. */
function CurrentDeadline({ control, row, requirements }: { control: Control<Input, unknown, Values>; row: EscalationRow; requirements: readonly TripRequirementRow[] }) {
  const t = useT()
  const moment = useMoment()
  const requirementId = useWatch({ control, name: 'requirementId' })
  const chosen = requirements.find((item) => item.requirement.id === requirementId)
  if (chosen === undefined) return null
  const eta = row.stops.find((stop) => stop.number === chosen.stopNumber)?.eta
  const deadline = moment(chosen.requirement.deadline)
  return (
    <AppText color={colors.text2}>
      {eta === undefined ? t('monitoring.renegotiate.current', { deadline }) : t('monitoring.renegotiate.currentEta', { deadline, eta: moment(eta) })}
    </AppText>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
