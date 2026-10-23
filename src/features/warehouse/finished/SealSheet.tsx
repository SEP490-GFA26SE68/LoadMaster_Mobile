import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet } from 'react-native'
import { z } from 'zod'

import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { TextField } from '@/components/TextField'
import { useT } from '@/lib/i18n'
import { MAX_SEAL_LENGTH } from '@/lib/mock-db'

/** Lỗi của form là mã; tờ dịch qua `warehouse.seal.<mã>` — cùng luật với `SealCard` của web và `recordSeal` của kho. */
type ErrorCode = 'required' | 'tooLong'

const schema = z.object({
  number: z
    .string()
    .trim()
    .min(1, 'required' satisfies ErrorCode)
    .max(MAX_SEAL_LENGTH, 'tooLong' satisfies ErrorCode),
})
type Input = z.input<typeof schema>
type Values = z.output<typeof schema>

type SealSheetProps = {
  readonly open: boolean
  /** Số seal đã ghi khi đổi số seal: ô bắt đầu bằng số này. */
  readonly initial: string
  readonly pending: boolean
  /** Câu lỗi của lần ghi vừa rồi; chữ đang nhập giữ nguyên. */
  readonly failure: string | null
  readonly onCancel: () => void
  /** Số seal đã bỏ khoảng trắng hai đầu, 1 → `MAX_SEAL_LENGTH` ký tự. */
  readonly onSubmit: (sealNumber: string) => Promise<void>
}

/**
 * Tờ nhập số seal niêm phong cửa thùng (phần form của `SealCard` web), trượt từ đáy để bàn phím ảo không che ô đang nhập. Ô mở sẵn bàn
 * phím, chữ in hoa, không gợi ý chữ; phím "Xong" của bàn phím cũng là ghi. Nơi gọi đổi `key` mỗi lần mở để form bắt đầu lại.
 */
export function SealSheet({ open, initial, pending, failure, onCancel, onSubmit }: SealSheetProps) {
  const t = useT()
  const form = useForm<Input, unknown, Values>({ resolver: zodResolver(schema), defaultValues: { number: initial } })
  const message = (code: string | undefined) =>
    code === 'tooLong' ? t('warehouse.seal.tooLong', { max: MAX_SEAL_LENGTH }) : code === 'required' ? t('warehouse.seal.required') : undefined
  const submit = form.handleSubmit(({ number }) => onSubmit(number))
  // Phím "Xong" của bàn phím không bị khoá như nút: đang ghi thì bỏ qua, không ghi số seal thêm lần nữa
  const submitFromKeyboard = () => {
    if (!pending) void submit()
  }

  return (
    <Sheet
      open={open}
      onClose={onCancel}
      busy={pending}
      title={t('warehouse.seal.title')}
      description={t('warehouse.seal.description')}
      footer={
        <>
          <Button variant="secondary" style={styles.flex} disabled={pending} onPress={onCancel}>
            {t('common.back')}
          </Button>
          <Button style={styles.flex} loading={pending} onPress={() => void submit()}>
            {t('warehouse.seal.submit')}
          </Button>
        </>
      }>
      <Controller
        control={form.control}
        name="number"
        render={({ field, fieldState }) => (
          <TextField
            label={t('warehouse.seal.label')}
            hint={t('warehouse.seal.hint', { max: MAX_SEAL_LENGTH })}
            error={message(fieldState.error?.message)}
            code
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            returnKeyType="done"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={submitFromKeyboard}
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
