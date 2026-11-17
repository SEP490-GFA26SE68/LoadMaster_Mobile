import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
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
  const [webBlobUrl, setWebBlobUrl] = useState<string | null>(null)
  const webRef = useRef<WebView>(null)
  const iframeRef = useRef<{ contentWindow?: { __lmVehicle?: (lng: number | null, lat?: number) => void } } | null>(null)
  const staticKey = JSON.stringify({ depot, stops, path })
  const html = useMemo(() => {
    const data = JSON.parse(staticKey) as Pick<RouteMapView, 'depot' | 'stops' | 'path'>
    return routeMapHtml(routeMapPayload(data, goongMapTilesKey()))
  }, [staticKey])
  const vehicleJs = vehicle
    ? `window.__lmVehicle && window.__lmVehicle(${vehicle.lng},${vehicle.lat}); true;`
    : 'window.__lmVehicle && window.__lmVehicle(null); true;'

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof URL === 'undefined' || typeof Blob === 'undefined') return
    // Blob URL inherits the app's origin (unlike iframe srcDoc whose origin is "null"),
    // so MapLibre's Actor origin check accepts messages between main thread and Web Worker.
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html; charset=utf-8' }))
    setWebBlobUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [html])

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (vehicle) iframeRef.current?.contentWindow?.__lmVehicle?.(vehicle.lng, vehicle.lat)
      else iframeRef.current?.contentWindow?.__lmVehicle?.(null)
      return
    }
    webRef.current?.injectJavaScript?.(vehicleJs)
  }, [vehicle, vehicleJs])

  if (stops.length === 0 && depot === undefined) return null
  if (unavailable) {
    return <RouteSketch depot={depot} stops={stops} path={path} vehicle={vehicle} />
  }

  if (Platform.OS === 'web') {
    return (
      <View accessible accessibilityLabel={label} accessibilityRole="image" style={styles.frame}>
        {webBlobUrl
          ? createElement('iframe', {
              ref: iframeRef,
              src: webBlobUrl,
              style: { width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent' },
              title: label,
            })
          : null}
      </View>
    )
  }

  return (
    <View accessible accessibilityLabel={label} accessibilityRole="image" style={styles.frame}>
      <WebView
        ref={webRef}
        source={{ html, baseUrl: 'https://tiles.goong.io/' }}
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
