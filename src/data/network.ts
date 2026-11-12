import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'
import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

import { dataConfig, type Feature } from './config'

/**
 * Máy có mạng hay không. Chỉ tin `isConnected` (có giao diện mạng nào đang nối): `isInternetReachable` dò bằng một địa chỉ ngoài, sai
 * khi máy chủ nằm trong mạng nội bộ không ra Internet. Chưa biết (`null`, lúc mở app) coi là có mạng — không khoá nút ghi vì chưa đo xong.
 */
export function isOnlineState(state: Pick<NetInfoState, 'isConnected'>): boolean {
  return state.isConnected !== false
}

/**
 * Nối `onlineManager` của TanStack Query với NetInfo: mất mạng thì truy vấn đọc thôi thử lại, có mạng lại thì đọc lại ngay. Gọi một lần
 * ở `Providers`; trả hàm gỡ.
 */
export function connectNetworkStatus(): () => void {
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
