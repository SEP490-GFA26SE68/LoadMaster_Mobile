import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import * as Location from 'expo-location'
import { useCallback, useEffect, useState } from 'react'

import { isTransientError } from '@/data/http'

import { postLocation, setDriverGps } from './driver-api'
import type { LocationRequest } from './driver-model'
import { locationInput } from './location-input'
import { driverKeys } from './useDriverQueries'

/** Nhịp gửi vị trí của điện thoại tài xế: 30 giây, bằng nhịp ghi vị trí của kho (như web). */
export const GPS_SEND_INTERVAL_MS = 30_000

/** Nhịp đọc GPS trên máy cho camera bám xe — gửi lên máy chủ vẫn 30 giây. */
export const GPS_WATCH_INTERVAL_MS = 1_000

/** Android: thêm điểm khi xe đi được khoảng này, dù chưa hết nhịp thời gian. */
export const GPS_WATCH_DISTANCE_M = 5

/** Gửi lỗi vì mạng hay máy chủ tạm thời: thử lại sau 30, 60 rồi tối đa 120 giây, vẫn giữ GPS bật. */
export const GPS_RETRY_MAX_MS = 120_000

/** Lỗi đi qua được khi thử lại: mất mạng, hết giờ, máy chủ lỗi hoặc quá tải. Lỗi khác (chuyến không còn chạy, nguồn từ chối) tắt GPS. */
export const isTransientGpsError: (error: unknown) => boolean = isTransientError

/** Lần thử lại thứ `failures` cách lần lỗi bao lâu. */
export const gpsRetryDelayMs = (failures: number) => Math.min(GPS_SEND_INTERVAL_MS * 2 ** Math.max(0, failures - 1), GPS_RETRY_MAX_MS)

/** Vì sao GPS thật đang tắt: tài xế tắt, chưa được cấp quyền, định vị của máy tắt, mất tín hiệu, hoặc nguồn dữ liệu từ chối điểm vị trí. */
export type GpsStopReason = 'user' | 'denied' | 'servicesOff' | 'lost' | 'error'

export type DeviceLocationState =
  | { readonly status: 'off'; readonly reason?: GpsStopReason; readonly error?: unknown }
  /** Đã bật, đang chờ quyền vị trí và điểm GPS đầu tiên. */
  | { readonly status: 'requesting' }
  /** Đang gửi; `sentAt` là giờ nguồn ghi điểm vị trí gần nhất. */
  | { readonly status: 'active'; readonly sentAt: string }
  /** Vẫn bật nhưng lần gửi gần nhất lỗi tạm thời; `sentAt` là lần gửi được gần nhất (nếu có). */
  | { readonly status: 'retrying'; readonly sentAt?: string; readonly error: unknown }

/** Điểm GPS mới nhất trên máy — bản đồ và chỉ đường dùng chung, không gọi hook lần hai. */
export type DeviceGpsPoint = { readonly lat: number; readonly lng: number; readonly heading: number; readonly speedKmh?: number }

export type DeviceLocationControls = {
  readonly enabled: boolean
  readonly state: DeviceLocationState
  readonly toggle: (next: boolean) => void
  readonly latest: DeviceGpsPoint | null
}

type GpsSession = {
  tripId: string
  enabled: boolean
  state: DeviceLocationState
  latest: DeviceGpsPoint | null
  client: QueryClient | null
  readonly listeners: Set<() => void>
  stopWatch: (() => void) | null
}

const sessions = new Map<string, GpsSession>()

function notify(session: GpsSession) {
  for (const listener of session.listeners) listener()
}

function sessionOf(tripId: string): GpsSession {
  const existing = sessions.get(tripId)
  if (existing) return existing
  const created: GpsSession = {
    tripId,
    enabled: false,
    state: { status: 'off' },
    latest: null,
    client: null,
    listeners: new Set(),
    stopWatch: null,
  }
  sessions.set(tripId, created)
  return created
}

