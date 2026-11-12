import { useQueryClient } from '@tanstack/react-query'
import * as Location from 'expo-location'
import { useEffect, useState } from 'react'

import { isTransientError } from '@/data/http'

import { postLocation, setDriverGps } from './driver-api'
import type { LocationRequest } from './driver-model'
import { locationInput } from './location-input'
import { driverKeys } from './useDriverQueries'

/** Nhịp gửi vị trí của điện thoại tài xế: 30 giây, bằng nhịp ghi vị trí của kho (như web). */
export const GPS_SEND_INTERVAL_MS = 30_000

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

/**
 * "Dùng GPS thật" của tài xế (như `useDeviceLocation` của web, dùng `expo-location`). Bật: kiểm định vị của máy, xin quyền vị trí khi dùng
 * app, báo nguồn dữ liệu (kho mẫu cho đồng hồ mô phỏng chạy theo giờ thật), theo dõi vị trí, gửi điểm đầu tiên ngay rồi vị trí mới nhất mỗi
 * 30 giây; mất mạng hay máy chủ lỗi tạm thời thì giữ bật và thử lại giãn dần (`gpsRetryDelayMs`). Tài xế tắt, chưa được cấp quyền, định vị tắt, mất tín hiệu hoặc nguồn từ chối điểm vị trí: thôi theo dõi, báo nguồn, kèm lý do
 * để màn nói ra. Rời màn chuyến cũng dừng như vậy. App chỉ gửi vị trí khi đang mở — không theo dõi nền.
 */
export function useDeviceLocation(tripId: string) {
  const client = useQueryClient()
  const [enabled, setEnabled] = useState(false)
  const [state, setState] = useState<DeviceLocationState>({ status: 'off' })

  useEffect(() => {
    if (!enabled) return
    let latest: LocationRequest | null = null
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
      setEnabled(false)
      setState({ status: 'off', reason, error })
    }
    const send = () => {
      const point = latest
      if (point === null || stopped || Date.now() < retryAt) return
      postLocation(tripId, point).then(
        ({ recordedAt }) => {
          if (stopped) return
          failures = 0
          retryAt = 0
          lastSentAt = recordedAt
          setState({ status: 'active', sentAt: recordedAt })
          // Giờ đến dự kiến của các điểm tính lại từ vị trí mới
          void client.invalidateQueries({ queryKey: driverKeys.all })
        },
        (error: unknown) => {
          if (stopped) return
          if (!isTransientGpsError(error)) return stop('error', error)
          failures += 1
          retryAt = Date.now() + gpsRetryDelayMs(failures)
          setState({ status: 'retrying', sentAt: lastSentAt, error })
        },
      )
    }

    async function start() {
      if (!(await Location.hasServicesEnabledAsync())) return stop('servicesOff')
      const permission = await Location.requestForegroundPermissionsAsync()
      if (stopped) return
      if (!permission.granted) return stop('denied')
      announced = true
      await setDriverGps(tripId, true)
      if (stopped) return
      const watch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 10_000, distanceInterval: 0 },
        ({ coords }) => {
          const first = latest === null
          latest = locationInput(coords)
          if (first) send()
        },
        () => stop('lost'),
      )
      // Màn đã gỡ hoặc đã dừng trong lúc chờ: bỏ ngay lượt theo dõi vừa mở
      if (stopped) {
        watch.remove()
        return
      }
      subscription = watch
      timer = setInterval(send, GPS_SEND_INTERVAL_MS)
    }

    start().catch((error: unknown) => stop('error', error))

    return () => {
      stopped = true
      subscription?.remove()
      if (timer !== null) clearInterval(timer)
      // Nguồn thôi chờ GPS: kho mẫu cho xe mô phỏng ghi tiếp, đồng hồ về tốc độ đã đặt
      if (announced) setDriverGps(tripId, false).catch(() => undefined)
    }
  }, [enabled, tripId, client])

  function toggle(next: boolean) {
    setEnabled(next)
    setState(next ? { status: 'requesting' } : { status: 'off', reason: 'user' })
  }

  return { enabled, state, toggle }
}
