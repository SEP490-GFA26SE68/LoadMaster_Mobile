import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { useFormat, useT } from '@/lib/i18n'
import { colors, palette, radius, space } from '@/theme/tokens'

import { cargoSummary } from '../trip-summary'
import type { FullTripDetail } from '../trips-model'

/**
 * "Tóm tắt hàng hoá" của Chi tiết chuyến (như `CargoSummaryCard` của web): tổng kiện, thể tích, khối lượng, rồi hai ô tải trọng và thể
 * tích sử dụng — phần trăm lớn, "đã dùng / sức chứa" của xe, thước đo. Vượt tải trọng thì số và thước đo đỏ kèm một dòng cảnh báo bằng
 * chữ. Mọi số tính từ kiện của chuyến và thông số xe. Chuyến đang giao hoặc đã giao thì thẻ nhường chỗ cho tiến độ giao (như web).
 */
export function CargoCard({ detail }: { detail: FullTripDetail }) {
  const t = useT()
  const format = useFormat()
  const { trip, vehicle } = detail
  const summary = useMemo(() => cargoSummary(trip.packages, vehicle), [trip.packages, vehicle])
  const capacityCm3 = vehicle.innerLengthCm * vehicle.innerWidthCm * vehicle.innerHeightCm
  const totals = [
    { key: 'instances', label: t('trips.instances'), value: format.integer(summary.instances) },
    { key: 'volume', label: t('trips.volume'), value: format.volumeM3(summary.volumeCm3) },
    { key: 'weight', label: t('trips.weight'), value: format.weight(summary.weightKg) },
  ]
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        {t('trips.cargoSummary')}
      </AppText>
      <View style={styles.totals}>
        {totals.map((item) => (
          <View key={item.key} accessible accessibilityLabel={`${item.label}: ${item.value}`} style={styles.total}>
            <AppText color={colors.text3}>{item.label}</AppText>
            <AppText variant="label" style={styles.number}>
              {item.value}
            </AppText>
          </View>
        ))}
      </View>
      <View style={styles.tiles}>
        <UsageTile
          label={t('trips.payloadUsage')}
          percent={summary.payloadPercent}
          of={t('trips.detail.ofTotal', { used: format.weight(summary.weightKg), total: format.weight(vehicle.maxPayloadKg) })}
          over={summary.overPayload}
        />
        <UsageTile
          label={t('trips.volumeUsage')}
          percent={summary.volumePercent}
          of={t('trips.detail.ofTotal', { used: format.volumeM3(summary.volumeCm3), total: format.volumeM3(capacityCm3) })}
          over={false}
        />
      </View>
      {summary.overPayload ? (
        <AppText variant="label" color={colors.danger}>
          {t('trips.overPayload')}
        </AppText>
      ) : null}
    </Card>
  )
}

function UsageTile({ label, percent, of, over }: { label: string; percent: number; of: string; over: boolean }) {
  const format = useFormat()
  const value = format.percent(percent)
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <View accessible accessibilityLabel={`${label}: ${value}, ${of}`} style={styles.tile}>
      <AppText color={colors.text3}>{label}</AppText>
      <AppText variant="title" color={over ? colors.danger : colors.text} style={styles.number}>
        {value}
      </AppText>
      <AppText color={colors.text3} style={styles.number}>
        {of}
      </AppText>
      <View style={styles.meter}>
        <View style={[styles.meterFill, { width: `${clamped}%`, backgroundColor: over ? palette.red[500] : palette.cyan[400] }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  totals: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[4], rowGap: space[2] },
  total: { flexGrow: 1, flexBasis: 88, gap: 2 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  tile: {
    flexGrow: 1,
    flexBasis: 140,
    gap: space[1],
    padding: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.surface,
  },
  meter: { height: 6, marginTop: space[1], overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.lineSoft },
  meterFill: { height: '100%', borderRadius: radius.pill },
  number: { fontVariant: ['tabular-nums'] },
})
