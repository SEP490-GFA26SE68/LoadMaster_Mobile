import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Polyline, Rect, Text as SvgText } from 'react-native-svg'

import { stopColor, stopForeground } from '@/lib/stops'
import { colors } from '@/theme/tokens'

type Point = { readonly lat: number; readonly lng: number }
type Stop = Point & { readonly id: string; readonly number: number; readonly name: string }

const WIDTH = 320
const HEIGHT = 160
const PADDING = 22
const RADIUS = 10

function project(points: readonly Point[]): { x: number; y: number }[] {
  if (points.length === 0) return []
  const lats = points.map((point) => point.lat)
  const lngs = points.map((point) => point.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const spanLat = Math.max(maxLat - minLat, 1e-5)
  const spanLng = Math.max(maxLng - minLng, 1e-5)
  return points.map((point) => ({
    x: PADDING + ((point.lng - minLng) / spanLng) * (WIDTH - PADDING * 2),
    y: PADDING + ((maxLat - point.lat) / spanLat) * (HEIGHT - PADDING * 2),
  }))
}

/**
 * Sơ đồ tuyến SVG trong app (như `RouteMapSketch` của web): kho, điểm theo thứ tự, đường polyline, vị trí xe.
 * Không mở Google Maps.
 */
export function RouteSketch({
  depot,
  stops,
  path,
  vehicle,
}: {
  depot?: Point
  stops: readonly Stop[]
  path?: readonly Point[]
  vehicle?: Point
}) {
  const linePoints = path && path.length > 1 ? path : [...(depot ? [depot] : []), ...stops]
  const all = [...linePoints, ...stops, ...(depot ? [depot] : []), ...(vehicle ? [vehicle] : [])]
  const line = project(linePoints)
  const stopPoints = project(stops)
  const [depotPoint] = depot ? project([depot]) : []
  const [vehiclePoint] = vehicle ? project([vehicle]) : []
  if (all.length === 0) return null

  return (
    <View style={styles.frame} accessibilityElementsHidden>
      <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        {line.length > 1 ? (
          <Polyline
            points={line.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {depotPoint ? (
          <Rect x={depotPoint.x - RADIUS} y={depotPoint.y - RADIUS} width={RADIUS * 2} height={RADIUS * 2} rx={5} fill={colors.text} />
        ) : null}
        {stops.map((stop, index) => {
          const point = stopPoints[index]
          if (!point) return null
          return (
            <Circle key={stop.id} cx={point.x} cy={point.y} r={RADIUS} fill={stopColor(stop.number)} />
          )
        })}
        {stops.map((stop, index) => {
          const point = stopPoints[index]
          if (!point) return null
          return (
            <SvgText
              key={`${stop.id}-n`}
              x={point.x}
              y={point.y + 3.5}
              textAnchor="middle"
              fontSize={11}
              fontWeight="700"
              fill={stopForeground(stop.number)}>
              {String(stop.number)}
            </SvgText>
          )
        })}
        {vehiclePoint ? (
          <>
            <Circle cx={vehiclePoint.x} cy={vehiclePoint.y} r={RADIUS + 1} fill={colors.bg} stroke={colors.primary} strokeWidth={2} />
            <Circle cx={vehiclePoint.x} cy={vehiclePoint.y} r={4} fill={colors.primary} />
          </>
        ) : null}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { height: HEIGHT, overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
})
