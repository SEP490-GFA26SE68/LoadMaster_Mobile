import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import type { DriverTripRow } from './driver-model'
import { TripCard } from './TripCard'
import { useMyTripsQuery } from './useDriverQueries'

/** Màn Lịch sử giao hàng của tài xế: hiển thị toàn bộ các chuyến đã giao (DELIVERED), mới nhất trước. */
export function DriverTripHistoryScreen() {
  const t = useT()
  const router = useRouter()
  const query = useMyTripsQuery()

  const back = () => (router.canGoBack() ? router.back() : router.replace('/trips'))
  const history = query.data?.history ?? query.data?.groups.recent ?? []

  return (
    <Screen
      title={t('driver.myTrips.history.title')}
      leading={<IconButton icon={ArrowLeft} tone="sky" label={t('common.back')} onPress={back} />}
      below={
        query.data !== undefined ? (
          <AppText color={colors.skyText2}>{t('driver.myTrips.history.count', { count: history.length })}</AppText>
        ) : undefined
      }>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList<DriverTripRow>
          data={history}
          keyExtractor={(trip) => trip.id}
          renderItem={({ item }) => <TripCard trip={item} />}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              title={t('driver.myTrips.history.emptyTitle')}
              description={t('driver.myTrips.history.emptyDescription')}
            />
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
  list: {
    flexGrow: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    padding: space[4],
    paddingBottom: space[8],
  },
  separator: {
    height: space[3],
  },
})
