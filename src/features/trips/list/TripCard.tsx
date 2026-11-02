import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { TripStatusChip, TripSubStatusTag } from '@/components/TripStatus'
import { calendarDate } from '@/lib/calendar-date'
import { useFormat, useT, type TFunction } from '@/lib/i18n'
import { colors, radius, shadow, space } from '@/theme/tokens'
import type { TripSubStatus } from '@/types/trip'

import type { TripRow } from '../trip-list'
import { tripDetailPath } from '../trip-routes'

/** Chữ của dòng phụ, như `TripSubStatusTag` vẽ — để ghép vào tên đọc của thẻ. */
function subLabel(sub: TripSubStatus, t: TFunction): string {
  if (sub.kind === 'staging' || sub.kind === 'loading') return t(`status.sub.${sub.kind}`, { recorded: sub.recorded, total: sub.total })
  if (sub.kind === 'manualPending') return t('status.sub.manualPending', { count: sub.count })
  return t(`status.sub.${sub.kind}`)
}

/**
 * Một chuyến ở tab Chuyến hàng (một dòng của bảng chuyến trên web), cỡ điện thoại: mã chuyến cùng chip trạng thái và các dòng phụ
 * (phương án / tiến độ kho, điểm trễ hạn hoặc xác nhận tay chờ duyệt) xuống hàng khi hết chỗ; tên chuyến là tiêu đề; số điểm và các
 * điểm theo thứ tự đi; ngày chạy và số kiện; xe và tài xế ở dòng riêng để biển số, tên không bị ngắt. Cả thẻ là một nút mở chi
 * tiết chuyến; tên đọc của nút gồm đủ các ý trên.
 */
export function TripCard({ row }: { row: TripRow }) {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
  const subs = [row.sub, row.extraSub].filter((sub): sub is TripSubStatus => sub !== null)
  const route = row.stopCount === 0 ? null : t('trips.list.routeLine', { stops: t('trips.list.stopsShort', { count: row.stopCount }), route: row.route })
  const date = format.date(calendarDate(row.scheduledDate))
  const packages = format.integer(row.packageCount)
  // Xe không còn trong kho thì là mã xe, như bản web
  const vehicle = row.vehicleName === '' ? row.vehicleId : row.vehicleName
  const fact = (label: string, value: string) => t('trips.list.chip', { label, value })
  const spoken = [
    row.id,
    row.name,
    t(`status.${row.status}`),
    ...subs.map((sub) => subLabel(sub, t)),
    ...(route === null ? [] : [route]),
    fact(t('trips.list.date'), date),
    fact(t('trips.list.packages'), packages),
    fact(t('trips.list.vehicle'), vehicle),
    row.driverName === null ? t('trips.list.unassignedDriver') : fact(t('trips.list.driver'), row.driverName),
  ].join(', ')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={t('companyTrips.list.openHint')}
      onPress={() => router.push(tripDetailPath(row.id))}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.body}>
        <View style={styles.head}>
          <AppText variant="label" style={styles.code}>
            {row.id}
          </AppText>
          <TripStatusChip status={row.status} />
          {subs.map((sub) => (
            <TripSubStatusTag key={sub.kind} sub={sub} />
          ))}
        </View>
        <AppText variant="heading">{row.name}</AppText>
        {route === null ? null : (
          <AppText color={colors.text2} numberOfLines={2}>
            {route}
          </AppText>
        )}
        <View style={styles.facts}>
          <Fact label={t('trips.list.date')}>{date}</Fact>
          <Fact label={t('trips.list.packages')} code>
            {packages}
          </Fact>
          <Fact label={t('trips.list.vehicle')} wide>
            {vehicle}
          </Fact>
          <Fact label={t('trips.list.driver')} wide>
            {row.driverName ?? t('trips.list.unassigned')}
          </Fact>
        </View>
      </View>
      <ChevronRight color={colors.text3} size={20} strokeWidth={1.5} />
    </Pressable>
  )
}

/** Một thông tin của chuyến: nhãn trên, giá trị dưới. `wide` chiếm cả hàng (tên xe kèm biển số, tên tài xế). */
function Fact({ label, code = false, wide = false, children }: { label: string; code?: boolean; wide?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.fact, wide && styles.wide]}>
      <AppText color={colors.text3}>{label}</AppText>
      <AppText variant="label" style={code ? styles.code : undefined}>
        {children}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    ...shadow.card,
  },
  pressed: { backgroundColor: colors.surface, borderColor: colors.lineStrong },
  body: { flex: 1, gap: space[3] },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[3], rowGap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[4], rowGap: space[3] },
  fact: { flexGrow: 1, flexBasis: '40%', minWidth: 0 },
  wide: { flexBasis: '100%' },
})
