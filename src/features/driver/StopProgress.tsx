import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { useFormat, useT } from '@/lib/i18n'
import { colors, palette, radius, space } from '@/theme/tokens'

import type { StopScreen } from './driver-model'

/**
 * Dòng "Cần dỡ N kiện · Đã dỡ … · Sự cố …" kèm thước tiến độ dày 12 px (như `StopProgress` của web): xanh lá khi đủ 100 % — màu chỉ nhấn
 * thêm, con số và phần trăm luôn đi kèm. Dòng số là vùng đọc được: dỡ kiện, báo sự cố đổi số thì trình đọc màn hình đọc — thay cho toast
 * thành công. Điểm nhận dọc đường dùng câu "Cần nhận N kiện · Đã nhận …".
 */
export function StopProgress({ screen }: { screen: StopScreen }) {
  const t = useT()
  const format = useFormat()
  const { stop, total, remaining, doneCount, issueCount } = screen
  const pickupStop = stop.kind === 'PICKUP'
  const handled = total - remaining
  const percent = total === 0 ? 100 : Math.round((handled / total) * 100)
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <AppText variant="label" accessibilityLiveRegion="polite" style={styles.flex}>
          {pickupStop ? t('driver.pickup.summary', { total, done: doneCount }) : t('driver.summary', { total, done: doneCount, issues: issueCount })}
        </AppText>
        <AppText variant="label" color={colors.text2} style={styles.number}>
          {`${format.integer(percent)}%`}
        </AppText>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={t(pickupStop ? 'driver.pickup.progress' : 'driver.progress')}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: percent === 100 ? colors.success : colors.primaryFill }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  flex: { flex: 1 },
  number: { fontVariant: ['tabular-nums'] },
  track: { height: 12, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: palette.neutral[100] },
  fill: { height: '100%', borderRadius: radius.pill },
})
