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
import { badgeTones, colors, radius, shadow, space, type BadgeTone } from '@/theme/tokens'
import type { TripSubStatus } from '@/types/trip'

import { DepartButton } from '../DepartButton'
import { DriverNavigation } from '../DriverNavigation'
import type { DriverTripDetail, DriverTripDetailStop } from '../driver-model'
import { GpsToggle } from '../GpsToggle'
import { RouteMap } from '../RouteMap'
import { tripPath } from '../TripCard'
import { useDeviceLocation, useStartGpsWhenDelivering } from '../useDeviceLocation'
import { useDriverCapabilities, useDriverTripDetailQuery, useTripScreenQuery } from '../useDriverQueries'

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

function heroAccentOf(detail: DriverTripDetail): BadgeTone {
  if (detail.status === 'IN_TRANSIT') return 'azure'
  if (detail.status === 'DELIVERED') return 'success'
  if (detail.status === 'LOADING') return detail.loadingCompleted ? 'cyan' : 'warning'
  return 'cyan'
}

function TripDetailHeroCard({ detail }: { readonly detail: DriverTripDetail }) {
  const t = useT()
  const format = useFormat()
  const accent = badgeTones[heroAccentOf(detail)]

  const sub: TripSubStatus | null =
    detail.status === 'LOADING'
      ? detail.loadingCompleted
        ? { kind: 'loaded' }
        : { kind: 'loading', recorded: 0, total: detail.totalPackages }
      : null

  return (
    <Card style={[styles.heroCard, styles.accentCard, { borderLeftColor: accent.fg }]}>
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
        <View style={[styles.heroMetaPill, { backgroundColor: accent.bg, borderColor: accent.border }]}>
          <Clock size={16} color={accent.fg} style={styles.noShrink} />
          <AppText variant="meta" color={accent.fg} style={styles.flexShrink}>
            {t('driver.detail.plannedArrival')}: {format.time(detail.departureTime)} {format.date(detail.departureTime)}
          </AppText>
        </View>
      ) : null}
    </Card>
  )
}

