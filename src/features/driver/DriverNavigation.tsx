import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/components/AppText'
import type { GeoPoint } from '@/domain/routing'
import { nextGuidance, parseGuidanceSteps, remainingTo, type NextGuidance } from '@/domain/routing/guidance'
import { useT, type MessageKey } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import type { StopScreen } from './driver-model'
import { RouteMap } from './RouteMap'
import type { DeviceGpsPoint } from './useDeviceLocation'

const MANEUVER_KEYS = {
  'turn-right': 'driver.guidance.maneuvers.turn-right',
  'turn-left': 'driver.guidance.maneuvers.turn-left',
  straight: 'driver.guidance.maneuvers.straight',
  'uturn-right': 'driver.guidance.maneuvers.uturn-right',
  'uturn-left': 'driver.guidance.maneuvers.uturn-left',
  arrive: 'driver.guidance.maneuvers.arrive',
  'ramp-right': 'driver.guidance.maneuvers.ramp-right',
  'ramp-left': 'driver.guidance.maneuvers.ramp-left',
  merge: 'driver.guidance.maneuvers.merge',
  'fork-right': 'driver.guidance.maneuvers.fork-right',
  'fork-left': 'driver.guidance.maneuvers.fork-left',
  'roundabout-right': 'driver.guidance.maneuvers.roundabout-right',
  'roundabout-left': 'driver.guidance.maneuvers.roundabout-left',
} as const satisfies Record<string, MessageKey>

function formatDistance(meters: number, t: ReturnType<typeof useT>): string {
  if (meters >= 1000) return t('driver.guidance.km', { count: Math.round(meters / 100) / 10 })
  return t('driver.guidance.meters', { count: Math.max(0, meters) })
}

function instructionOf(next: NextGuidance | undefined, stopName: string, t: ReturnType<typeof useT>): string {
  if (next?.instruction.trim()) return next.instruction
  const key = next ? MANEUVER_KEYS[next.maneuver as keyof typeof MANEUVER_KEYS] : undefined
  return key ? t(key) : t('driver.guidance.fallback', { name: stopName })
}

function mapLabel(stopName: string, vehicle: GeoPoint | undefined, t: ReturnType<typeof useT>): string {
  if (!vehicle) return t('driver.guidance.map', { name: stopName })
  return t('driver.guidance.mapLive', { name: stopName, lat: vehicle.lat.toFixed(4), lng: vehicle.lng.toFixed(4) })
}

/**
 * Chỉ đường trong app: banner bước kế tiếp + bản đồ Goong (MapLibre). Không mở Google Maps. Banner chỉ có khi xe đã xuất phát
 * (`mode === 'delivering'`): trước đó vị trí là vị trí của kho, "Còn 0 m · Đi thẳng" là câu sai.
 * Pin xe chỉ từ GPS đang bật (`vehicle`); tắt GPS thì không vẽ pin giả từ last-known một shot.
 */
export function DriverNavigation({
  screen,
  vehicle,
}: {
  screen: StopScreen
  vehicle?: DeviceGpsPoint
}) {
  const t = useT()
  const here = vehicle
  const planVersion = screen.routeMap?.planVersion
  const seenVersion = useRef<number | undefined>(undefined)
  const [routeChanged, setRouteChanged] = useState(false)

  useEffect(() => {
    if (planVersion === undefined) return
    if (seenVersion.current !== undefined && planVersion > seenVersion.current) setRouteChanged(true)
    seenVersion.current = planVersion
  }, [planVersion])

  const steps = useMemo(() => parseGuidanceSteps(screen.routeMap?.guidanceSteps), [screen.routeMap?.guidanceSteps])
  const destination =
    screen.stop.lat !== undefined && screen.stop.lng !== undefined
      ? { lat: screen.stop.lat, lng: screen.stop.lng }
      : screen.routeMap?.stops.find((stop) => stop.number === screen.stop.number)

  const departed = screen.mode === 'delivering'
  const next = screen.arrived || !departed
    ? undefined
    : (nextGuidance(steps, here) ?? (destination
      ? { instruction: '', maneuver: 'straight' as const, remainingMeters: remainingTo(destination, here) }
      : undefined))

  const banner = screen.arrived
    ? t('driver.guidance.arrived')
    : next
      ? t('driver.guidance.next', {
          distance: formatDistance(next.remainingMeters, t),
          instruction: instructionOf(next, screen.stop.name, t),
        })
      : t('driver.guidance.fallback', { name: screen.stop.name })

  const mapStops = screen.routeMap?.stops ?? (destination
    ? [{ id: screen.stop.ref, number: screen.stop.number, name: screen.stop.name, lat: destination.lat, lng: destination.lng }]
    : [])

  return (
    <View accessibilityLabel={t('driver.guidance.title')} style={styles.wrap}>
      {departed ? (
        <View style={styles.banner}>
          <AppText variant="title">{banner}</AppText>
        </View>
      ) : null}
      {routeChanged ? (
        <View style={styles.reroute} accessibilityLiveRegion="polite">
          <AppText variant="label">{t('driver.guidance.rerouted')}</AppText>
        </View>
      ) : null}
      {screen.routeMap?.planVersion !== undefined ? (
        <AppText color={colors.text3}>{t('driver.guidance.version', { version: screen.routeMap.planVersion })}</AppText>
      ) : null}
      {mapStops.length > 0 ? (
        <RouteMap
          label={mapLabel(screen.stop.name, here, t)}
          depot={screen.routeMap?.depot}
          stops={mapStops}
          path={screen.routeMap?.path}
          vehicle={here}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  banner: {
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryFillBorder,
    backgroundColor: colors.primaryBg,
  },
  reroute: {
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryFillBorder,
    backgroundColor: colors.primaryBg,
  },
})
