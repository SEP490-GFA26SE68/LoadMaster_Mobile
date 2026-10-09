import { CircleAlert, Info, TriangleAlert } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { colors, palette, radius, space } from '@/theme/tokens'

import { AppText } from './AppText'

const TONES = {
  info: { bg: palette.cyan[50], border: palette.cyan[200], fg: palette.cyan[800], Icon: Info },
  warning: { bg: palette.amber[50], border: palette.amber[200], fg: palette.amber[700], Icon: TriangleAlert },
  danger: { bg: palette.red[50], border: palette.red[200], fg: palette.red[700], Icon: CircleAlert },
} as const

/** Dải thông báo trong luồng màn. `danger` và `warning` được trình đọc màn hình đọc ngay khi hiện. */
export function Banner({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  const { bg, border, fg, Icon } = TONES[tone]
  return (
    <View
      accessibilityRole={tone === 'info' ? 'text' : 'alert'}
      accessibilityLiveRegion={tone === 'info' ? 'none' : 'polite'}
      style={[styles.banner, { backgroundColor: bg, borderColor: border }]}>
      <Icon color={fg} size={20} strokeWidth={1.5} />
      <AppText color={colors.text} style={styles.text}>
        {children}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], padding: space[3], borderRadius: radius.md, borderWidth: 1 },
  text: { flex: 1 },
})
