import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { TripStatusChip } from '@/components/TripStatus'
import { useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import type { DashboardSummary } from '../dashboard-summary'

/**
 * "Chuyến theo trạng thái" của kỳ (biểu đồ cột của web thành một danh sách số trên điện thoại): mỗi trạng thái có chuyến trong kỳ một dòng
 * — chip trạng thái, số chuyến và tỷ lệ trên tổng của kỳ, như bảng số đi kèm biểu đồ của web. Trạng thái không có chuyến nào không có dòng.
 */
export function StatusCountsCard({ entries, total }: { entries: DashboardSummary['tripsByStatus']; total: number }) {
  const t = useT()
  const format = useFormat()
  return (
    <Card>
      <View style={styles.head}>
        <AppText variant="heading" accessibilityRole="header">
          {t('manager.charts.status.title')}
        </AppText>
        <AppText color={colors.text2} style={styles.number}>
          {t('manager.charts.status.total', { count: total })}
        </AppText>
      </View>
      <AppText color={colors.text3}>{t('manager.charts.status.note')}</AppText>
      {entries.map((entry) => {
        const count = format.integer(entry.count)
        const share = format.percent(total === 0 ? 0 : (entry.count / total) * 100)
        return (
          <View
            key={entry.status}
            accessible
            accessibilityLabel={t('overview.statusRowA11y', { status: t(`status.${entry.status}`), count, share })}
            style={styles.row}>
            <TripStatusChip status={entry.status} />
            <AppText variant="label" style={styles.number}>
              {t('overview.statusRow', { count, share })}
            </AppText>
          </View>
        )
      })}
    </Card>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: space[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  number: { fontVariant: ['tabular-nums'] },
})
