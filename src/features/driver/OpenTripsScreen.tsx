import { useRouter } from 'expo-router'
import { Calendar, Info, MapPin, Send, Warehouse, X } from 'lucide-react-native'
import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, space } from '@/theme/tokens'

import { CardActionMenu, type CardMenuItem } from './CardActionMenu'
import type { OpenTrip } from './driver-model'
import { driverTripDetailPath } from './TripCard'
import { useCancelClaimMutation, useClaimTripMutation, useOpenTripsQuery } from './useDriverQueries'

/**
 * Tab "Chuyến đang mở": chuyến của công ty chưa có tài xế. Thẻ giống thẻ ở "Chuyến của tôi": nút "..." ở góc có "Xem chi tiết" và việc
 * xin nhận chuyến ("Xin nhận chuyến", hoặc "Rút phiếu" khi phiếu đang chờ). Phiếu đang chờ / bị từ chối hiện thành chip ngay trên thẻ.
 * Phiếu bị từ chối thì chỉ xem lý do, không xin lại.
 */
export function OpenTripsScreen() {
  const t = useT()
  const format = useFormat()
  const router = useRouter()
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

  const menuItemsOf = (item: OpenTrip, isBusy: boolean): CardMenuItem[] => {
    const items: CardMenuItem[] = [
      {
        key: 'detail',
        label: t('driver.myTrips.viewDetail'),
        icon: Info,
        onPress: () => router.push(driverTripDetailPath(item.id)),
      },
    ]
    if (item.myClaimStatus === 'PENDING') {
      items.push({
        key: 'cancel',
        label: t('openTrips.actions.cancel'),
        icon: X,
        iconColor: colors.text2,
        write: true,
        disabled: isBusy,
        onPress: () => void handleCancel(item.id),
      })
    } else if (item.myClaimStatus !== 'REJECTED') {
      // Chưa xin, hoặc đã rút phiếu (CANCELLED): xin được. Phiếu bị từ chối thì không xin lại.
      items.push({
        key: 'claim',
        label: t('openTrips.actions.claim'),
        icon: Send,
        write: true,
        disabled: isBusy,
        onPress: () => void handleClaim(item.id),
      })
    }
    return items
  }

  const renderItem = ({ item }: { item: OpenTrip }) => {
    const isBusy = busyTripId === item.id
    const departure = item.departureTime
      ? `${format.time(item.departureTime)} · ${format.date(item.departureTime)}`
      : t('openTrips.departureNotSet')

    return (
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headLeft}>
            <AppText variant="label" style={styles.code}>
              {item.tripCode}
            </AppText>
            {item.myClaimStatus === 'PENDING' ? <Chip tone="warning" label={t('openTrips.status.pending')} /> : null}
            {item.myClaimStatus === 'REJECTED' ? <Chip tone="danger" label={t('openTrips.status.rejected')} /> : null}
          </View>
          <CardActionMenu items={menuItemsOf(item, isBusy)} />
        </View>

        {item.tripName.trim() === '' ? null : (
          <AppText variant="heading" accessibilityRole="header">
            {item.tripName}
          </AppText>
        )}

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

        {item.myClaimStatus === 'REJECTED' && item.myRejectReason ? (
          <AppText color={colors.text2}>{t('openTrips.rejectReason', { reason: item.myRejectReason })}</AppText>
        ) : null}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', columnGap: space[3] },
  headLeft: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  code: { fontVariant: ['tabular-nums'], color: colors.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  bannerWrap: { marginBottom: space[3] },
  separator: { height: space[2] },
})
