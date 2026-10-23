import { Hourglass, PackageX } from 'lucide-react-native'
import { memo } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { StopDot } from '@/components/StopDot'
import type { ScenePlacement } from '@/features/viewer3d/scene-input'
import { useT } from '@/lib/i18n'
import { badgeTones, colors, radius, space } from '@/theme/tokens'

/** Phần của một kiện mà bước Soạn hàng cần: mã instance (in trên nhãn), tên, số điểm giao hiện tại. */
export type StagingItem = Pick<ScenePlacement, 'id' | 'name' | 'stop'>

type StagingRowProps = {
  readonly item: StagingItem
  /** Kho đã báo thiếu kiện này, chờ điều phối viên quyết. */
  readonly reported: boolean
  /** Dòng đầu, dòng cuối của danh sách: bo góc trên, góc dưới của khối. */
  readonly first: boolean
  readonly last: boolean
  /** Có thì kiện chưa báo thiếu có nút "Báo thiếu"; vắng khi nguồn dữ liệu không nhận báo thiếu. */
  readonly onReport: ((item: StagingItem) => void) | undefined
}

/**
 * Một dòng của danh sách "Kiện chưa soạn" (như dòng của `StagingStepPage` web), cao tối thiểu 80: mã kiện, tên, điểm giao — chấm màu luôn
 * kèm chữ "Điểm n" — và nút phụ 56 "Báo thiếu" ở mép phải, trong tầm ngón cái; tên đọc được của nút nói là kiện nào. Chữ hẹp quá (tiếng
 * Anh ở 360 dp, cỡ chữ phóng to) thì nút xuống hàng dưới, vẫn ở mép phải, để mã kiện không bị bẻ. Kiện đã báo thiếu ở lại danh sách: nền
 * hổ phách nhạt, nút nhường chỗ cho dòng "Đã báo thiếu — chờ điều phối" (icon và chữ, không chỉ màu). Các dòng nối thành một khối viền.
 * `memo`: danh sách tới vài trăm dòng, mỗi lần ghi chỉ dòng đổi mới vẽ lại.
 */
export const StagingRow = memo(function StagingRow({ item, reported, first, last, onReport }: StagingRowProps) {
  const t = useT()
  return (
    <View style={[styles.row, first && styles.first, last && styles.last, reported && styles.reportedRow]}>
      <View style={styles.text}>
        <PackageSummary item={item} />
        {reported ? (
          <View style={styles.line}>
            <Hourglass color={badgeTones.warning.fg} size={20} strokeWidth={1.5} style={styles.icon} />
            <AppText variant="label" color={badgeTones.warning.fg} style={styles.flex}>
              {t('warehouse.staging.reported')}
            </AppText>
          </View>
        ) : null}
      </View>
      {reported || onReport === undefined ? null : (
        <Button
          variant="secondary"
          icon={PackageX}
          style={styles.action}
          accessibilityLabel={t('warehouseStaging.reportShortageFor', { id: item.id })}
          onPress={() => onReport(item)}>
          {t('warehouse.staging.reportShortage')}
        </Button>
      )}
    </View>
  )
})

/**
 * Mã kiện (chữ số đều), tên, và điểm giao: chấm màu mang số điểm (trình đọc màn hình bỏ qua, chữ "Điểm n" bên cạnh đã nói) — dùng chung
 * cho dòng danh sách và tờ báo thiếu.
 */
export function PackageSummary({ item }: { item: StagingItem }) {
  const t = useT()
  return (
    <View style={styles.summary}>
      <AppText variant="label" style={styles.code}>
        {item.id}
      </AppText>
      <AppText color={colors.text2}>{item.name}</AppText>
      <View style={styles.stop}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <StopDot number={item.stop} />
        </View>
        <AppText variant="label" color={colors.text2} style={styles.flex}>
          {t('common.stop', { number: item.stop })}
        </AppText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: 80,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space[3],
    rowGap: space[2],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  first: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  last: { borderBottomColor: colors.border, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  reportedRow: { backgroundColor: badgeTones.warning.bg },
  // Nền 140: ở 360 dp chữ và nút tiếng Việt chung một hàng; hẹp hơn thì nút xuống hàng
  text: { flexGrow: 1, flexShrink: 1, flexBasis: 140, gap: space[2] },
  action: { marginLeft: 'auto' },
  summary: { gap: space[1] },
  code: { fontVariant: ['tabular-nums'] },
  stop: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  icon: { marginTop: 2 },
  flex: { flex: 1 },
})
