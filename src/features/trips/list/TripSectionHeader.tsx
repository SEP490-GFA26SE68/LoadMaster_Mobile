import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Chip } from '@/components/Chip'
import { calendarDate } from '@/lib/calendar-date'
import { useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { runDateHint } from '../trip-dates'

/**
 * Tiêu đề một nhóm của tab Chuyến hàng (dòng nhóm của bảng chuyến trên web): "Thứ Hai, 14/09" kèm số chuyến của ngày, nhãn "Hôm nay"
 * hoặc "Ngày mai". Ngày khác năm nay thì in cả năm để không nhầm. Cả dòng là một header, tên đọc gồm đủ ngày, nhãn và số chuyến.
 */
export function TripSectionHeader({ date, count, today }: { date: string; count: number; today: string }) {
  const t = useT()
  const format = useFormat()
  // Nhóm cuối của nguồn máy chủ: chuyến chưa có giờ xuất phát nên chưa có ngày chạy
  if (date === '') return <Header tag={null} dayText={t('officeServer.trips.noDeparture')} countText={t('trips.list.group.count', { count })} />
  const day = calendarDate(date)
  const shown = date.slice(0, 4) === today.slice(0, 4) ? format.dayMonth(day) : format.date(day)
  const hint = runDateHint(date, today)
  const dayText = hint === null ? shown : t('trips.list.group.day', { weekday: t(`trips.list.weekdays.${hint.weekday}`), date: shown })
  // Như web: chỉ hôm nay và ngày mai có nhãn, hôm qua thì không
  const tag = hint?.relative === 'today' ? t('trips.list.group.today') : hint?.relative === 'tomorrow' ? t('trips.list.group.tomorrow') : null
  return <Header tag={tag} dayText={dayText} countText={t('trips.list.group.count', { count })} />
}

function Header({ tag, dayText, countText }: { tag: string | null; dayText: string; countText: string }) {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={[tag, dayText, countText].filter((part): part is string => part !== null).join(', ')}
      style={styles.header}>
      {tag === null ? null : <Chip tone="cyan" label={tag} />}
      <AppText variant="heading">{dayText}</AppText>
      <AppText color={colors.text3}>{countText}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[2], rowGap: space[1], marginTop: space[4], marginBottom: space[3] },
})
