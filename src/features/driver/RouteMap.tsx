import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'

import { colors, radius } from '@/theme/tokens'

import { goongMapTilesKey } from './map-style'
import { RouteSketch } from './RouteSketch'
import { routeMapHtml, routeMapPayload, type RouteMapView } from './route-map-html'

const HEIGHT = 220

/**
 * Bản đồ tuyến trong app (như `RouteMap` của web): MapLibre + nền Goong tiles. Không khoá thì nền trống, vẫn vẽ tuyến.
 * WebView có trong Expo Go; MapLibre Native thì không. WebGL lỗi thì sơ đồ SVG.
 */
export function RouteMap({
  label,
  depot,
  stops,
  path,
  vehicle,
}: RouteMapView & { readonly label: string }) {
  const [unavailable, setUnavailable] = useState(false)
  const webRef = useRef<WebView>(null)
  const staticKey = JSON.stringify({ depot, stops, path })
  const html = useMemo(() => {
    const data = JSON.parse(staticKey) as Pick<RouteMapView, 'depot' | 'stops' | 'path'>
    return routeMapHtml(routeMapPayload(data, goongMapTilesKey()))
  }, [staticKey])
  const vehicleJs = vehicle
    ? `window.__lmVehicle && window.__lmVehicle(${vehicle.lng},${vehicle.lat}); true;`
    : 'window.__lmVehicle && window.__lmVehicle(null); true;'

  useEffect(() => {
    webRef.current?.injectJavaScript?.(vehicleJs)
  }, [vehicleJs])

  if (stops.length === 0 && depot === undefined) return null
  if (unavailable) {
    return <RouteSketch depot={depot} stops={stops} path={path} vehicle={vehicle} />
  }

  return (
    <View accessible accessibilityLabel={label} accessibilityRole="image" style={styles.frame}>
      <WebView
        ref={webRef}
        source={{ html }}
        originWhitelist={['*']}
        style={styles.web}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        onError={() => setUnavailable(true)}
        onHttpError={() => setUnavailable(true)}
        onMessage={(event) => {
          if (event.nativeEvent.data === 'ready') webRef.current?.injectJavaScript?.(vehicleJs)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { height: HEIGHT, overflow: 'hidden', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.lineSoft },
  web: { flex: 1, backgroundColor: 'transparent' },
})
