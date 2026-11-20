import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, X } from 'lucide-react-native'
import { Modal, Platform, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'

import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { useT } from '@/lib/i18n'
import { colors, radius, space } from '@/theme/tokens'

import { goongMapTilesKey } from './map-style'
import { RouteSketch } from './RouteSketch'
import { routeMapHtml, routeMapPayload, type RouteMapView } from './route-map-html'

const HEIGHT = 220

type SurfaceProps = {
  readonly label: string
  readonly html: string
  readonly fill?: boolean
  readonly vehicle?: RouteMapView['vehicle']
  readonly onUnavailable: () => void
}

/**
 * Một lớp MapLibre (WebView / iframe) hoặc sơ đồ SVG. Tách khỏi nút phóng lớn để modal dựng bản đồ thứ hai, không đụng WebView bản
 * thu nhỏ — và overlay nút không nằm trong `overflow: hidden` của khung (Android WebView hay đè sibling bên trong cùng khung).
 */
function RouteMapSurface({ label, html, fill = false, onUnavailable, vehicle }: SurfaceProps) {
  const [webBlobUrl, setWebBlobUrl] = useState<string | null>(null)
  const webRef = useRef<WebView>(null)
  const iframeRef = useRef<{ contentWindow?: { __lmVehicle?: (lng: number | null, lat?: number, heading?: number) => void } } | null>(null)
  const vehicleJs = vehicle
    ? `window.__lmVehicle && window.__lmVehicle(${vehicle.lng},${vehicle.lat},${vehicle.heading ?? 'null'}); true;`
    : 'window.__lmVehicle && window.__lmVehicle(null); true;'
  const frameStyle = fill ? styles.fillFrame : styles.frame

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof URL === 'undefined' || typeof Blob === 'undefined') return
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html; charset=utf-8' }))
    setWebBlobUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [html])

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (vehicle) iframeRef.current?.contentWindow?.__lmVehicle?.(vehicle.lng, vehicle.lat, vehicle.heading)
      else iframeRef.current?.contentWindow?.__lmVehicle?.(null)
      return
    }
    webRef.current?.injectJavaScript?.(vehicleJs)
  }, [vehicle, vehicleJs])

  if (Platform.OS === 'web') {
    return (
      <View accessible accessibilityLabel={label} accessibilityRole="image" style={frameStyle}>
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
    <View accessible accessibilityLabel={label} accessibilityRole="image" style={frameStyle}>
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
        onError={onUnavailable}
        onHttpError={onUnavailable}
        onMessage={(event) => {
          if (event.nativeEvent.data === 'ready') webRef.current?.injectJavaScript?.(vehicleJs)
        }}
      />
    </View>
  )
}

/**
 * Bản đồ tuyến trong app (như `RouteMap` của web): MapLibre + nền Goong tiles. Không khoá thì nền trống, vẫn vẽ tuyến.
 * WebView có trong Expo Go; MapLibre Native thì không. WebGL lỗi thì sơ đồ SVG.
 * Nút Maximize2 trên khung (và trên sơ đồ SVG) mở modal bản đồ lớn — mọi chỗ dùng `RouteMap` đều có.
 */
export function RouteMap({
  label,
  depot,
  stops,
  path,
  vehicle,
}: RouteMapView & { readonly label: string }) {
  const t = useT()
  const insets = useSafeAreaInsets()
  const [unavailable, setUnavailable] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const staticKey = JSON.stringify({ depot, stops, path })
  const html = useMemo(() => {
    const data = JSON.parse(staticKey) as Pick<RouteMapView, 'depot' | 'stops' | 'path'>
    return routeMapHtml(routeMapPayload(data, goongMapTilesKey()))
  }, [staticKey])

  if (stops.length === 0 && depot === undefined) return null

  const sketch = <RouteSketch depot={depot} stops={stops} path={path} vehicle={vehicle} />
  const preview = unavailable ? (
    <View accessible accessibilityLabel={label} accessibilityRole="image" style={styles.frame}>
      {sketch}
    </View>
  ) : (
    <RouteMapSurface label={label} html={html} vehicle={vehicle} onUnavailable={() => setUnavailable(true)} />
  )

  return (
    <>
      <View style={styles.wrap}>
        {preview}
        <View style={styles.expand} collapsable={false} pointerEvents="box-none">
          <IconButton icon={Maximize2} label={t('driver.guidance.expand')} onPress={() => setExpanded(true)} />
        </View>
      </View>

      <Modal
        visible={expanded}
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View
          style={[styles.modal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          accessibilityViewIsModal
        >
          <View style={styles.modalHead}>
            <AppText variant="title" accessibilityRole="header" style={styles.modalTitle}>
              {t('driver.guidance.expandTitle')}
            </AppText>
            <IconButton icon={X} label={t('common.close')} onPress={() => setExpanded(false)} />
          </View>
          <View style={styles.modalMap}>
            {unavailable ? (
              <View
                accessible
                accessibilityLabel={t('driver.guidance.expandMap', { label })}
                accessibilityRole="image"
                style={styles.fillFrame}
              >
                {sketch}
              </View>
            ) : (
              <RouteMapSurface
                label={t('driver.guidance.expandMap', { label })}
                html={html}
                fill
                vehicle={vehicle}
                onUnavailable={() => setUnavailable(true)}
              />
            )}
          </View>
          <View style={styles.modalFooter}>
            <Button variant="secondary" onPress={() => setExpanded(false)}>
              {t('common.close')}
            </Button>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  frame: { height: HEIGHT, overflow: 'hidden', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.lineSoft },
  fillFrame: { flex: 1, overflow: 'hidden', backgroundColor: colors.lineSoft },
  web: { flex: 1, backgroundColor: 'transparent' },
  expand: { position: 'absolute', top: space[2], right: space[2], zIndex: 2, elevation: 8 },
  modal: { flex: 1, backgroundColor: colors.bg },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  modalTitle: { flex: 1 },
  modalMap: { flex: 1, overflow: 'hidden', backgroundColor: colors.lineSoft },
  modalFooter: {
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    backgroundColor: colors.surface,
  },
})
