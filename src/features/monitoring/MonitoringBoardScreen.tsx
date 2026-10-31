import { useRouter } from 'expo-router'
import { QrCode } from 'lucide-react-native'
import { FlatList, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { useCan } from '@/features/auth/AuthProvider'
import { dataErrorMessage, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, space } from '@/theme/tokens'

import type { BoardTrip } from './monitoring-model'
import { useMonitoringBoardQuery } from './useMonitoringQueries'

export function monitoringTripPath(tripId: string) {
  return { pathname: '/monitoring/[tripId]', params: { tripId } } as const
}

export function MonitoringBoardScreen() {
  const t = useT()
  const can = useCan()
  const router = useRouter()
  const query = useMonitoringBoardQuery()

  return (
    <Screen
      title={t('monitoring.board.title')}
      actions={
        can('packages.lookup') ? (
          <IconButton icon={QrCode} tone="sky" label={t('warehouse.tasks.scan')} onPress={() => router.push('/scan')} />
        ) : undefined
      }>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={[...query.data]}
          keyExtractor={(trip) => trip.tripId}
          renderItem={({ item }) => <BoardCard trip={item} />}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={styles.list}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListEmptyComponent={<EmptyState title={t('monitoring.board.empty.title')} description={t('monitoring.board.empty.description')} />}
        />
      )}
    </Screen>
  )
}

function BoardCard({ trip }: { trip: BoardTrip }) {
  const t = useT()
  const router = useRouter()
  const location =
    trip.location === null
      ? t('monitoring.board.noLocation')
      : t('monitoring.board.location', { lat: trip.location.lat.toFixed(4), lng: trip.location.lng.toFixed(4) })

  return (
    <Card>
      <AppText variant="label" style={styles.code}>
        {trip.tripId}
      </AppText>
      <AppText variant="heading">{trip.name}</AppText>
      {trip.vehicleName === '' ? null : <AppText color={colors.text3}>{trip.vehicleName}</AppText>}
      {trip.driverName === '' ? null : <AppText color={colors.text2}>{trip.driverName}</AppText>}
      <AppText color={colors.text2}>{location}</AppText>
      {trip.exceptionCount > 0 ? <AppText variant="label">{t('monitoring.board.exceptions', { count: trip.exceptionCount })}</AppText> : null}
      <Button
        variant="secondary"
        accessibilityLabel={t('monitoring.board.openLabel', { tripId: trip.tripId })}
        onPress={() => router.push(monitoringTripPath(trip.tripId))}>
        {t('monitoring.board.open')}
      </Button>
    </Card>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', padding: space[4], paddingBottom: space[8] },
  code: { fontVariant: ['tabular-nums'] },
  separator: { height: space[3] },
})
