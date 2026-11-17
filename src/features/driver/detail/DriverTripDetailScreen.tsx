import { useRouter } from 'expo-router'
import { ArrowLeft, Clock, MapPin, Navigation, Package, Phone, Truck, User as UserIcon, Warehouse } from 'lucide-react-native'
import { Linking, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { ErrorState, LoadingState } from '@/components/StateView'
import { StopDot } from '@/components/StopDot'
import { TripStatusChip } from '@/components/TripStatus'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, radius, space } from '@/theme/tokens'

import type { DriverTripDetail, DriverTripDetailStop } from '../driver-model'
import { RouteMap } from '../RouteMap'
import { tripPath } from '../TripCard'
import { useDriverTripDetailQuery } from '../useDriverQueries'

/**
 * Màn hình Chi tiết Chuyến đi dành riêng cho Tài xế:
 * Xem thông tin kho xuất phát, xe, bản đồ tuyến, toàn bộ các điểm dừng với thông tin người nhận,
 * nút gọi điện 1 chạm và danh sách các kiện hàng.
 */
export function DriverTripDetailScreen({ tripId }: { readonly tripId: string }) {
  const t = useT()
  const router = useRouter()
  const query = useDriverTripDetailQuery(tripId)

  const back = () => (router.canGoBack() ? router.back() : router.replace('/trips'))
  const data = query.data

  return (
    <Screen
      title={data?.code ?? t('driver.detail.title')}
      leading={<IconButton icon={ArrowLeft} tone="sky" label={t('common.back')} onPress={back} />}
      below={data ? <TripDetailSummaryBand detail={data} /> : undefined}
      scroll={data !== undefined}
      refresh={data !== undefined ? { refreshing: query.isRefetching, onRefresh: () => void query.refetch() } : undefined}
      footer={data ? <TripDetailFooter detail={data} /> : undefined}>
      {data ? (
        <View style={styles.content}>
          {data.dispatcher ? <DispatcherCard dispatcher={data.dispatcher} /> : null}
          <DepotAndVehicleCard detail={data} />
          <TripRouteMapSection detail={data} />
          <StopsTimelineSection stops={data.stops} />
        </View>
      ) : query.isError ? (
        <ErrorState message={dataErrorMessage(query.error, t)} onRetry={() => void query.refetch()} />
      ) : (
        <LoadingState label={t('driver.detail.loading')} />
      )}
    </Screen>
  )
}

function TripDetailSummaryBand({ detail }: { readonly detail: DriverTripDetail }) {
  const t = useT()
  const format = useFormat()

  return (
    <View style={styles.summaryBand}>
      <View style={styles.summaryRow}>
        <AppText variant="heading" style={styles.codeText}>
          {detail.code}
        </AppText>
        <TripStatusChip status={detail.status} />
      </View>
      {detail.departureTime ? (
        <View style={styles.metaRow}>
          <Clock size={16} color={colors.text2} />
          <AppText color={colors.text2}>
            {t('driver.detail.plannedArrival')}: {format.time(detail.departureTime)} {format.date(detail.departureTime)}
          </AppText>
        </View>
      ) : null}
    </View>
  )
}

function DispatcherCard({ dispatcher }: { readonly dispatcher: NonNullable<DriverTripDetail['dispatcher']> }) {
  const t = useT()

  const handleCall = () => {
    if (dispatcher.phone) {
      void Linking.openURL(`tel:${dispatcher.phone}`)
    }
  }

  return (
    <Card>
      <View style={styles.sectionHead}>
        <UserIcon size={20} color={colors.primary} />
        <AppText variant="heading">{t('driver.detail.dispatcherInfo')}</AppText>
      </View>
      <View style={styles.recipientCard}>
        <View style={styles.recipientInfo}>
          <AppText variant="label" color={colors.text}>
            {dispatcher.name}
          </AppText>
          <AppText color={colors.text2}>
            {dispatcher.phone ?? t('driver.detail.noPhone')}
          </AppText>
        </View>
        {dispatcher.phone ? (
          <Button icon={Phone} variant="secondary" onPress={handleCall}>
            {t('driver.detail.dispatcherCall')}
          </Button>
        ) : null}
      </View>
    </Card>
  )
}