function DispatcherCard({ dispatcher }: { readonly dispatcher: NonNullable<DriverTripDetail['dispatcher']> }) {
  const t = useT()
  const [open, setOpen] = useState(false)

  const handleCall = () => {
    if (dispatcher.phone) {
      void Linking.openURL(`tel:${dispatcher.phone}`)
    }
  }

  return (
    <Card style={[styles.accentCard, { borderLeftColor: badgeTones.azure.fg }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((prev) => !prev)}
        style={({ pressed }) => [styles.accordionHeader, pressed && styles.accordionHeaderPressed]}>
        <View style={styles.accordionHeaderLeft}>
          <View style={[styles.iconBadge, { backgroundColor: badgeTones.azure.bg }]}>
            <UserIcon size={18} color={badgeTones.azure.fg} />
          </View>
          <View style={styles.accordionTitleCol}>
            <AppText variant="heading" style={styles.flexShrink}>
              {t('driver.detail.dispatcherInfo')}
            </AppText>
            {!open ? (
              <AppText variant="meta" color={badgeTones.azure.fg} numberOfLines={1}>
                {dispatcher.name}
              </AppText>
            ) : null}
          </View>
        </View>
        <View style={styles.chevronWrap}>
          {open ? <ChevronUp size={20} color={badgeTones.azure.fg} /> : <ChevronDown size={20} color={colors.text2} />}
        </View>
      </Pressable>
      {open ? (
        <View style={[styles.recipientCard, { borderColor: badgeTones.azure.border, backgroundColor: badgeTones.azure.bg }]}>
          <View style={styles.recipientInfo}>
            <AppText variant="label" color={colors.text}>
              {dispatcher.name}
            </AppText>
            <AppText color={badgeTones.azure.fg}>
              {dispatcher.phone ?? t('driver.detail.noPhone')}
            </AppText>
          </View>
          {dispatcher.phone ? (
            <Button icon={Phone} variant="secondary" style={styles.compactBtn} onPress={handleCall}>
              {t('driver.detail.dispatcherCall')}
            </Button>
          ) : null}
        </View>
      ) : null}
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
    <Card style={[styles.accentCard, { borderLeftColor: badgeTones.cyan.fg }]}>
      <View style={styles.sectionHeadBetween}>
        <View style={styles.sectionHeadLeft}>
          <View style={[styles.iconBadge, { backgroundColor: badgeTones.cyan.bg }]}>
            <Warehouse size={18} color={badgeTones.cyan.fg} />
          </View>
          <AppText variant="heading">{t('driver.detail.depotInfo')}</AppText>
        </View>
        {detail.depot.address || (detail.depot.lat && detail.depot.lng) ? (
          <Button icon={Navigation} variant="secondary" style={styles.compactBtn} onPress={handleNavToDepot}>
            {t('driver.detail.navToDepot')}
          </Button>
        ) : null}
      </View>
      <AppText variant="label" color={badgeTones.cyan.fg} style={styles.depotName}>
        {detail.depot.name}
      </AppText>
      {detail.depot.address ? (
        <View style={styles.metaRow}>
          <MapPin size={16} color={badgeTones.cyan.fg} />
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
  const [open, setOpen] = useState(false)

  const payloadUtilization =
    detail.vehicle?.maxPayloadKg && detail.totalWeightKg !== undefined
      ? Math.round((detail.totalWeightKg / detail.vehicle.maxPayloadKg) * 100)
      : undefined

  const dimensions =
    detail.vehicle?.innerLengthCm && detail.vehicle?.innerWidthCm && detail.vehicle?.innerHeightCm
      ? `${(detail.vehicle.innerLengthCm / 100).toFixed(1)} × ${(detail.vehicle.innerWidthCm / 100).toFixed(1)} × ${(detail.vehicle.innerHeightCm / 100).toFixed(1)} m`
      : undefined

  return (
    <Card style={[styles.accentCard, { borderLeftColor: badgeTones.warning.fg }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((prev) => !prev)}
        style={({ pressed }) => [styles.accordionHeader, pressed && styles.accordionHeaderPressed]}>
        <View style={styles.accordionHeaderLeft}>
          <View style={[styles.iconBadge, { backgroundColor: badgeTones.warning.bg }]}>
            <Truck size={18} color={badgeTones.warning.fg} />
          </View>
          <View style={styles.accordionTitleCol}>
            <AppText variant="heading" style={styles.flexShrink}>
              {t('driver.detail.vehicleInfo')}
            </AppText>
            {!open && detail.vehicle?.licensePlate ? (
              <AppText variant="meta" color={badgeTones.warning.fg} numberOfLines={1}>
                {detail.vehicle.licensePlate}
                {detail.vehicle.typeName ? ` · ${detail.vehicle.typeName}` : ''}
              </AppText>
            ) : null}
          </View>
        </View>
        <View style={styles.chevronWrap}>
          {open ? <ChevronUp size={20} color={badgeTones.warning.fg} /> : <ChevronDown size={20} color={colors.text2} />}
        </View>
      </Pressable>
      {open ? (
        detail.vehicle ? (
          <View style={styles.vehicleGrid}>
            <View style={styles.vehicleRow}>
              <AppText color={colors.text3}>{t('driver.detail.licensePlateLabel')}:</AppText>
              <View style={styles.platePill}>
                <AppText variant="meta" color={badgeTones.cyan.fg} style={styles.plateText}>
                  {detail.vehicle.licensePlate}
                </AppText>
              </View>
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
        )
      ) : null}
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
  if (detail.status === 'IN_TRANSIT') return <LiveTripRouteMap detail={detail} />

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
    <Card style={[styles.accentCard, { borderLeftColor: badgeTones.success.fg }]}>
      <View style={styles.sectionHead}>
        <View style={[styles.iconBadge, { backgroundColor: badgeTones.success.bg }]}>
          <MapPin size={18} color={badgeTones.success.fg} />
        </View>
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

function LiveTripRouteMap({ detail }: { readonly detail: DriverTripDetail }) {
  const t = useT()
  const capabilities = useDriverCapabilities()
  const gps = useDeviceLocation(detail.id)
  const live = useTripScreenQuery(detail.id)
  const stop = live.data?.kind === 'stop' ? live.data.screen : undefined
  useStartGpsWhenDelivering(true, capabilities.gps, gps)

  const stops = detail.stops
    .filter((s) => s.lat !== undefined && s.lng !== undefined)
    .map((s) => ({
      id: s.id,
      number: s.number,
      name: s.name,
      lat: s.lat as number,
      lng: s.lng as number,
    }))
  const depot =
    detail.depot.lat !== undefined && detail.depot.lng !== undefined
      ? { name: detail.depot.name, lat: detail.depot.lat, lng: detail.depot.lng }
      : undefined

  return (
    <Card style={[styles.accentCard, { borderLeftColor: badgeTones.success.fg }]}>
      <View style={styles.sectionHead}>
        <View style={[styles.iconBadge, { backgroundColor: badgeTones.success.bg }]}>
          <MapPin size={18} color={badgeTones.success.fg} />
        </View>
        <AppText variant="heading">{t('driver.detail.routeMap')}</AppText>
      </View>
      {capabilities.gps ? (
        <GpsToggle localOnly={capabilities.gpsLocalOnly} enabled={gps.enabled} state={gps.state} toggle={gps.toggle} />
      ) : null}
      {stop ? (
        <DriverNavigation screen={stop} vehicle={gps.enabled ? gps.latest ?? undefined : undefined} />
      ) : (
        <View style={styles.mapContainer}>
          <RouteMap label={t('driver.detail.routeMap')} depot={depot} stops={stops} path={detail.path} />
        </View>
      )}
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
  const [stopOpen, setStopOpen] = useState(false)
  const [packagesOpen, setPackagesOpen] = useState(false)
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
  const borderAccent =
    stop.status === 'COMPLETED'
      ? badgeTones.success.fg
      : stop.status === 'ARRIVED'
        ? badgeTones.azure.fg
        : colors.primary

  const INITIAL_PKG_LIMIT = 3
  const visiblePackages = expanded ? stop.packages : stop.packages.slice(0, INITIAL_PKG_LIMIT)
  const hasMorePackages = stop.packages.length > INITIAL_PKG_LIMIT
  const addressDisplay = stop.address || stop.name

  return (
    <Card style={[styles.stopCard, styles.accentCard, { borderLeftColor: borderAccent }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: stopOpen }}
        onPress={() => setStopOpen((prev) => !prev)}
        style={({ pressed }) => [styles.stopAccordionHeader, pressed && styles.accordionHeaderPressed]}>
        <View style={styles.noShrink}>
          <StopDot number={stop.number} />
        </View>
        <View style={styles.stopAddressCol}>
          <AppText variant="label" color={colors.text} numberOfLines={stopOpen ? undefined : 2} style={styles.stopAddressText}>
            {addressDisplay}
          </AppText>
        </View>
        <View style={styles.chevronWrap}>
          {stopOpen ? <ChevronUp size={20} color={borderAccent} /> : <ChevronDown size={20} color={colors.text2} />}
        </View>
      </Pressable>

      {stopOpen ? (
        <View style={styles.stopExpandedBody}>
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
            {stop.plannedStatus && stop.plannedStatus !== 'OK' ? (
              <Chip tone={stop.plannedStatus === 'MISSED' ? 'danger' : 'warning'} label={stop.plannedStatus} />
            ) : null}
          </View>

          {stop.name && stop.name !== stop.address ? (
            <View style={styles.addressRow}>
              <MapPin size={16} color={borderAccent} style={styles.metaIcon} />
              <AppText variant="label" color={colors.text2} style={styles.flexShrink}>
                {stop.name}
              </AppText>
            </View>
          ) : null}

          <View style={styles.recipientSection}>
            <View style={styles.recipientHeaderRow}>
              <UserIcon size={15} color={badgeTones.azure.fg} />
              <AppText variant="meta" color={badgeTones.azure.fg}>
                {t('driver.detail.customerInfo')}
              </AppText>
            </View>
            <View style={[styles.recipientCard, { borderColor: badgeTones.azure.border, backgroundColor: badgeTones.azure.bg }]}>
              <View style={styles.recipientInfo}>
                <AppText variant="label" color={colors.text}>
                  {stop.contactName ?? t('driver.detail.contact')}
                </AppText>
                {stop.contactPhone ? (
                  <AppText color={badgeTones.azure.fg}>{stop.contactPhone}</AppText>
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

          {stop.plannedArrival || stop.deadline ? (
            <View style={styles.timingRow}>
              {stop.plannedArrival ? (
                <View style={[styles.timingItem, styles.timingTileCyan]}>
                  <AppText variant="meta" color={badgeTones.cyan.fg}>
                    {t('driver.detail.plannedArrival')}
                  </AppText>
                  <AppText variant="label" color={colors.text}>
                    {format.time(stop.plannedArrival)} {format.date(stop.plannedArrival)}
                  </AppText>
                </View>
              ) : null}
              {stop.deadline ? (
                <View style={[styles.timingItem, styles.timingTileWarning]}>
                  <AppText variant="meta" color={badgeTones.warning.fg}>
                    {t('driver.detail.deadline')}
                  </AppText>
                  <AppText variant="label" color={colors.text}>
                    {format.time(stop.deadline)} {format.date(stop.deadline)}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}

          {stop.packages.length > 0 ? (
            <View style={styles.packagesSection}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: packagesOpen }}
                onPress={() => setPackagesOpen((prev) => !prev)}
                style={({ pressed }) => [styles.packagesDropdownHeader, pressed && styles.accordionHeaderPressed]}>
                <View style={styles.packagesHead}>
                  <Package size={16} color={badgeTones.cyan.fg} style={styles.noShrink} />
                  <AppText variant="label" color={badgeTones.cyan.fg} style={styles.flexShrink}>
                    {t('driver.detail.packagesInStop', { count: stop.packages.length })}
                  </AppText>
                </View>
                <View style={styles.chevronWrap}>
                  {packagesOpen ? <ChevronUp size={18} color={badgeTones.cyan.fg} /> : <ChevronDown size={18} color={badgeTones.cyan.fg} />}
                </View>
              </Pressable>
              {packagesOpen ? (
                <>
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
                            <AppText variant="label" color={badgeTones.warning.fg} style={styles.packageWeight}>
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
                </>
              ) : null}
            </View>
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
      <DepartButton
        tripId={detail.id}
        tripCode={detail.code}
        primary
        blockedReason={undefined}
        href={tripPath(detail.id)}
      />
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
  // Screen(scroll=true) đã có paddingHorizontal và maxWidth: tránh lồng padding kép làm hẹp thẻ trên màn nhỏ
  content: {
    width: '100%',
    gap: space[4],
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
    alignItems: 'flex-start',
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
    flexWrap: 'wrap',
    gap: space[2],
    marginBottom: space[2],
  },
  sectionHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    gap: space[2],
  },
  accordionHeaderLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  chevronWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  noShrink: {
    flexShrink: 0,
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
    flexWrap: 'wrap',
    gap: space[2],
  },
  vehiclePayloadCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
    flexShrink: 0,
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
    flexWrap: 'wrap',
    gap: space[2],
    backgroundColor: colors.surface,
    padding: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipientInfo: {
    flex: 1,
    minWidth: 140,
    gap: 2,
  },
  timingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    paddingTop: space[2],
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  timingItem: {
    flex: 1,
    minWidth: 130,
    gap: 2,
  },
  packagesSection: {
    paddingTop: space[2],
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    gap: space[2],
  },
  packagesHead: {
    flex: 1,
    minWidth: 0,
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
    flexShrink: 0,
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[2],
  },
  compactBtn: {
    minHeight: 38,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    paddingVertical: space[1],
    borderRadius: radius.sm,
  },
  accordionHeaderPressed: {
    opacity: 0.75,
  },
  accordionTitleCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  packagesDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: badgeTones.cyan.bg,
    borderWidth: 1,
    borderColor: badgeTones.cyan.border,
  },
  accentCard: {
    borderLeftWidth: 4,
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  platePill: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: badgeTones.cyan.bg,
    borderWidth: 1,
    borderColor: badgeTones.cyan.border,
  },
  plateText: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  stopAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    paddingVertical: space[1],
  },
  stopAddressCol: {
    flex: 1,
    minWidth: 0,
  },
  stopAddressText: {
    flexShrink: 1,
  },
  stopExpandedBody: {
    gap: space[3],
    paddingTop: space[2],
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  timingTileCyan: {
    padding: space[2],
    borderRadius: radius.md,
    backgroundColor: badgeTones.cyan.bg,
    borderWidth: 1,
    borderColor: badgeTones.cyan.border,
  },
  timingTileWarning: {
    padding: space[2],
    borderRadius: radius.md,
    backgroundColor: badgeTones.warning.bg,
    borderWidth: 1,
    borderColor: badgeTones.warning.border,
  },
})
