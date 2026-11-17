import { useState } from 'react'
import { useRouter } from 'expo-router'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Navigation,
  Package,
  Phone,
  Truck,
  User as UserIcon,
  Warehouse,
} from 'lucide-react-native'
import { Linking, Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { IconButton } from '@/components/IconButton'
import { Screen } from '@/components/Screen'
import { ErrorState, LoadingState } from '@/components/StateView'
import { StopDot } from '@/components/StopDot'
import { TripStatusChip, TripSubStatusTag } from '@/components/TripStatus'
import { dataErrorMessage, useFormat, useT } from '@/lib/i18n'
import { colors, CONTENT_MAX_WIDTH, radius, shadow, space } from '@/theme/tokens'
import type { TripSubStatus } from '@/types/trip'

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
      scroll={data !== undefined}
      refresh={data !== undefined ? { refreshing: query.isRefetching, onRefresh: () => void query.refetch() } : undefined}
      footer={data ? <TripDetailFooter detail={data} /> : undefined}>
      {data ? (
        <View style={styles.content}>
          <TripDetailHeroCard detail={data} />
          {data.dispatcher ? <DispatcherCard dispatcher={data.dispatcher} /> : null}
          <DepotCard detail={data} />
          <VehicleDetailCard detail={data} />
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

function TripDetailHeroCard({ detail }: { readonly detail: DriverTripDetail }) {
  const t = useT()
  const format = useFormat()

  const sub: TripSubStatus | null =
    detail.status === 'LOADING'
      ? detail.loadingCompleted
        ? { kind: 'loaded' }
        : { kind: 'loading', recorded: 0, total: detail.totalPackages }
      : null

  return (
    <Card style={styles.heroCard}>
      <View style={styles.heroHeader}>
        <AppText variant="heading" style={styles.codeText}>
          {detail.code}
        </AppText>
        <View style={styles.chipsRow}>
          <TripStatusChip status={detail.status} />
          {sub ? <TripSubStatusTag sub={sub} /> : null}
        </View>
      </View>
      {detail.departureTime ? (
        <View style={styles.metaRow}>
          <Clock size={16} color={colors.text2} />
          <AppText color={colors.text2}>
            {t('driver.detail.plannedArrival')}: {format.time(detail.departureTime)} {format.date(detail.departureTime)}
          </AppText>
        </View>
      ) : null}
    </Card>
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
          <Button icon={Phone} variant="secondary" style={styles.compactBtn} onPress={handleCall}>
            {t('driver.detail.dispatcherCall')}
          </Button>
        ) : null}
      </View>
    </Card>
  )
}

function DepotCard({ detail }: { readonly detail: DriverTripDetail }) {
  const t = useT()

  const handleNavToDepot = () => {
    const target = detail.depot.address || (detail.depot.lat && detail.depot.lng ? `${detail.depot.lat},${detail.depot.lng}` : '')
    if (target) {
      void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`)
    }
  }

  return (
    <Card>
      <View style={styles.sectionHeadBetween}>
        <View style={styles.sectionHeadLeft}>
          <Warehouse size={20} color={colors.primary} />
          <AppText variant="heading">{t('driver.detail.depotInfo')}</AppText>
        </View>
        {detail.depot.address || (detail.depot.lat && detail.depot.lng) ? (
          <Button icon={Navigation} variant="secondary" style={styles.compactBtn} onPress={handleNavToDepot}>
            {t('driver.detail.navToDepot')}
          </Button>
        ) : null}
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
    </Card>
  )
}

function VehicleDetailCard({ detail }: { readonly detail: DriverTripDetail }) {
  const t = useT()

  const payloadUtilization =
    detail.vehicle?.maxPayloadKg && detail.totalWeightKg !== undefined
      ? Math.round((detail.totalWeightKg / detail.vehicle.maxPayloadKg) * 100)
      : undefined

  const dimensions =
    detail.vehicle?.innerLengthCm && detail.vehicle?.innerWidthCm && detail.vehicle?.innerHeightCm
      ? `${(detail.vehicle.innerLengthCm / 100).toFixed(1)} × ${(detail.vehicle.innerWidthCm / 100).toFixed(1)} × ${(detail.vehicle.innerHeightCm / 100).toFixed(1)} m`
      : undefined

  return (
    <Card>
      <View style={styles.sectionHead}>
        <Truck size={20} color={colors.primary} />
        <AppText variant="heading">{t('driver.detail.vehicleInfo')}</AppText>
      </View>
      {detail.vehicle ? (
        <View style={styles.vehicleGrid}>
          <View style={styles.vehicleRow}>
            <AppText color={colors.text3}>{t('driver.detail.licensePlateLabel')}:</AppText>
            <AppText variant="label" style={styles.codeText}>{detail.vehicle.licensePlate}</AppText>
          </View>
          {detail.vehicle.typeName ? (
            <View style={styles.vehicleRow}>
              <AppText color={colors.text3}>{t('driver.detail.vehicleType')}:</AppText>
              <AppText variant="label">{detail.vehicle.typeName}</AppText>
            </View>
          ) : detail.vehicle.name ? (
            <View style={styles.vehicleRow}>
              <AppText color={colors.text3}>{t('driver.detail.vehicleNameLabel')}:</AppText>
              <AppText variant="label">{detail.vehicle.name}</AppText>
            </View>
          ) : null}
          {dimensions ? (
            <View style={styles.vehicleRow}>
              <AppText color={colors.text3}>{t('driver.detail.cargoDimensions')}:</AppText>
              <AppText variant="label">{dimensions}</AppText>
            </View>
          ) : null}
          {detail.vehicle.maxVolumeM3 ? (
            <View style={styles.vehicleRow}>
              <AppText color={colors.text3}>{t('driver.detail.cargoVolume')}:</AppText>
              <AppText variant="label">{detail.vehicle.maxVolumeM3} m³</AppText>
            </View>
          ) : null}
          {detail.vehicle.maxPayloadKg ? (
            <View style={styles.vehicleRow}>
              <AppText color={colors.text3}>{t('driver.detail.maxPayloadLabel')}:</AppText>
              <View style={styles.vehiclePayloadCol}>
                <AppText variant="label">{detail.vehicle.maxPayloadKg} kg</AppText>
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
            </View>
          ) : null}
        </View>
      ) : (
        <AppText color={colors.text3}>--</AppText>
      )}
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
        <RouteMap
          label={t('driver.detail.routeMap')}
          depot={depot}
          stops={stops}
          path={detail.path}
        />
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

function handlingInfo(handlingClass: string | undefined, fragile: boolean | undefined, t: ReturnType<typeof useT>) {
  const effective = handlingClass === 'STANDARD' && fragile ? 'FRAGILE' : handlingClass || (fragile ? 'FRAGILE' : 'STANDARD')
  switch (effective) {
    case 'FRAGILE':
      return { label: t('driver.detail.handling.FRAGILE'), tone: 'danger' as const }
    case 'REFRIGERATED':
      return { label: t('driver.detail.handling.REFRIGERATED'), tone: 'cyan' as const }
    case 'HAZARDOUS':
      return { label: t('driver.detail.handling.HAZARDOUS'), tone: 'danger' as const }
    case 'HIGH_VALUE':
      return { label: t('driver.detail.handling.HIGH_VALUE'), tone: 'warning' as const }
    default:
      return { label: t('driver.detail.handling.STANDARD'), tone: 'neutral' as const }
  }
}

function packageStatusInfo(status: string | undefined, t: ReturnType<typeof useT>) {
  switch (status) {
    case 'LOADED':
      return { label: t('driver.detail.packageStatus.LOADED'), tone: 'azure' as const }
    case 'DELIVERED':
      return { label: t('driver.detail.packageStatus.DELIVERED'), tone: 'success' as const }
    case 'RETURNED':
      return { label: t('driver.detail.packageStatus.RETURNED'), tone: 'warning' as const }
    case 'CANCELLED':
      return { label: t('driver.detail.packageStatus.CANCELLED'), tone: 'danger' as const }
    case 'PLANNED':
      return { label: t('driver.detail.packageStatus.PLANNED'), tone: 'cyan' as const }
    case 'PENDING':
      return { label: t('driver.detail.packageStatus.PENDING'), tone: 'neutral' as const }
    default:
      return undefined
  }
}

function StopDetailCard({ stop }: { readonly stop: DriverTripDetailStop }) {
  const t = useT()
  const format = useFormat()
  const [expanded, setExpanded] = useState(false)

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

  const INITIAL_PKG_LIMIT = 3
  const visiblePackages = expanded ? stop.packages : stop.packages.slice(0, INITIAL_PKG_LIMIT)
  const hasMorePackages = stop.packages.length > INITIAL_PKG_LIMIT

  return (
    <Card style={styles.stopCard}>
      <View style={styles.stopHead}>
        <StopDot number={stop.number} />
        <View style={styles.stopTitleCol}>
          <AppText variant="heading" style={styles.stopName}>
            {stop.name}
          </AppText>
          <View style={styles.chipsRow}>
            <Chip
              tone={statusTone}
              label={
                stop.status === 'COMPLETED'
                  ? t('driver.detail.stopStatus.COMPLETED')
                  : stop.status === 'ARRIVED'
                    ? t('driver.detail.stopStatus.ARRIVED')
                    : t('driver.detail.stopStatus.PENDING')
              }
            />
            <Chip
              tone="cyan"
              label={
                stop.kind === 'PICKUP'
                  ? t('driver.detail.stopKind.PICKUP')
                  : t('driver.detail.stopKind.DELIVERY')
              }
            />
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

      <View style={styles.recipientSection}>
        <View style={styles.recipientHeaderRow}>
          <UserIcon size={15} color={colors.primary} />
          <AppText variant="meta" color={colors.text3}>
            {t('driver.detail.customerInfo')}
          </AppText>
        </View>
        <View style={styles.recipientCard}>
          <View style={styles.recipientInfo}>
            <AppText variant="label" color={colors.text}>
              {stop.contactName ?? t('driver.detail.contact')}
            </AppText>
            {stop.contactPhone ? (
              <AppText color={colors.text2}>{stop.contactPhone}</AppText>
            ) : null}
          </View>
          <View style={styles.stopActionButtons}>
            {stop.address || (stop.lat && stop.lng) ? (
              <Button icon={Navigation} variant="secondary" style={styles.compactBtn} onPress={handleNavigate}>
                {t('driver.detail.navigate')}
              </Button>
            ) : null}
            {stop.contactPhone ? (
              <Button icon={Phone} variant="secondary" style={styles.compactBtn} onPress={handleCall}>
                {t('driver.detail.call')}
              </Button>
            ) : null}
          </View>
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
          {visiblePackages.map((pkg) => {
            const handling = handlingInfo(pkg.handlingClass, pkg.fragile, t)
            const extraFragile = pkg.fragile && pkg.handlingClass && pkg.handlingClass !== 'FRAGILE' && pkg.handlingClass !== 'STANDARD'
            const pkgStatus = packageStatusInfo(pkg.status, t)
            const dims =
              pkg.lengthCm !== undefined && pkg.widthCm !== undefined && pkg.heightCm !== undefined
                ? `${Math.round(pkg.lengthCm)} × ${Math.round(pkg.widthCm)} × ${Math.round(pkg.heightCm)} cm`
                : undefined
            const showType = pkg.packageTypeName && pkg.packageTypeName !== pkg.name

            return (
              <View key={pkg.id} style={styles.packageItem}>
                <View style={styles.packageHeaderRow}>
                  <AppText variant="label" style={styles.flexShrink}>
                    {pkg.name || pkg.code}
                  </AppText>
                  {pkg.weightKg !== undefined ? (
                    <AppText variant="label" color={colors.text2} style={styles.packageWeight}>
                      {pkg.weightKg} kg
                    </AppText>
                  ) : null}
                </View>

                <View style={styles.chipsRow}>
                  <Chip tone={handling.tone} label={handling.label} />
                  {extraFragile ? <Chip tone="danger" label={t('driver.detail.handling.FRAGILE')} /> : null}
                  {pkgStatus ? <Chip tone={pkgStatus.tone} label={pkgStatus.label} /> : null}
                </View>

                <View style={styles.packageMetaRow}>
                  {pkg.barcode || pkg.code ? (
                    <AppText variant="meta" color={colors.text3} style={styles.codeText}>
                      {t('driver.detail.packageCode', { code: pkg.barcode || pkg.code })}
                    </AppText>
                  ) : null}
                  {dims ? (
                    <AppText variant="meta" color={colors.text2} style={styles.codeText}>
                      {t('driver.detail.packageDimensions', { dims })}
                    </AppText>
                  ) : null}
                </View>

                {showType ? (
                  <AppText variant="meta" color={colors.text2}>
                    {t('driver.detail.packageType', { type: pkg.packageTypeName })}
                  </AppText>
                ) : null}

                {pkg.note ? (
                  <AppText variant="meta" color={colors.text2}>
                    {t('driver.detail.packageNote', { note: pkg.note })}
                  </AppText>
                ) : null}
              </View>
            )
          })}
          {hasMorePackages ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.expandButton, pressed && styles.expandButtonPressed]}
              onPress={() => setExpanded((prev) => !prev)}>
              <AppText variant="label" color={colors.primary}>
                {expanded
                  ? t('driver.detail.collapsePackages')
                  : t('driver.detail.viewMorePackages', {
                      count: stop.packages.length - INITIAL_PKG_LIMIT,
                    })}
              </AppText>
              {expanded ? (
                <ChevronUp size={16} color={colors.primary} />
              ) : (
                <ChevronDown size={16} color={colors.primary} />
              )}
            </Pressable>
          ) : null}
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
  heroCard: {
    gap: space[2],
    borderRadius: radius.xl,
    ...shadow.card,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space[2],
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
  sectionHeadBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[2],
  },
  sectionHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  depotName: {
    fontSize: 16,
    marginBottom: space[1],
  },
  flexShrink: {
    flexShrink: 1,
  },
  vehicleGrid: {
    gap: space[2],
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  vehiclePayloadCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
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
    flexWrap: 'wrap',
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
  recipientSection: {
    gap: space[1],
  },
  recipientHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    marginBottom: 2,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderRadius: radius.md,
    padding: space[3],
    gap: space[1],
  },
  packageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  packageMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    marginTop: 2,
  },
  packageWeight: {
    marginLeft: space[2],
    fontVariant: ['tabular-nums'],
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    paddingVertical: space[2],
    marginTop: space[1],
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  expandButtonPressed: {
    backgroundColor: colors.lineSoft,
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
  compactBtn: {
    minHeight: 38,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
})
