import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { useT } from '@/lib/i18n'
import { badgeTones, colors, palette, radius, space, TOUCH } from '@/theme/tokens'

import { AppText } from './AppText'

const TONES = {
  info: { bg: palette.cyan[50], border: palette.cyan[200], fg: palette.cyan[800], Icon: Info },
  success: { bg: badgeTones.success.bg, border: badgeTones.success.border, fg: badgeTones.success.fg, Icon: CircleCheck },
  warning: { bg: palette.amber[50], border: palette.amber[200], fg: palette.amber[700], Icon: TriangleAlert },
  danger: { bg: palette.red[50], border: palette.red[200], fg: palette.red[700], Icon: CircleAlert },
} as const

export type BannerTone = keyof typeof TONES

type BannerProps = {
  tone: BannerTone
  /** Icon riêng thay icon của tông (ghim "đã đến", gói hàng "điểm nhận"). */
  icon?: LucideIcon
  /** Có thì dải có nút ẩn 56 ở mép phải. */
  onDismiss?: () => void
  children: ReactNode
}

/**
 * Dải thông báo trong luồng màn. `danger` và `warning` là cảnh báo: trình đọc màn hình đọc ngay khi hiện; `success` là kết quả vừa ghi,
 * cũng được đọc; `info` là câu cố định của màn.
 */
export function Banner({ tone, icon, onDismiss, children }: BannerProps) {
  const t = useT()
  const { bg, border, fg, Icon: ToneIcon } = TONES[tone]
  const Icon = icon ?? ToneIcon
  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: border }]}>
      <View
        accessibilityRole={tone === 'danger' || tone === 'warning' ? 'alert' : 'text'}
        accessibilityLiveRegion={tone === 'info' ? 'none' : 'polite'}
        style={styles.content}>
        <Icon color={fg} size={20} strokeWidth={1.5} style={styles.icon} />
        <AppText color={colors.text} style={styles.text}>
          {children}
        </AppText>
      </View>
      {onDismiss === undefined ? null : (
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.dismiss')} onPress={onDismiss} style={styles.dismiss}>
          <X color={colors.text2} size={20} strokeWidth={1.5} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: radius.md, borderWidth: 1 },
  content: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: space[2], padding: space[3] },
  icon: { marginTop: 2 },
  text: { flex: 1 },
  dismiss: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
})
