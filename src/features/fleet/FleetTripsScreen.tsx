import { useRouter } from 'expo-router'
import { FlatList, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { TripStatusChip } from '@/components/TripStatus'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import type { FleetTrip } from './fleet-model'
import { useFleetTripsQuery } from './useFleetQueries'

export function monitoringPath(tripId: string) {
  return { pathname: '/monitoring/[tripId]', params: { tripId } } as const
}

export function FleetTripsScreen() {
  const t = useT()
  const query = useFleetTripsQuery()

  return (
    <Screen title={t('fleet.title')}>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={[...query.data]}
          keyExtractor={(trip) => trip.id}
          renderItem={({ item }) => <FleetCard trip={item} />}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={styles.list}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListEmptyComponent={<EmptyState title={t('fleet.empty.title')} description={t('fleet.empty.description')} />}
        />
      )}
    </Screen>
  )
}

function FleetCard({ trip }: { trip: FleetTrip }) {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
  const live = trip.status === 'IN_TRANSIT'

  return (
    <Card>
      <View style={styles.head}>
        <AppText variant="label" style={styles.code}>
          {trip.code}
        </AppText>
        <TripStatusChip status={trip.status} />
      </View>
      {trip.name === undefined ? null : <AppText variant="heading">{trip.name}</AppText>}
      {trip.vehicleName === '' ? null : <AppText color={colors.text3}>{trip.vehicleName}</AppText>}
      <AppText color={colors.text2}>{trip.driverName === undefined ? t('fleet.noDriver') : t('fleet.driver', { name: trip.driverName })}</AppText>
      {trip.departureAt === undefined ? null : <AppText color={colors.text2}>{format.date(trip.departureAt)}</AppText>}
      {live ? (
        <Button
          variant="secondary"
          accessibilityLabel={t('fleet.openLabel', { tripId: trip.code })}
          onPress={() => router.push(monitoringPath(trip.id))}>
          {t('fleet.monitor')}
        </Button>
      ) : null}
    </Card>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8] },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[3], rowGap: space[2] },
  code: { fontVariant: ['tabular-nums'] },
  separator: { height: space[3] },
})
