import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native'

import { colors, radius, space, TOUCH } from '@/theme/tokens'

import { AppText } from './AppText'

type Variant = 'primary' | 'secondary' | 'danger' | 'skySolid'

type Look = { readonly rest: ViewStyle; readonly pressed: ViewStyle; readonly text: string }

/** Mỗi màn đúng một nút `primary`. `skySolid` là nút phụ trên dải trời (nền đặc, không kính). */
const LOOKS: Record<Variant, Look> = {
  primary: { rest: { backgroundColor: colors.primaryFill, borderColor: colors.primaryFillBorder }, pressed: { backgroundColor: colors.primaryFillPressed }, text: colors.onPrimary },
  secondary: { rest: { backgroundColor: colors.bg, borderColor: colors.border }, pressed: { backgroundColor: colors.surface, borderColor: colors.lineStrong }, text: colors.text },
  danger: { rest: { backgroundColor: colors.danger, borderColor: colors.danger }, pressed: { backgroundColor: colors.dangerPressed }, text: colors.bg },
  skySolid: { rest: { backgroundColor: colors.skySolid, borderColor: colors.skySolidBorder }, pressed: { backgroundColor: colors.skySolidPressed }, text: colors.skyText },
}

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode
  variant?: Variant
  /** Đang gửi: nút giữ nguyên bề rộng, hiện vòng quay và không nhận bấm. */
  loading?: boolean
  style?: ViewStyle
}

/** Nút cao 56 (vùng chạm tối thiểu của app). Nhấn chỉ đổi màu nền: không phóng to, không nhấc lên. */
export function Button({ children, variant = 'primary', loading = false, disabled = false, style, ...rest }: ButtonProps) {
  const look = LOOKS[variant]
  const blocked = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      {...rest}
      style={({ pressed }) => [styles.base, look.rest, pressed && look.pressed, disabled && styles.disabled, style]}>
      {loading && <ActivityIndicator color={look.text} />}
      <AppText variant="label" color={disabled ? colors.textDisabled : look.text}>
        {children}
      </AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], paddingHorizontal: space[4], borderRadius: radius.md, borderWidth: 1 },
  disabled: { backgroundColor: colors.border, borderColor: colors.border },
})
