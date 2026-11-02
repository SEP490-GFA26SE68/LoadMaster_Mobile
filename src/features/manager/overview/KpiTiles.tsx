import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { MockResultTag } from '@/components/Chip'
import { useFormat, useT } from '@/lib/i18n'
import { colors, radius, shadow, space } from '@/theme/tokens'

import type { DashboardSummary } from '../dashboard-summary'

type Tile = {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly unit?: string
  /** Số lấy từ đâu trong kho; khi chưa có số là lý do. */
  readonly note: string
  readonly mock?: boolean
}

/**
 * Năm số của kỳ (như `KpiRow` của web), hai ô một hàng trên điện thoại. Mỗi ô một dòng nói số lấy từ đâu; kỳ chưa có số để tính tỷ lệ thì
 * ô ghi "—" kèm lý do, không ghi 0% như thể đã đo được. Lấp đầy thể tích lấy từ kết quả tối ưu mock nên mang MOCK RESULT. Số cùng một màu
 * mực: màu không nói số tốt hay xấu. Mỗi ô đọc thành một câu: nhãn, số, đơn vị, nguồn.
 */
export function KpiTiles({ summary }: { summary: DashboardSummary }) {
  const t = useT()
  const format = useFormat()
  const { fill, delivery, vehicles } = summary
  const noValue = t('manager.noValue')
  const tiles: Tile[] = [
    {
      key: 'trips',
      label: t('manager.kpi.trips'),
      value: format.integer(summary.completedCount),
      unit: t('manager.kpi.tripsUnit', { total: format.integer(summary.tripCount) }),
      note: t('manager.kpi.tile.trips'),
    },
    {
      key: 'fill',
      label: t('manager.kpi.fill'),
      value: fill.averagePercent === null ? noValue : format.percent(fill.averagePercent),
      note: fill.averagePercent === null ? t('manager.kpi.tile.fillEmpty') : t('manager.kpi.tile.fill', { count: fill.planCount }),
      mock: fill.isMockResult,
    },
    {
      key: 'delivered',
      label: t('manager.kpi.delivered'),
      value: format.integer(Math.round(summary.deliveredWeightKg)),
      unit: t('manager.kpi.deliveredUnit'),
      note: t('manager.kpi.tile.delivered'),
    },
    {
      key: 'clean',
      label: t('manager.kpi.clean'),
      value: delivery.cleanPercent === null ? noValue : format.percent(delivery.cleanPercent),
      note:
        delivery.cleanPercent === null
          ? t('manager.kpi.tile.cleanEmpty')
          : t('manager.kpi.tile.clean', { clean: format.integer(delivery.cleanItems), total: format.integer(delivery.finishedItems) }),
    },
    {
      key: 'vehicles',
      label: t('manager.kpi.vehicles'),
      value: format.integer(vehicles.inUse),
      unit: t('manager.kpi.vehiclesUnit', { total: format.integer(vehicles.total) }),
      note: t('manager.kpi.tile.vehicles'),
    },
  ]
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <KpiTile key={tile.key} tile={tile} />
      ))}
    </View>
  )
}

function KpiTile({ tile }: { tile: Tile }) {
  const spoken = [`${tile.label}: ${tile.value}${tile.unit ? ` ${tile.unit}` : ''}`, tile.note, ...(tile.mock ? ['MOCK RESULT'] : [])].join(', ')
  return (
    <View accessible accessibilityLabel={spoken} style={styles.tile}>
      <AppText color={colors.text2}>{tile.label}</AppText>
      <View style={styles.value}>
        <AppText variant="title" style={styles.number}>
          {tile.value}
        </AppText>
        {tile.unit ? (
          <AppText color={colors.text2} style={styles.number}>
            {tile.unit}
          </AppText>
        ) : null}
      </View>
      {tile.mock ? <MockResultTag /> : null}
      <AppText color={colors.text3}>{tile.note}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  tile: {
    flexGrow: 1,
    flexBasis: 150,
    alignItems: 'flex-start',
    gap: space[1],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    ...shadow.card,
  },
  value: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: space[2] },
  number: { fontVariant: ['tabular-nums'] },
})