function DepotAndVehicleCard({ detail }: { readonly detail: DriverTripDetail }) {
  const t = useT()

  const handleNavToDepot = () => {
    const target = detail.depot.address || (detail.depot.lat && detail.depot.lng ? `${detail.depot.lat},${detail.depot.lng}` : '')
    if (target) {
      void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`)
    }
  }

  const payloadUtilization =
    detail.vehicle?.maxPayloadKg && detail.totalWeightKg !== undefined
      ? Math.round((detail.totalWeightKg / detail.vehicle.maxPayloadKg) * 100)
      : undefined

  return (
    <Card>
      <View style={styles.sectionHead}>
        <Warehouse size={20} color={colors.primary} />
        <AppText variant="heading">{t('driver.detail.depotInfo')}</AppText>
      </View>
      <AppText variant="label" style={styles.depotName}>
        {detail.depot.name}
      </AppText>
      {detail.depot.address ? (
        <View style={styles.metaRow}>
          <MapPin size={16} color={colors.text3} />
          <AppText color={colors.text2} style={styles.flexShrink}>
            {detail.depot.address}
          </AppText>
        </View>
      ) : null}
      {detail.depot.address || (detail.depot.lat && detail.depot.lng) ? (
        <View style={styles.depotActionRow}>
          <Button icon={Navigation} variant="secondary" onPress={handleNavToDepot}>
            {t('driver.detail.navToDepot')}
          </Button>
        </View>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.sectionHead}>
        <Truck size={20} color={colors.primary} />
        <AppText variant="heading">{t('driver.detail.vehicleInfo')}</AppText>
      </View>
      {detail.vehicle ? (
        <View style={styles.vehicleDetails}>
          <AppText variant="label">
            {t('driver.detail.licensePlate', { plate: detail.vehicle.licensePlate })}
          </AppText>
          {detail.vehicle.name ? <AppText color={colors.text2}>{detail.vehicle.name}</AppText> : null}
          {detail.vehicle.maxPayloadKg ? (
            <View style={styles.vehicleMetaRow}>
              <AppText color={colors.text3}>
                {t('driver.detail.maxPayload', { weight: detail.vehicle.maxPayloadKg })}
              </AppText>
              {payloadUtilization !== undefined ? (
                <Chip
                  tone={
                    payloadUtilization > 100
                      ? 'danger'
                      : payloadUtilization > 85
                        ? 'warning'
                        : 'cyan'
                  }
                  label={t('driver.detail.payloadUtilization', {
                    percent: payloadUtilization,
                  })}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <AppText color={colors.text3}>--</AppText>
      )}

      <View style={styles.divider} />

      <View style={styles.factsGrid}>
        <View style={styles.factItem}>
          <AppText variant="meta" color={colors.text3}>
            {t('driver.detail.summary')}
          </AppText>
          <AppText variant="heading" color={colors.primary}>
            {t('driver.detail.stopsCount', { count: detail.totalStops })}
          </AppText>
        </View>
        <View style={styles.factItem}>
          <AppText variant="meta" color={colors.text3}>
            {t('driver.detail.packagesCount', { count: detail.totalPackages })}
          </AppText>
          {detail.totalWeightKg !== undefined ? (
            <AppText variant="label" color={colors.text2}>
              {detail.totalWeightKg} kg
            </AppText>
          ) : null}
        </View>
      </View>
    </Card>
  )
}

function formatDuration(seconds: number, t: ReturnType<typeof useT>): string {
  const totalMinutes = Math.round(seconds / 60)
  if (totalMinutes < 60) {
    return t('driver.detail.minutes', { mins: totalMinutes })
  }
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  return t('driver.detail.hoursAndMinutes', { hours, mins })
}

function TripRouteMapSection({ detail }: { readonly detail: DriverTripDetail }) {
  const t = useT()

  const stops = detail.stops
    .filter((s) => s.lat !== undefined && s.lng !== undefined)
    .map((s) => ({
      id: s.id,
      number: s.number,
      name: s.name,
      lat: s.lat as number,
      lng: s.lng as number,
    }))

  const hasDepot = detail.depot.lat !== undefined && detail.depot.lng !== undefined
  const depot = hasDepot
    ? {
        name: detail.depot.name,
        lat: detail.depot.lat as number,
        lng: detail.depot.lng as number,
      }
    : undefined

  if (stops.length === 0 && depot === undefined) return null

  return (
    <Card>
      <View style={styles.sectionHead}>
        <MapPin size={20} color={colors.primary} />
        <AppText variant="heading">{t('driver.detail.routeMap')}</AppText>
      </View>
      {detail.totalDistanceMeters !== undefined || detail.totalDurationSeconds !== undefined ? (
        <View style={styles.routeMetricsRow}>
          {detail.totalDistanceMeters !== undefined ? (
            <Chip
              tone="cyan"
              label={t('driver.detail.distance', {
                dist: (detail.totalDistanceMeters / 1000).toFixed(1),
              })}
            />
          ) : null}
          {detail.totalDurationSeconds !== undefined ? (
            <Chip
              tone="azure"
              label={t('driver.detail.duration', {
                dur: formatDuration(detail.totalDurationSeconds, t),
              })}
            />
          ) : null}
        </View>
      ) : null}
      <View style={styles.mapContainer}>
        <RouteMap label={t('driver.detail.routeMap')} depot={depot} stops={stops} />
      </View>
    </Card>
  )
}

function StopsTimelineSection({ stops }: { readonly stops: readonly DriverTripDetailStop[] }) {
  const t = useT()

  return (
    <View style={styles.timelineContainer}>
      <AppText variant="heading" style={styles.timelineTitle}>
        {t('driver.detail.stopsTimeline')}
      </AppText>
      {stops.map((stop) => (
        <StopDetailCard key={stop.id} stop={stop} />
      ))}
    </View>
  )
}

function StopDetailCard({ stop }: { readonly stop: DriverTripDetailStop }) {
  const t = useT()
  const format = useFormat()

  const handleCall = () => {
    if (stop.contactPhone) {
      void Linking.openURL(`tel:${stop.contactPhone}`)
    }
  }

  const handleNavigate = () => {
    const destination = stop.address || (stop.lat && stop.lng ? `${stop.lat},${stop.lng}` : '')
    if (destination) {
      void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`)
    }
  }

  const statusTone =
    stop.status === 'COMPLETED' ? 'success' : stop.status === 'ARRIVED' ? 'azure' : 'neutral'

  return (
    <Card style={styles.stopCard}>
      <View style={styles.stopHead}>
        <StopDot number={stop.number} />
        <View style={styles.stopTitleCol}>
          <AppText variant="heading" style={styles.stopName}>
            {stop.name}
          </AppText>
          <View style={styles.chipsRow}>
            <Chip tone={statusTone} label={stop.status} />
            <Chip tone="cyan" label={stop.kind} />
            {stop.plannedStatus && stop.plannedStatus !== 'OK' ? (
              <Chip tone={stop.plannedStatus === 'MISSED' ? 'danger' : 'warning'} label={stop.plannedStatus} />
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.addressRow}>
        <MapPin size={16} color={colors.text3} style={styles.metaIcon} />
        <AppText color={colors.text2} style={styles.flexShrink}>
          {stop.address}
        </AppText>
      </View>

      <View style={styles.recipientCard}>
        <View style={styles.recipientInfo}>
          <AppText variant="label" color={colors.text}>
            {stop.contactName ?? t('driver.detail.contact')}
          </AppText>
          <AppText color={colors.text2}>
            {stop.contactPhone ?? t('driver.detail.noPhone')}
          </AppText>
        </View>
        <View style={styles.stopActionButtons}>
          {stop.address || (stop.lat && stop.lng) ? (
            <Button icon={Navigation} variant="secondary" onPress={handleNavigate}>
              {t('driver.detail.navigate')}
            </Button>
          ) : null}
          {stop.contactPhone ? (
            <Button icon={Phone} variant="secondary" onPress={handleCall}>
              {t('driver.detail.call')}
            </Button>
          ) : null}
        </View>
      </View>

      <View style={styles.timingRow}>
        {stop.plannedArrival ? (
          <View style={styles.timingItem}>
            <AppText variant="meta" color={colors.text3}>
              {t('driver.detail.plannedArrival')}
            </AppText>
            <AppText variant="label">
              {format.time(stop.plannedArrival)} {format.date(stop.plannedArrival)}
            </AppText>
          </View>
        ) : null}
        {stop.deadline ? (
          <View style={styles.timingItem}>
            <AppText variant="meta" color={colors.text3}>
              {t('driver.detail.deadline')}
            </AppText>
            <AppText variant="label">
              {format.time(stop.deadline)} {format.date(stop.deadline)}
            </AppText>
          </View>
        ) : null}
      </View>

      {stop.packages.length > 0 ? (
        <View style={styles.packagesSection}>
          <View style={styles.packagesHead}>
            <Package size={16} color={colors.primary} />
            <AppText variant="label">
              {t('driver.detail.packagesInStop', { count: stop.packages.length })}
            </AppText>
          </View>
          {stop.packages.map((pkg) => (
            <View key={pkg.id} style={styles.packageItem}>
              <View style={styles.packageInfo}>
                <AppText variant="label" style={styles.codeText}>
                  {pkg.barcode || pkg.code}
                </AppText>
                {pkg.name ? <AppText color={colors.text2}>{pkg.name}</AppText> : null}
              </View>
              {pkg.weightKg ? (
                <AppText color={colors.text3}>{pkg.weightKg} kg</AppText>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  )
}

function TripDetailFooter({ detail }: { readonly detail: DriverTripDetail }) {
  const t = useT()
  const router = useRouter()

  if (detail.status === 'PLANNED') {
    return <Banner tone="info">{t('driver.detail.plannedNotice')}</Banner>
  }

  if (detail.status === 'LOADING') {
    return detail.loadingCompleted ? (
      <Button onPress={() => router.push(tripPath(detail.id))}>
        {t('driver.detail.departTrip')}
      </Button>
    ) : (
      <Banner tone="info">{t('driver.detail.loadingNotice')}</Banner>
    )
  }

  if (detail.status === 'IN_TRANSIT') {
    return (
      <Button onPress={() => router.push(tripPath(detail.id))}>
        {t('driver.detail.continueDelivery')}
      </Button>
    )
  }

  if (detail.status === 'DELIVERED') {
    return (
      <Button variant="secondary" onPress={() => router.push(tripPath(detail.id))}>
        {t('driver.detail.viewSummary')}
      </Button>
    )
  }

  return null
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    padding: space[4],
    gap: space[4],
    paddingBottom: space[8],
  },
  summaryBand: {
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: space[1],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontVariant: ['tabular-nums'],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginBottom: space[2],
  },
  depotName: {
    fontSize: 16,
    marginBottom: space[1],
  },
  flexShrink: {
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lineSoft,
    marginVertical: space[3],
  },
  vehicleDetails: {
    gap: space[1],
  },
  factsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  factItem: {
    gap: space[1],
  },
  mapContainer: {
    height: 220,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: space[2],
  },
  timelineContainer: {
    gap: space[3],
  },
  timelineTitle: {
    fontSize: 18,
    marginTop: space[2],
  },
  stopCard: {
    gap: space[3],
  },
  stopHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  stopTitleCol: {
    flex: 1,
    gap: space[1],
  },
  stopName: {
    fontSize: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
  },
  metaIcon: {
    marginTop: 2,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipientInfo: {
    gap: 2,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: space[2],
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  timingItem: {
    gap: 2,
  },
  packagesSection: {
    paddingTop: space[2],
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    gap: space[2],
  },
  packagesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  packageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space[1],
  },
  packageInfo: {
    gap: 2,
  },
  depotActionRow: {
    marginTop: space[2],
    flexDirection: 'row',
  },
  vehicleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    flexWrap: 'wrap',
  },
  routeMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    marginBottom: space[2],
  },
  stopActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
})
