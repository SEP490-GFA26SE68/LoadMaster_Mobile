import { Hourglass, PackageX } from 'lucide-react-native'
import { memo } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { useT } from '@/lib/i18n'
import { badgeTones, colors, radius, space } from '@/theme/tokens'

import { placementLabel, type ServerStagingRow as Row } from '../server-loading'
import { ServerPackageSummary } from './ServerPackageSummary'

type ServerStagingRowProps = {
  readonly row: Row
  /** Dòng đầu, dòng cuối của danh sách: bo góc trên, góc dưới của khối. */
  readonly first: boolean
  readonly last: boolean
  readonly onReport: (row: Row) => void
}

/**
 * Một kiện chưa soạn của phiên máy chủ (như dòng của `ServerStagingStep` web, dáng của `StagingRow` bản kho mẫu), cao tối thiểu 80: mã in
 * trên nhãn, tên, điểm giao; lý do điều phối viên từ chối xác nhận tay, hoặc lời "tìm tiếp" của điều phối viên. Mép phải: nút phụ 56 "Báo
 * thiếu", hoặc — khi kiện đang chờ điều phối viên — một dòng icon kèm chữ: xác nhận tay chờ duyệt, đã báo thiếu. `memo`: danh sách tới vài
 * trăm dòng, mỗi lần ghi chỉ dòng đổi mới vẽ lại.
 */
export const ServerStagingRow = memo(function ServerStagingRow({ row, first, last, onReport }: ServerStagingRowProps) {
  const t = useT()
  const waiting = row.manualPending ? t('serverWarehouse.staging.manualPending') : row.shortage === 'open' ? t('warehouse.staging.reported') : null
  return (
    <View style={[styles.row, first && styles.first, last && styles.last, waiting !== null && styles.waitingRow]}>
      <View style={styles.text}>
        <ServerPackageSummary placement={row.placement} />
        {row.rejectReason === null ? null : (
          <AppText variant="label" color={badgeTones.warning.fg}>
            {t('serverWarehouse.staging.rejected', { reason: row.rejectReason })}
          </AppText>
        )}
        {row.shortage === 'keepSearching' ? <AppText color={colors.text2}>{t('serverWarehouse.staging.keepSearching')}</AppText> : null}
        {waiting === null ? null : (
          <View style={styles.line}>
            <Hourglass color={badgeTones.warning.fg} size={20} strokeWidth={1.5} style={styles.icon} />
            <AppText variant="label" color={badgeTones.warning.fg} style={styles.flex}>
              {waiting}
            </AppText>
          </View>
        )}
      </View>
      {waiting === null ? (
        <Button write
          variant="secondary"
          icon={PackageX}
          style={styles.action}
          accessibilityLabel={t('warehouseStaging.reportShortageFor', { id: placementLabel(row.placement) })}
          onPress={() => onReport(row)}>
          {t('warehouse.staging.reportShortage')}
        </Button>
      ) : null}
    </View>
  )
})

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
  waitingRow: { backgroundColor: badgeTones.warning.bg },
  // Nền 140: ở 360 dp chữ và nút tiếng Việt chung một hàng; hẹp hơn thì nút xuống hàng
  text: { flexGrow: 1, flexShrink: 1, flexBasis: 140, gap: space[2] },
  action: { marginLeft: 'auto' },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  icon: { marginTop: 2 },
  flex: { flex: 1 },
})
