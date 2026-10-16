import { Eye, EyeOff } from 'lucide-react-native'
import { useId, useState } from 'react'
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native'

import { useT } from '@/lib/i18n'
import { colors, radius, space, TOUCH, type as scale } from '@/theme/tokens'

import { AppText } from './AppText'

export type TextFieldProps = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string
  /** Gợi ý dưới ô (chữ phụ); có lỗi thì câu lỗi thay chỗ gợi ý. Trình đọc màn hình đọc gợi ý sau tên ô. */
  hint?: string
  error?: string | undefined
  /** Ô mật khẩu: che chữ, kèm nút hiện / ẩn. */
  secure?: boolean
  /** Mã (mã kiện, mã QR): chữ số cùng bề rộng. */
  code?: boolean
}

/** Ô nhập có nhãn phía trên, gợi ý hoặc câu lỗi phía dưới. Tên truy cập của ô là chữ nhãn. `multiline` cho ghi chú nhiều dòng. */
export function TextField({ label, hint, error, secure = false, code = false, multiline = false, onFocus, onBlur, ...rest }: TextFieldProps) {
  const t = useT()
  const labelId = useId()
  const [focused, setFocused] = useState(false)
  const [revealed, setRevealed] = useState(false)

  return (
    <View style={styles.field}>
      <AppText variant="label" color={colors.text2} nativeID={labelId}>
        {label}
      </AppText>
      <View style={[styles.box, focused && styles.boxFocused, error !== undefined && styles.boxError]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityLabelledBy={labelId}
          {...(hint === undefined ? {} : { accessibilityHint: hint })}
          aria-invalid={error !== undefined}
          placeholderTextColor={colors.text3}
          multiline={multiline}
          {...rest}
          secureTextEntry={secure && !revealed}
          // Đang hiện mật khẩu thì không để bàn phím gợi ý hay tự sửa chữ
          {...(secure ? { autoCorrect: false, spellCheck: false, autoCapitalize: 'none' as const } : {})}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          style={[styles.input, multiline && styles.multiline, code && styles.code]}
        />
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(revealed ? 'auth.passwordToggle.hide' : 'auth.passwordToggle.show')}
            accessibilityState={{ selected: revealed }}
            onPress={() => setRevealed((value) => !value)}
            style={styles.toggle}>
            {revealed ? <EyeOff color={colors.text2} size={24} strokeWidth={1.5} /> : <Eye color={colors.text2} size={24} strokeWidth={1.5} />}
          </Pressable>
        )}
      </View>
      {error !== undefined ? (
        <AppText color={colors.danger} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint !== undefined ? (
        <AppText color={colors.text3}>{hint}</AppText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: space[1] },
  box: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.bg },
  boxFocused: { borderColor: colors.focus, borderWidth: 2 },
  boxError: { borderColor: colors.danger },
  input: { flex: 1, minHeight: TOUCH, paddingHorizontal: space[3], color: colors.text, fontSize: scale.body.fontSize },
  // Ghi chú: ba dòng, chữ bắt đầu từ trên
  multiline: { minHeight: 96, paddingVertical: space[3], textAlignVertical: 'top' },
  code: { fontVariant: ['tabular-nums'] },
  toggle: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
})
