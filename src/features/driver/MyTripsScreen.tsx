import { RefreshControl, SectionList, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import { MY_TRIP_GROUPS, type MyTripRow } from './my-trips'
import { TripCard } from './TripCard'
import { useMyTripsQuery } from './useDriverQueries'

/** Màn chính của tài xế: chuyến gán cho mình, nhóm theo trạng thái. Kéo xuống để đọc lại. */
export function MyTripsScreen() {
  const t = useT()
  const query = useMyTripsQuery()

  const sections =
    query.data === undefined
      ? []
      : MY_TRIP_GROUPS.map((group) => ({ group, title: t(`driver.myTrips.groups.${group}`), data: [...query.data[group]] })).filter(
          (section) => section.data.length > 0,
        )

  return (
    <Screen title={t('driver.myTrips.title')}>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : (
        <SectionList<MyTripRow, (typeof sections)[number]>
          sections={sections}
          keyExtractor={(trip) => trip.id}
          renderItem={({ item }) => <TripCard trip={item} />}
          renderSectionHeader={({ section }) => (
            <AppText variant="label" color={colors.text2} accessibilityRole="header" style={styles.sectionTitle}>
              {section.title}
            </AppText>
          )}
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
  sectionTitle: { marginTop: space[4], marginBottom: space[2] },
  separator: { height: space[3] },
})
