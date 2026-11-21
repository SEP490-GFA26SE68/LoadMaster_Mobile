import { createElement, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { LocateFixed, Maximize2, Volume2, VolumeX } from 'lucide-react-native'
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

/** Phần của khung iframe (bản web) mà bản đồ dùng: đặt `src` là Blob URL và gọi hàm đặt vị trí xe trong khung. */
type WebMapFrame = {
  setAttribute(name: 'src', value: string): void
  readonly contentWindow?: {
    __lmVehicle?: (lng: number | null, lat?: number, heading?: number) => void
    __lmFollow?: () => void
  } | null
}

const HEIGHT = 220
const NAV_PITCH = 50

export type RouteMapHud = {
  readonly next: string
  readonly then?: string
  readonly remaining?: string
  readonly speed?: string
  readonly voiceMuted?: boolean
  readonly onToggleVoice?: () => void
}

type SurfaceHandle = { readonly recenter: () => void }

type SurfaceProps = {
  readonly label: string
  readonly html: string
  readonly fill?: boolean
  readonly vehicle?: RouteMapView['vehicle']
  readonly onUnavailable: () => void
  readonly onUnfollowed?: () => void
}

/**
 * Một lớp MapLibre (WebView / iframe) hoặc sơ đồ SVG. Tách khỏi nút phóng lớn để modal dựng bản đồ thứ hai, không đụng WebView bản
 * thu nhỏ — và overlay nút không nằm trong `overflow: hidden` của khung (Android WebView hay đè sibling bên trong cùng khung).
 */
const RouteMapSurface = forwardRef<SurfaceHandle, SurfaceProps>(function RouteMapSurface(
  { label, html, fill = false, onUnavailable, onUnfollowed, vehicle },
  ref,
) {
  const webRef = useRef<WebView>(null)
  // Khung iframe của bản web, nhận qua ref callback (giữ trong state để hiệu ứng chạy lại khi khung gắn vào)
  const [frame, setFrame] = useState<WebMapFrame | null>(null)
  const vehicleJs = vehicle
    ? `window.__lmVehicle && window.__lmVehicle(${vehicle.lng},${vehicle.lat},${vehicle.heading ?? 'null'}); true;`
    : 'window.__lmVehicle && window.__lmVehicle(null); true;'
  const frameStyle = fill ? styles.fillFrame : styles.frame

  useImperativeHandle(
    ref,
    () => ({
      recenter: () => {
        if (Platform.OS === 'web') {
          frame?.contentWindow?.__lmFollow?.()
          return
        }
        webRef.current?.injectJavaScript?.('window.__lmFollow && window.__lmFollow(); true;')
      },
    }),
    [frame],
  )

  useEffect(() => {
    if (frame === null || typeof URL === 'undefined' || typeof Blob === 'undefined') return
    // Blob URL inherits the app's origin (unlike iframe srcDoc whose origin is "null"),
    // so MapLibre's Actor origin check accepts messages between main thread and Web Worker.
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html; charset=utf-8' }))
    frame.setAttribute('src', url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [frame, html])

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (vehicle) frame?.contentWindow?.__lmVehicle?.(vehicle.lng, vehicle.lat, vehicle.heading)
      else frame?.contentWindow?.__lmVehicle?.(null)
      return
    }
    webRef.current?.injectJavaScript?.(vehicleJs)
  }, [frame, vehicle, vehicleJs])

  useEffect(() => {
    if (Platform.OS !== 'web') return
    const onMessage = (event: MessageEvent) => {
      if (event.data === 'unfollowed') onUnfollowed?.()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onUnfollowed])

  const onFrameMessage = (data: string) => {
    if (data === 'ready') webRef.current?.injectJavaScript?.(vehicleJs)
    if (data === 'unfollowed') onUnfollowed?.()
  }

  if (Platform.OS === 'web') {
    return (
      <View accessible accessibilityLabel={label} accessibilityRole="image" style={frameStyle}>
        {createElement('iframe', {
          ref: setFrame,
          style: { width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent' },
          title: label,
        })}
      </View>
    )
  }

  return (
    <View accessible accessibilityLabel={label} accessibilityRole="image" style={frameStyle}>
      <WebView
        ref={webRef}
        testID={fill ? 'route-map-nav' : 'route-map'}
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
        onMessage={(event) => onFrameMessage(event.nativeEvent.data)}
      />
    </View>
  )
})

function NavHud({ hud }: { readonly hud: RouteMapHud }) {
  const t = useT()
  return (
    <View style={styles.hud}>
      <View style={styles.hudCard}>
        <View style={styles.hudRow}>
          <AppText variant="title" color={colors.onPrimary} style={styles.hudNext}>
            {hud.next}
          </AppText>
          {hud.onToggleVoice ? (
            <IconButton
              icon={hud.voiceMuted ? VolumeX : Volume2}
              tone="sky"
              label={hud.voiceMuted ? t('driver.guidance.unmute') : t('driver.guidance.mute')}
              onPress={hud.onToggleVoice}
            />
          ) : null}
        </View>
        {hud.then === undefined ? null : (
          <AppText variant="label" color={colors.onPrimary}>
            {hud.then}
          </AppText>
        )}
        {hud.remaining === undefined ? null : (
          <AppText variant="label" color={colors.onPrimary}>
            {hud.remaining}
          </AppText>
        )}
      </View>
    </View>
  )
}

function NavFooter({ hud, detached, onRecenter }: { readonly hud?: RouteMapHud; readonly detached: boolean; readonly onRecenter: () => void }) {
  const t = useT()
  if (hud?.speed === undefined && !detached) return null
  return (
    <View style={styles.navFooter}>
      {hud?.speed !== undefined ? (
        <View style={styles.speedChip}>
          <AppText variant="title">{hud.speed}</AppText>
        </View>
      ) : (
        <View />
      )}
      {detached ? (
        <Button icon={LocateFixed} variant="secondary" onPress={onRecenter}>
          {t('driver.guidance.recenter')}
        </Button>
      ) : null}
    </View>
  )
}

/**
 * Bản đồ tuyến trong app (như `RouteMap` của web): MapLibre + nền Goong tiles. Không khoá thì nền trống, vẫn vẽ tuyến.
 * WebView có trong Expo Go; MapLibre Native thì không. WebGL lỗi thì sơ đồ SVG.
 * Nút Maximize2 trên khung (và trên sơ đồ SVG) mở modal bản đồ lớn — mọi chỗ dùng `RouteMap` đều có.
 * `followVehicle`: camera bám xe, heading-up; kéo map thì hiện “Về giữa”.
 * HUD / tốc độ nằm ngoài WebView. Android: chỉ một WebView lúc một thời điểm (thu nhỏ XOR modal) — hai lớp phần cứng kẹt sau Đóng.
 */
export function RouteMap({
  label,
  depot,
  stops,
  path,
  vehicle,
  followVehicle = false,
  hud,
}: RouteMapView & { readonly label: string; readonly followVehicle?: boolean; readonly hud?: RouteMapHud }) {
  const t = useT()
  const insets = useSafeAreaInsets()
  const previewRef = useRef<SurfaceHandle>(null)
  const expandedRef = useRef<SurfaceHandle>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [detached, setDetached] = useState(false)
  const staticKey = JSON.stringify({ depot, stops, path, follow: followVehicle })
  const html = useMemo(() => {
    const data = JSON.parse(staticKey) as Pick<RouteMapView, 'depot' | 'stops' | 'path'> & { follow: boolean }
    return routeMapHtml(routeMapPayload(data, goongMapTilesKey(), { follow: data.follow }))
  }, [staticKey])
  const navHtml = useMemo(() => {
    const data = JSON.parse(staticKey) as Pick<RouteMapView, 'depot' | 'stops' | 'path'> & { follow: boolean }
    return routeMapHtml(routeMapPayload(data, goongMapTilesKey(), { follow: data.follow, pitch: data.follow ? NAV_PITCH : undefined, navigation: true }))
  }, [staticKey])

  const closeExpanded = () => setExpanded(false)
  const recenter = () => {
    if (expanded) expandedRef.current?.recenter()
    else previewRef.current?.recenter()
    setDetached(false)
  }

  if (stops.length === 0 && depot === undefined) return null

  const sketch = <RouteSketch depot={depot} stops={stops} path={path} vehicle={vehicle} />
  const preview = unavailable ? (
    <View accessible accessibilityLabel={label} accessibilityRole="image" style={styles.frame}>
      {sketch}
    </View>
  ) : (
    <RouteMapSurface
      ref={previewRef}
      label={label}
      html={html}
      vehicle={vehicle}
      onUnavailable={() => setUnavailable(true)}
      onUnfollowed={() => setDetached(true)}
    />
  )

  const chrome = followVehicle || hud !== undefined

  return (
    <>
      <View>
        {expanded || !hud ? null : <NavHud hud={hud} />}
        <View style={styles.wrap}>
          {expanded ? <View style={styles.frame} /> : preview}
          {expanded ? null : (
            <View style={styles.expand} collapsable={false} pointerEvents="box-none">
              <IconButton icon={Maximize2} label={t('driver.guidance.expand')} onPress={() => setExpanded(true)} />
            </View>
          )}
        </View>
        {expanded || !chrome ? null : <NavFooter hud={hud} detached={followVehicle && detached} onRecenter={recenter} />}
      </View>

      {expanded ? (
        <Modal visible animationType="fade" onRequestClose={closeExpanded} statusBarTranslucent navigationBarTranslucent>
          <View
            style={[styles.modal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
            accessibilityViewIsModal
          >
            <View style={styles.modalHead}>
              <AppText variant="title" accessibilityRole="header" style={styles.modalTitle}>
                {t('driver.guidance.expandTitle')}
              </AppText>
            </View>
            {hud ? <NavHud hud={hud} /> : null}
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
                  ref={expandedRef}
                  label={t('driver.guidance.expandMap', { label })}
                  html={navHtml}
                  fill
                  vehicle={vehicle}
                  onUnavailable={() => setUnavailable(true)}
                  onUnfollowed={() => setDetached(true)}
                />
              )}
            </View>
            {chrome ? <NavFooter hud={hud} detached={followVehicle && detached} onRecenter={recenter} /> : null}
            <View style={styles.modalFooter}>
              <Button variant="secondary" onPress={closeExpanded}>
                {t('common.close')}
              </Button>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  frame: { height: HEIGHT, overflow: 'hidden', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.lineSoft },
  fillFrame: { flex: 1, overflow: 'hidden', backgroundColor: colors.lineSoft },
  web: { flex: 1, backgroundColor: 'transparent' },
  expand: { position: 'absolute', top: space[2], right: space[2], zIndex: 2, elevation: 8 },
  hud: { paddingHorizontal: space[2], paddingTop: space[2], paddingBottom: space[2] },
  hudCard: {
    gap: space[1],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.lg,
    backgroundColor: colors.primaryFill,
    borderWidth: 1,
    borderColor: colors.primaryFillBorder,
  },
  hudRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  hudNext: { flex: 1 },
  navFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    paddingHorizontal: space[2],
    paddingTop: space[2],
    paddingBottom: space[2],
  },
  speedChip: {
    minWidth: 72,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
