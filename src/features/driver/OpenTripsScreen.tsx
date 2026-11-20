import { Calendar, MapPin, Warehouse } from 'lucide-react-native'
import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, space, TOUCH } from '@/theme/tokens'

import type { OpenTrip } from './driver-model'
import { useCancelClaimMutation, useClaimTripMutation, useOpenTripsQuery } from './useDriverQueries'

export function OpenTripsScreen() {
  const t = useT()
  const format = useFormat()
  const query = useOpenTripsQuery()
  const claimMutation = useClaimTripMutation()
  const cancelMutation = useCancelClaimMutation()

  const [actionError, setActionError] = useState<string | null>(null)
  const [busyTripId, setBusyTripId] = useState<string | null>(null)

  const handleClaim = async (tripId: string) => {
    setActionError(null)
    setBusyTripId(tripId)
    try {
      await claimMutation.mutateAsync({ tripId })
    } catch (err) {
      setActionError(dataErrorMessage(err, t))
      void query.refetch()
    } finally {
      setBusyTripId(null)
    }
  }

  const handleCancel = async (tripId: string) => {
    setActionError(null)
    setBusyTripId(tripId)
    try {
      await cancelMutation.mutateAsync(tripId)
    } catch (err) {
      setActionError(dataErrorMessage(err, t))
      void query.refetch()
    } finally {
      setBusyTripId(null)
    }
  }

  const renderItem = ({ item }: { item: OpenTrip }) => {
    const isBusy = busyTripId === item.id
    const departure = item.departureTime
      ? `${format.time(item.departureTime)} · ${format.date(item.departureTime)}`
      : t('openTrips.departureNotSet')

    return (
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleCol}>
            <AppText variant="heading" accessibilityRole="header">
              {item.tripName}
            </AppText>
            <AppText variant="label" color={colors.primary}>
              {item.tripCode}
            </AppText>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Calendar color={colors.text2} size={16} strokeWidth={1.5} />
          <AppText color={colors.text2}>{t('openTrips.departureTime', { time: departure })}</AppText>
        </View>

        <View style={styles.metaRow}>
          <Warehouse color={colors.text2} size={16} strokeWidth={1.5} />
          <AppText color={colors.text2}>{t('openTrips.originWarehouse', { warehouse: item.originWarehouse })}</AppText>
        </View>

        <View style={styles.metaRow}>
          <MapPin color={colors.text2} size={16} strokeWidth={1.5} />
          <AppText color={colors.text2}>{t('openTrips.stopCount', { count: item.stopCount })}</AppText>
        </View>

        <View style={styles.footerRow}>
          {item.myClaimStatus !== 'PENDING' && item.myClaimStatus !== 'REJECTED' ? (
            <Button
              write
              variant="primary"
              loading={isBusy}
              disabled={isBusy}
              onPress={() => void handleClaim(item.id)}>
              {t('openTrips.actions.claim')}
            </Button>
          ) : item.myClaimStatus === 'PENDING' ? (
            <View style={styles.pendingRow}>
              <Chip tone="warning" label={t('openTrips.status.pending')} />
              <Button
                write
                variant="secondary"
                loading={isBusy}
                disabled={isBusy}
                onPress={() => void handleCancel(item.id)}
                style={styles.cancelBtn}>
                {t('openTrips.actions.cancel')}
              </Button>
            </View>
          ) : item.myClaimStatus === 'REJECTED' ? (
            <View style={styles.rejectedCol}>
              <Chip tone="danger" label={t('openTrips.status.rejected')} />
              {item.myRejectReason ? (
                <AppText color={colors.text2} style={styles.rejectReasonText}>
                  {t('openTrips.rejectReason', { reason: item.myRejectReason })}
                </AppText>
              ) : null}
            </View>
          ) : null}
        </View>
      </Card>
    )
  }

  return (
    <Screen title={t('openTrips.title')}>
      {query.isPending ? (
        <LoadingState label={t('openTrips.loading')} />
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList<OpenTrip>
          data={query.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            actionError ? (
              <View style={styles.bannerWrap}>
                <Banner tone="danger" onDismiss={() => setActionError(null)}>
                  {actionError}
                </Banner>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title={t('openTrips.empty.title')}
              description={t('openTrips.empty.description')}
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
  list: { padding: space[4], gap: space[3] },
  card: { gap: space[3], padding: space[4] },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleCol: { flex: 1, gap: space[1] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  footerRow: { marginTop: space[2] },
  pendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  cancelBtn: { minHeight: TOUCH },
  rejectedCol: { gap: space[2], alignItems: 'flex-start' },
  rejectReasonText: { marginTop: space[1] },
  bannerWrap: { marginBottom: space[3] },
  separator: { height: space[2] },
})
