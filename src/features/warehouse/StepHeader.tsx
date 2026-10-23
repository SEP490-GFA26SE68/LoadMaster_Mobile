import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { useFormat, useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

/**
 * Tiến độ của bước đang làm, trong dải trời dưới mã chuyến — đặt vào `below` của `Screen`:
 * - bước Soạn hàng (WP-B): `<StepHeader kind="staging" staged={progress.staged} total={progress.total} />` với `progress` là
 *   `stagingProgress(model.placements, trip.loading)` — dòng "Đã soạn x / y";
 * - bước Xếp (WP-C): `<StepHeader kind="loading" step={progress.current?.step ?? progress.total} total={progress.total}
 *   recorded={progress.recorded} />` với `progress` là `loadingProgress(model.placements, trip.loading)` — dòng "Bước n / tổng" (n là
 *   thứ tự xếp của kiện đang hỏi, không vượt tổng), thêm dòng "Đã có kết quả r / tổng kiện".
 *
 * Thanh tiến độ tính theo số kiện đã xong trong kho (đã soạn; đã có kết quả xếp — đã xếp hay hỏng bị bỏ lại), không theo số bước. Ở 360 dp
 * dòng chữ và phần trăm chung một hàng, chữ tự xuống hàng khi phóng to cỡ chữ.
 */
export type StepHeaderProps =
  | { readonly kind: 'staging'; readonly staged: number; readonly total: number }
  | { readonly kind: 'loading'; readonly step: number; readonly total: number; readonly recorded: number }

export function StepHeader(props: StepHeaderProps) {
  const t = useT()
  const format = useFormat()
  const { total } = props
  const done = props.kind === 'staging' ? props.staged : props.recorded
  const percent = total === 0 ? 100 : Math.round((done / total) * 100)
  const line =
    props.kind === 'staging'
      ? t('warehouseSession.staged', { done: props.staged, total })
      : t('warehouseSession.step', { step: Math.min(props.step, total), total })
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <AppText variant="heading" color={colors.skyText} style={styles.line}>
          {line}
        </AppText>
        <AppText variant="label" color={colors.skyText2} style={styles.percent}>
          {`${format.integer(percent)}%`}
        </AppText>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={props.kind === 'staging' ? t('warehouse.staging.progress') : t('warehouse.header.progress')}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      {props.kind === 'loading' ? (
        <AppText color={colors.skyText2}>{t('warehouseSession.recorded', { recorded: props.recorded, total })}</AppText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space[3] },
  line: { flexShrink: 1 },
  percent: { fontVariant: ['tabular-nums'] },
  track: { height: 10, overflow: 'hidden', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.skySolidBorder, backgroundColor: colors.skySolid },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primaryFill },
})
