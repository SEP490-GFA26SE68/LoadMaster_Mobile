import type { LucideIcon } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native'

import { colors, radius, TOUCH } from '@/theme/tokens'

type IconButtonProps = Omit<PressableProps, 'children' | 'style' | 'accessibilityLabel'> & {
  icon: LucideIcon
  /** Tên đọc của nút — nút chỉ có icon nên tên là bắt buộc. */
  label: string
  /** `sky`: nền đặc của dải trời (không kính); `light`: nền trắng viền mảnh. */
  tone?: 'light' | 'sky'
  /** Vẽ đè góc trên phải (số chưa đọc của chuông). Chỉ để nhìn: tên đọc phải nói đủ. */
  badge?: ReactNode
}

/** Nút chỉ có icon, vùng chạm 56 × 56. Nhấn chỉ đổi màu nền. */
export function IconButton({ icon: Icon, label, tone = 'light', badge, disabled = false, ...rest }: IconButtonProps) {
  const sky = tone === 'sky'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [styles.base, sky ? styles.sky : styles.light, pressed && (sky ? styles.skyPressed : styles.lightPressed)]}>
      <Icon color={disabled ? colors.textDisabled : sky ? colors.skyText : colors.text} size={24} strokeWidth={1.5} />
      {badge === undefined ? null : (
        <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {badge}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1 },
  light: { backgroundColor: colors.bg, borderColor: colors.border },
  lightPressed: { backgroundColor: colors.surface, borderColor: colors.lineStrong },
  sky: { backgroundColor: colors.skySolid, borderColor: colors.skySolidBorder },
  skyPressed: { backgroundColor: colors.skySolidPressed },
  badge: { position: 'absolute', top: 4, right: 4 },
})
