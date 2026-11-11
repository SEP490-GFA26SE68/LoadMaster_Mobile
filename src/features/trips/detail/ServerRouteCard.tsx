import { Clock, Navigation, Warehouse, type LucideIcon } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { StopDot } from '@/components/StopDot'
import { useFormat, useT } from '@/lib/i18n'
import { colors, palette, radius, space, type BadgeTone } from '@/theme/tokens'

import type { ServerTripDetail, ServerTripStop } from '../trips-model'

/** Trạng thái điểm của máy chủ bằng chữ kèm màu: chưa đến xám, xe đang ở điểm xanh lam (đang chạy), đã giao xong xanh lá. */
const STATUS_TONE: Readonly<Record<ServerTripStop['status'], BadgeTone>> = { PENDING: 'neutral', ARRIVED: 'azure', COMPLETED: 'success' }

/**
 * Điểm giao của chuyến đọc từ máy chủ (thẻ "Điểm giao" của `BackendTripDetailPage` web, xếp dọc cho điện thoại): kho xuất phát rồi các điểm
 * theo thứ tự đi — số điểm trên màu định danh, tên, địa chỉ, trạng thái bằng chữ, giờ đến kế hoạch và giờ xe đã đến, hạn giao. Giờ đến là
 * của máy chủ, không mang MOCK RESULT. Máy chủ không trả kiện của từng điểm nên không có số kiện, khối lượng. Chỉ đọc.
 */
export function ServerRouteCard({ detail }: { detail: ServerTripDetail }) {
  const t = useT()
  const { stops, depot } = detail
  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="heading" accessibilityRole="header">
          {t('trips.backend.stops')}
        </AppText>
        <AppText color={colors.text3}>{t('trips.backend.stopCount', { count: stops.length })}</AppText>
      </View>
      {stops.length === 0 ? <AppText color={colors.text3}>{t('trips.backend.noStops')}</AppText> : null}
      <View accessibilityLabel={t('trips.backend.stopsLabel')} style={styles.list}>
        {depot === null ? null : (
          <View accessible accessibilityLabel={[t('trips.backend.origin'), depot.name, depot.address].filter(Boolean).join(', ')} style={styles.row}>
            <View style={styles.depotMark}>
              <Warehouse color={colors.text2} size={18} strokeWidth={1.5} />
            </View>
            <View style={styles.body}>
              <AppText variant="label">{t('trips.backend.origin')}</AppText>
              {depot.name ? <AppText color={colors.text2}>{depot.name}</AppText> : null}
              {depot.address ? <AppText color={colors.text3}>{depot.address}</AppText> : null}
            </View>
          </View>
        )}
        {stops.map((stop) => (
          <StopRow key={stop.id} stop={stop} total={stops.length} />
        ))}
      </View>
    </Card>
  )
}

function StopRow({ stop, total }: { stop: ServerTripStop; total: number }) {
  const t = useT()
  const format = useFormat()
  const at = (iso: string) => ({ time: format.time(iso), date: format.dayMonth(iso) })
  const status = t(`trips.backend.stopStatuses.${stop.status}`)
  const times: { key: string; icon: LucideIcon; text: string }[] = [
    ...(stop.actualArrival === undefined ? [] : [{ key: 'actual', icon: Navigation, text: t('officeServer.trips.actualArrival', at(stop.actualArrival)) }]),
    ...(stop.plannedArrival === undefined ? [] : [{ key: 'planned', icon: Navigation, text: t('officeServer.trips.plannedArrival', at(stop.plannedArrival)) }]),
    ...(stop.deadline === undefined ? [] : [{ key: 'deadline', icon: Clock, text: t('trips.route.deadline', at(stop.deadline)) }]),
  ]
  const spoken = [
    t('officeServer.trips.stop', { number: stop.number, total, name: stop.name }),
    ...(stop.kind === 'PICKUP' ? [t('trips.route.pickupTag')] : []),
    ...(stop.address && stop.address !== stop.name ? [stop.address] : []),
    status,
    ...times.map((item) => item.text),
  ].join(', ')
  return (
    <View accessible accessibilityLabel={spoken} style={styles.row}>
      <StopDot number={stop.number} />
      <View style={styles.body}>
        <AppText variant="label">{stop.name}</AppText>
        {stop.kind === 'PICKUP' ? <Chip tone="azure" label={t('trips.route.pickupTag')} /> : null}
        {stop.address && stop.address !== stop.name ? <AppText color={colors.text3}>{stop.address}</AppText> : null}
        <View style={styles.line}>
          <Chip tone={STATUS_TONE[stop.status]} label={status} />
        </View>
        {times.map(({ key, icon: Icon, text }) => (
          <View key={key} style={styles.line}>
            <Icon color={colors.text3} size={16} strokeWidth={1.75} />
            <AppText color={colors.text2} style={styles.number}>
              {text}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { gap: space[1] },
  list: { gap: space[4] },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  body: { flex: 1, gap: space[1] },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[2], rowGap: space[1] },
  number: { fontVariant: ['tabular-nums'] },
  depotMark: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: palette.neutral[50],
  },
})
