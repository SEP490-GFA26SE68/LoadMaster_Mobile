import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import type { NetInfoState } from '@react-native-community/netinfo'

import { dataConfig, type Feature } from './config'

type NetInfoApi = {
  addEventListener: (listener: (state: NetInfoState) => void) => () => void
}

/**
 * Gói NetInfo ném ngay lúc nạp nếu native module vắng (Expo Go lệch SDK, chưa rebuild dev client). Không nạp cứng ở đầu file: thiếu
 * module thì coi như có mạng — không khoá nút ghi, không sập app.
 */
function loadNetInfo(): NetInfoApi | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- nạp lúc chạy để bắt được native module null
    const mod = require('@react-native-community/netinfo') as { default?: NetInfoApi } & Partial<NetInfoApi>
    // Gói thật xuất qua `default`; bản giả của gói cho Jest xuất thẳng đối tượng API
    const api = mod.default ?? mod
    return typeof api.addEventListener === 'function' ? (api as NetInfoApi) : null
  } catch {
    return null
  }
}

const NetInfo = loadNetInfo()

/**
 * Máy có mạng hay không. Chỉ tin `isConnected` (có giao diện mạng nào đang nối): `isInternetReachable` dò bằng một địa chỉ ngoài, sai
 * khi máy chủ nằm trong mạng nội bộ không ra Internet. Chưa biết (`null`, lúc mở app) coi là có mạng — không khoá nút ghi vì chưa đo xong.
 */
export function isOnlineState(state: Pick<NetInfoState, 'isConnected'>): boolean {
  return state.isConnected !== false
}

/**
 * Nối `onlineManager` của TanStack Query với NetInfo: mất mạng thì truy vấn đọc thôi thử lại, có mạng lại thì đọc lại ngay. Gọi một lần
 * ở `Providers`; trả hàm gỡ. Native module vắng thì không nối, `onlineManager` giữ mặc định (có mạng).
 */
export function connectNetworkStatus(): () => void {
  if (NetInfo === null) return () => undefined
  onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => setOnline(isOnlineState(state))))
  return () => onlineManager.setEventListener(() => undefined)
}

const subscribe = (listener: () => void) => onlineManager.subscribe(listener)
const snapshot = () => onlineManager.isOnline()

/** Máy đang có mạng (theo `onlineManager`). */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, snapshot)
}

/**
 * Mất mạng có chặn việc của feature này không: chỉ khi feature đọc ghi backend. Kho mẫu nằm ngay trong máy, mất mạng vẫn làm được.
 */
export function useOfflineFor(feature: Feature): boolean {
  const online = useOnline()
  return !online && dataConfig.sources[feature] === 'http'
}
