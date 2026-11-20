import { useRouter } from 'expo-router'
import { History } from 'lucide-react-native'
import { Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { NotificationBell } from '@/features/bell/NotificationBell'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, radius, space } from '@/theme/tokens'

import type { DriverTripRow } from './driver-model'
import type { MyTripGroup } from './my-trips'
import { TripCard } from './TripCard'
import { useDriverCapabilities, useMyTripsQuery } from './useDriverQueries'

/** Chỉ hiển thị các nhóm chuyến đang hoạt động / sắp chạy; lịch sử đã giao chuyển sang màn Lịch sử giao hàng riêng. */
const ACTIVE_TRIP_GROUPS: readonly MyTripGroup[] = ['inTransit', 'loaded', 'preparing', 'upcoming']

/**
 * Màn chính của tài xế: chuyến đang vận chuyển · xếp xong — chờ xuất phát · kho đang soạn / xếp · chuyến sắp tới.
 * Chuyến đã giao được tách sang màn Lịch sử giao hàng (`/driver-history`) qua nút "Lịch sử giao" trên đầu màn.
 */
export function MyTripsScreen() {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
  const capabilities = useDriverCapabilities()
  const query = useMyTripsQuery()

  const groups = query.data?.groups
  const historyCount = (query.data?.history ?? groups?.recent ?? []).length
  const sections =
    groups === undefined
      ? []
      : ACTIVE_TRIP_GROUPS.map((group) => ({ group, title: t(`driver.myTrips.groups.${group}`), data: [...groups[group]] })).filter(
          (section) => section.data.length > 0,
        )
  const primaryId = groups === undefined ? undefined : (groups.inTransit[0] ?? groups.loaded[0])?.id

  const openHistory = () => router.push('/driver-history')

  return (
    <Screen
      title={t('driver.myTrips.title')}
      actions={<NotificationBell />}
      below={
        <View style={styles.headerBelow}>
          <View style={styles.belowRow}>
            <AppText color={colors.skyText2}>{format.date(new Date())}</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('driver.myTrips.history.button')}
              onPress={openHistory}
              style={({ pressed }) => [styles.historyPill, pressed && styles.historyPillPressed]}>
              <History color={colors.skyText} size={16} strokeWidth={1.75} />
              <AppText variant="meta" color={colors.skyText}>
                {t('driver.myTrips.history.button')}
                {historyCount > 0 ? ` (${historyCount})` : ''}
              </AppText>
            </Pressable>
          </View>
          {capabilities.payroll ? (
            <Button variant="secondary" onPress={() => router.push('/driver-payroll')}>
              {t('driver.payroll.open')}
            </Button>
          ) : null}
        </View>
      }>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : (
        <SectionList<DriverTripRow, (typeof sections)[number]>
          sections={sections}
          keyExtractor={(trip) => trip.id}
          renderItem={({ item }) => <TripCard trip={item} primary={item.id === primaryId} />}
          renderSectionHeader={({ section }) => (
            <AppText variant="heading" accessibilityRole="header" style={styles.sectionTitle}>
              {section.title}
            </AppText>
          )}
          ListHeaderComponent={
            sections.length > 0 && primaryId === undefined ? <AppText color={colors.text2}>{t('driver.myTrips.noReady')}</AppText> : null
          }
          ItemSeparatorComponent={Separator}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState title={t('driver.myTrips.empty.title')} description={t('driver.myTrips.empty.description')} />
              {historyCount > 0 ? (
                <Button icon={History} variant="secondary" onPress={openHistory} style={styles.emptyHistoryBtn}>
                  {t('driver.myTrips.history.button')} ({historyCount})
                </Button>
              ) : null}
            </View>
          }
        />
      )}
    </Screen>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  belowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space[2],
  },
  historyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    backgroundColor: colors.skySolid,
    borderWidth: 1,
    borderColor: colors.skySolidBorder,
  },
  historyPillPressed: {
    backgroundColor: colors.skySolidPressed,
  },
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8] },
  sectionTitle: { marginTop: space[4], marginBottom: space[3] },
  headerBelow: { gap: space[2] },
  separator: { height: space[3] },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[2] },
  emptyHistoryBtn: { marginBottom: space[6] },
})
