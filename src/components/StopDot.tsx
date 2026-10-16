import { StyleSheet, View } from 'react-native'

import { stopColor, stopForeground } from '@/lib/stops'
import { type as scale } from '@/theme/tokens'

import { AppText } from './AppText'

const SIZES = { md: 32, lg: 40 } as const

/**
 * Số điểm giao trên màu định danh của điểm (Okabe–Ito, `lib/stops.ts` chép từ web). Màu luôn đi kèm số; chữ tối hoặc trắng theo tương
 * phản của từng màu. Chỉ để nhìn và đọc: không bấm được.
 */
export function StopDot({ number, size = 'md' }: { number: number; size?: keyof typeof SIZES }) {
  const side = SIZES[size]
  return (
    <View style={[styles.dot, { width: side, height: side, borderRadius: side / 2, backgroundColor: stopColor(number) }]}>
      <AppText variant={size === 'lg' ? 'heading' : 'label'} color={stopForeground(number)} style={styles.number}>
        {number}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  dot: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  number: { fontVariant: ['tabular-nums'], lineHeight: scale.label.lineHeight },
})
