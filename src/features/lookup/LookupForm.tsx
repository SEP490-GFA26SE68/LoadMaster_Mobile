import { zodResolver } from '@hookform/resolvers/zod'
import { Search } from 'lucide-react-native'
import { Controller, useForm, type UseFormReturn } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'
import { z } from 'zod'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useT } from '@/lib/i18n'
import { space } from '@/theme/tokens'

const lookupSchema = z.object({ code: z.string().trim().min(1, 'lookup.codeRequired') })
type LookupInput = z.input<typeof lookupSchema>
type LookupValues = z.output<typeof lookupSchema>

export type LookupFormApi = UseFormReturn<LookupInput, unknown, LookupValues>

/** Form của ô tra mã. Màn giữ form để đặt mã vừa quét vào ô (như bản web: ô luôn mang mã đang tra). */
export function useLookupForm(): LookupFormApi {
  return useForm<LookupInput, unknown, LookupValues>({ resolver: zodResolver(lookupSchema), defaultValues: { code: '' } })
}

/**
 * Ô gõ mã QR, mã của bên gửi hoặc mã của kho kiện, và nút "Tra cứu" (nút phụ — nút chính của màn là quét mã QR ở chân màn). Phím "Tìm"
 * của bàn phím cũng tra. Mã bỏ khoảng trắng hai đầu; ô trống thì nói ngay dưới ô.
 */
export function LookupForm({ form, onSubmit }: { form: LookupFormApi; onSubmit: () => void }) {
  const t = useT()
  return (
    <View style={styles.form}>
      <Controller
        control={form.control}
        name="code"
        render={({ field, fieldState }) => (
          <TextField
            label={t('lookup.codeLabel')}
            hint={t('lookup.codeHint')}
            placeholder={t('lookup.codePlaceholder')}
            error={fieldState.error === undefined ? undefined : t('lookup.codeRequired')}
            code
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            returnKeyType="search"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={onSubmit}
          />
        )}
      />
      <Button variant="secondary" icon={Search} onPress={onSubmit}>
        {t('lookup.submit')}
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: space[3] },
})
