import { StyleSheet, View } from 'react-native'

import { badgeTones, colors, radius, space, type BadgeTone } from '@/theme/tokens'

import { AppText } from './AppText'

/** Chip trạng thái: nền tint, chấm cùng màu chữ, chữ 14 (`meta`). Màu luôn đi kèm chữ — chip không bao giờ chỉ là một chấm màu. */
export function Chip({ tone, label }: { tone: BadgeTone; label: string }) {
  const { bg, fg } = badgeTones[tone]
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <AppText variant="meta" color={fg}>
        {label}
      </AppText>
    </View>
  )
}

/**
 * Nhãn **MOCK RESULT** (tên riêng, không dịch): đi kèm mọi số đến từ mock — giờ đến dự kiến của mock tuyến, kết quả của mock tối ưu. Dạng
 * thẻ bo góc nhỏ có viền, khác chip trạng thái dạng viên thuốc.
 */
export function MockResultTag() {
  return (
    <View style={styles.tag}>
      <AppText variant="meta" color={colors.text2}>
        MOCK RESULT
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: space[1], alignSelf: 'flex-start', paddingHorizontal: space[2], paddingVertical: 4, borderRadius: radius.pill },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
})
