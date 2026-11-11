import { CircleCheck, CircleOff, Truck, Wrench, type LucideIcon } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { useFormat, useT } from '@/lib/i18n'
import type { VehicleStatus } from '@/lib/mock-db'
import { badgeTones, colors, radius, space, type BadgeTone } from '@/theme/tokens'

import type { DashboardSummary } from '../dashboard-summary'

const STATUSES: readonly VehicleStatus[] = ['available', 'in_use', 'maintenance']

/** Icon và nền nhạt theo nghĩa, như thẻ đội xe của web: sẵn sàng → xanh lá, vận hành → cyan, cần chú ý → hổ phách. Chữ luôn đi kèm. */
const GLYPH: Readonly<Record<VehicleStatus, { icon: LucideIcon; tone: BadgeTone }>> = {
  available: { icon: CircleCheck, tone: 'success' },
  in_use: { icon: Truck, tone: 'cyan' },
  maintenance: { icon: Wrench, tone: 'warning' },
}

/**
 * "Trạng thái đội xe" (như `FleetStatusCard` của web): số xe đang phục vụ chuyến trên tổng, rồi ba trạng thái. Đếm trên cả đội lúc đọc
 * kho, không theo kỳ — thẻ nói rõ điều đó. Mobile chưa có màn Đội xe nên thẻ không có lối sang đó. Máy chủ đếm thêm xe Ngừng sử dụng:
 * thẻ thêm dòng đó (xám) chỉ khi nguồn có số.
 */
export function FleetCard({ vehicles }: { vehicles: DashboardSummary['vehicles'] }) {
  const t = useT()
  const format = useFormat()
  const inUse = format.integer(vehicles.inUse)
  const ratio = t('manager.fleet.ratio', { total: format.integer(vehicles.total) })
  const { retired } = vehicles.byStatus
  const rows = [
    ...STATUSES.map((status) => ({ key: status, ...GLYPH[status], count: vehicles.byStatus[status], label: t(`overview.fleetStatus.${status}`) })),
    ...(retired === undefined ? [] : [{ key: 'retired', icon: CircleOff, tone: 'neutral' as const, count: retired, label: t('officeServer.overview.retired') }]),
  ]
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        {t('manager.fleet.title')}
      </AppText>
      <View accessible accessibilityLabel={`${inUse} ${ratio}`} style={styles.ratio}>
        <AppText variant="title" style={styles.number}>
          {inUse}
        </AppText>
        <AppText color={colors.text2}>{ratio}</AppText>
      </View>
      {rows.map(({ key, icon: Icon, tone, label, ...row }) => {
        const count = format.integer(row.count)
        return (
          <View key={key} accessible accessibilityLabel={`${label}: ${count}`} style={styles.row}>
            <View style={[styles.glyph, { backgroundColor: badgeTones[tone].bg }]}>
              <Icon color={badgeTones[tone].fg} size={16} strokeWidth={1.5} />
            </View>
            <AppText variant="label" style={[styles.count, styles.number]}>
              {count}
            </AppText>
            <AppText color={colors.text2}>{label}</AppText>
          </View>
        )
      })}
      <AppText color={colors.text3}>{t('manager.fleet.note')}</AppText>
    </Card>
  )
}

const styles = StyleSheet.create({
  ratio: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  glyph: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  count: { minWidth: 24 },
  number: { fontVariant: ['tabular-nums'] },
})
