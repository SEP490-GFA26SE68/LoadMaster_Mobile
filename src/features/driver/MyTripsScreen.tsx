import { RefreshControl, SectionList, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import type { DriverTripRow } from './driver-model'
import { MY_TRIP_GROUPS } from './my-trips'
import { NotificationBell } from './NotificationBell'
import { TripCard } from './TripCard'
import { useMyTripsQuery } from './useDriverQueries'

/**
 * Màn chính của tài xế (như `MyTripsPage` của web): chuyến gán cho mình chia nhóm theo trạng thái — Đang vận chuyển · Xếp xong — chờ xuất
 * phát · Kho đang soạn / xếp (chỉ xem trước) · Đã giao gần đây. Một nút chính: chuyến nên làm trước — đang giao dở, không thì chuyến đã xếp
 * xong sớm nhất. Kéo xuống để đọc lại; chuyến đang chạy tự đọc lại theo nhịp nguồn trả.
 */
export function MyTripsScreen() {
  const t = useT()
  const format = useFormat()
  const query = useMyTripsQuery()

  const groups = query.data?.groups
  const sections =
    groups === undefined
      ? []
      : MY_TRIP_GROUPS.map((group) => ({ group, title: t(`driver.myTrips.groups.${group}`), data: [...groups[group]] })).filter(
          (section) => section.data.length > 0,
        )
  const primaryId = groups === undefined ? undefined : (groups.inTransit[0] ?? groups.loaded[0])?.id

  return (
    <Screen
      title={t('driver.myTrips.title')}
      actions={<NotificationBell />}
      below={<AppText color={colors.skyText2}>{format.date(new Date())}</AppText>}>
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
          ListEmptyComponent={<EmptyState title={t('driver.myTrips.empty.title')} description={t('driver.myTrips.empty.description')} />}
        />
      )}
    </Screen>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8] },
  sectionTitle: { marginTop: space[4], marginBottom: space[3] },
  separator: { height: space[3] },
})