function beginWatch(session: GpsSession) {
  session.stopWatch?.()
  let pending: LocationRequest | null = null
  let stopped = false
  let announced = false
  let subscription: Location.LocationSubscription | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let failures = 0
  let retryAt = 0
  let lastSentAt: string | undefined

  const stop = (reason: GpsStopReason, error?: unknown) => {
    if (stopped) return
    stopped = true
    session.enabled = false
    session.latest = null
    session.state = { status: 'off', reason, error }
    session.stopWatch = null
    subscription?.remove()
    subscription = null
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    if (announced) setDriverGps(session.tripId, false).catch(() => undefined)
    notify(session)
  }
  const send = () => {
    const point = pending
    if (point === null || stopped || Date.now() < retryAt) return
    postLocation(session.tripId, point).then(
      ({ recordedAt }) => {
        if (stopped) return
        failures = 0
        retryAt = 0
        lastSentAt = recordedAt
        session.state = { status: 'active', sentAt: recordedAt }
        notify(session)
        void session.client?.invalidateQueries({ queryKey: driverKeys.all })
      },
      (error: unknown) => {
        if (stopped) return
        if (!isTransientGpsError(error)) return stop('error', error)
        failures += 1
        retryAt = Date.now() + gpsRetryDelayMs(failures)
        session.state = { status: 'retrying', sentAt: lastSentAt, error }
        notify(session)
      },
    )
  }

  async function start() {
    if (!(await Location.hasServicesEnabledAsync())) return stop('servicesOff')
    const permission = await Location.requestForegroundPermissionsAsync()
    if (stopped) return
    if (!permission.granted) return stop('denied')
    announced = true
    await setDriverGps(session.tripId, true)
    if (stopped) return
    const watch = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: GPS_WATCH_INTERVAL_MS, distanceInterval: GPS_WATCH_DISTANCE_M },
      ({ coords }) => {
        const first = pending === null
        pending = locationInput(coords)
        session.latest = { lat: pending.lat, lng: pending.lng, heading: pending.heading ?? 0, speedKmh: pending.speedKmh }
        notify(session)
        if (first) send()
      },
      () => stop('lost'),
    )
    if (stopped) {
      watch.remove()
      return
    }
    subscription = watch
    timer = setInterval(send, GPS_SEND_INTERVAL_MS)
    if (typeof timer === 'object' && timer !== null && 'unref' in timer) (timer as { unref: () => void }).unref()
  }

  session.stopWatch = () => stop('user')
  start().catch((error: unknown) => stop('error', error))
}

function setEnabled(session: GpsSession, next: boolean) {
  if (next) {
    session.enabled = true
    session.state = { status: 'requesting' }
    notify(session)
    beginWatch(session)
    return
  }
  session.stopWatch?.()
  session.stopWatch = null
  session.enabled = false
  session.latest = null
  session.state = { status: 'off', reason: 'user' }
  notify(session)
}

/** Test: mỗi file đưa phiên GPS về trống, cùng lúc với `resetNativeMocks`. */
export function resetDeviceLocationSessions() {
  for (const session of [...sessions.values()]) {
    session.stopWatch?.()
    session.listeners.clear()
  }
  sessions.clear()
}

;(globalThis as { resetGpsForTest?: () => void }).resetGpsForTest = resetDeviceLocationSessions

/**
 * "Dùng GPS thật" của tài xế (như `useDeviceLocation` của web, dùng `expo-location`). Bật: kiểm định vị của máy, xin quyền vị trí khi dùng
 * app, báo nguồn dữ liệu (kho mẫu cho đồng hồ mô phỏng chạy theo giờ thật), theo dõi vị trí, gửi điểm đầu tiên ngay rồi vị trí mới nhất mỗi
 * 30 giây; mất mạng hay máy chủ lỗi tạm thời thì giữ bật và thử lại giãn dần (`gpsRetryDelayMs`). Tài xế tắt, chưa được cấp quyền, định vị tắt, mất tín hiệu hoặc nguồn từ chối điểm vị trí: thôi theo dõi, báo nguồn, kèm lý do
 * để màn nói ra. Mọi màn cùng một chuyến (điểm giao và chi tiết) dùng chung một phiên — không POST hai lần. Rời hết màn chuyến thì dừng.
 * App chỉ gửi vị trí khi đang mở — không theo dõi nền.
 * `latest` là điểm vừa watch (bản đồ / chỉ đường); gửi lên máy chủ vẫn chỉ mỗi 30 giây.
 */
export function useDeviceLocation(tripId: string): DeviceLocationControls {
  const client = useQueryClient()
  const session = sessionOf(tripId)
  session.client = client
  const [snap, setSnap] = useState(() => ({
    enabled: session.enabled,
    state: session.state,
    latest: session.latest,
  }))

  useEffect(() => {
    const current = sessionOf(tripId)
    current.client = client
    const onChange = () =>
      setSnap({ enabled: current.enabled, state: current.state, latest: current.latest })
    current.listeners.add(onChange)
    return () => {
      current.listeners.delete(onChange)
      if (current.listeners.size === 0) {
        current.stopWatch?.()
        current.stopWatch = null
        current.enabled = false
        current.latest = null
        current.state = { status: 'off' }
        sessions.delete(tripId)
      }
    }
  }, [tripId, client])

  const toggle = useCallback((next: boolean) => setEnabled(sessionOf(tripId), next), [tripId])

  return {
    enabled: snap.enabled,
    state: snap.state,
    latest: snap.latest,
    toggle,
  }
}

/**
 * Chuyến đang giao: bật GPS ngay để giám sát thấy xe — không chờ tài xế bấm công tắc. Đã tắt tay, bị từ chối quyền, hoặc định vị máy tắt
 * thì không tự bật lại.
 */
export function useStartGpsWhenDelivering(active: boolean, allowed: boolean, gps: DeviceLocationControls) {
  const { enabled, state, toggle } = gps
  useEffect(() => {
    if (!active || !allowed || enabled) return
    if (state.status !== 'off') return
    if (state.reason !== undefined) return
    toggle(true)
  }, [active, allowed, enabled, state.status, state.reason, toggle])
}
