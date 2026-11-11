import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, type Control } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'
import { z } from 'zod'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { TextField } from '@/components/TextField'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { space } from '@/theme/tokens'

import type { ServerPlacement } from '../warehouse-server-model'
import { useRecordServerDeviation } from './useServerWarehouseQueries'

const MAX_REASON = 500

/** Lỗi của form là mã; tờ dịch qua `serverWarehouse.deviation.<mã>`. */
type ErrorCode = 'numberRequired' | 'reasonRequired' | 'reasonTooLong'

const centimeters = z.string().trim().regex(/^\d+$/, 'numberRequired' satisfies ErrorCode)
const schema = z.object({
  x: centimeters,
  y: centimeters,
  z: centimeters,
  reason: z
    .string()
    .trim()
    .min(1, 'reasonRequired' satisfies ErrorCode)
    .max(MAX_REASON, 'reasonTooLong' satisfies ErrorCode),
})
type Input = z.input<typeof schema>
type Values = z.output<typeof schema>

type ServerDeviationSheetProps = {
  readonly tripId: string
  readonly placement: ServerPlacement
  readonly step: number
  readonly onClose: () => void
}

/**
 * Ghi sai lệch vị trí của kiện bước hiện tại (như `ServerDeviationDialog` của web), trượt từ đáy để bàn phím ảo không che ô đang nhập: vị
 * trí thật sự đặt (cm, số nguyên như máy chủ nhận) và lý do bắt buộc; ba ô bắt đầu bằng vị trí trong phương án. Máy chủ ghi kiện đã xếp kèm
 * sai lệch rồi tờ đóng — màn sang kiện kế tiếp, danh sách ghi "Đã xếp · lệch vị trí". Máy chủ từ chối thì câu lỗi ở trong tờ, chữ đang nhập
 * giữ nguyên. Nơi gọi chỉ dựng tờ khi mở và đổi `key` theo kiện, để form bắt đầu lại.
 */
export function ServerDeviationSheet({ tripId, placement, step, onClose }: ServerDeviationSheetProps) {
  const t = useT()
  const record = useRecordServerDeviation(tripId)
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<Input, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: { x: String(Math.round(placement.x)), y: String(Math.round(placement.y)), z: String(Math.round(placement.z)), reason: '' },
  })
  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      const input = { x: Number(values.x), y: Number(values.y), z: Number(values.z), reason: values.reason }
      await record.mutateAsync({ placementId: placement.id, input })
      onClose()
    } catch (error) {
      setFailure(dataErrorMessage(error, t))
    }
  })

  return (
    <Sheet
      open
      onClose={onClose}
      busy={record.isPending}
      title={t('serverWarehouse.deviation.title', { step })}
      description={t('serverWarehouse.deviation.description')}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={record.isPending} onPress={onClose}>
            {t('serverWarehouse.deviation.cancel')}
          </Button>
          <Button style={styles.flex} loading={record.isPending} onPress={() => void submit()}>
            {t('serverWarehouse.deviation.submit')}
          </Button>
        </>
      }>
      <View style={styles.axes}>
        <AxisField control={form.control} name="x" label={t('serverWarehouse.deviation.x')} />
        <AxisField control={form.control} name="y" label={t('serverWarehouse.deviation.y')} />
        <AxisField control={form.control} name="z" label={t('serverWarehouse.deviation.z')} />
      </View>
      <Controller
        control={form.control}
        name="reason"
        render={({ field, fieldState }) => (
          <TextField
            label={t('serverWarehouse.deviation.reason')}
            hint={t('serverWarehouse.deviation.reasonHint')}
            error={errorText(fieldState.error?.message, t)}
            multiline
            maxLength={MAX_REASON}
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

function errorText(code: string | undefined, t: ReturnType<typeof useT>): string | undefined {
  return code === 'numberRequired' || code === 'reasonRequired' || code === 'reasonTooLong' ? t(`serverWarehouse.deviation.${code}`) : undefined
}

/** Một ô toạ độ: bàn phím số, chữ số đều; ba ô chung một hàng ở 360 dp, hẹp quá thì xuống hàng. */
function AxisField({ control, name, label }: { control: Control<Input, unknown, Values>; name: 'x' | 'y' | 'z'; label: string }) {
  const t = useT()
  return (
    <View style={styles.axis}>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <TextField
            label={label}
            error={errorText(fieldState.error?.message, t)}
            code
            keyboardType="number-pad"
            autoCorrect={false}
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
  axes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  axis: { flexGrow: 1, flexBasis: 96 },
})
