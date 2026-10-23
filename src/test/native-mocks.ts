import { createElement } from 'react'
import { View, type ViewProps } from 'react-native'

/**
 * Bản chạy trong Node của các module native mà màn tài xế dùng — `src/test/setup.ts` nối chúng vào `jest.mock`, test điều khiển chúng qua
 * các hàm dưới đây. Mỗi file test có một bản riêng; `resetNativeMocks()` đưa về mặc định (camera và vị trí đã được cấp quyền).
 */

type Permission = { readonly granted: boolean; readonly canAskAgain: boolean; readonly status: 'granted' | 'denied'; readonly expires: 'never' }
type Coords = { readonly latitude: number; readonly longitude: number; readonly speed: number | null; readonly heading: number | null }
type Watcher = { readonly callback: (location: { coords: Coords; timestamp: number }) => void; readonly onError: ((reason: string) => void) | undefined }

const permission = (granted: boolean, canAskAgain = true): Permission => ({ granted, canAskAgain, status: granted ? 'granted' : 'denied', expires: 'never' })

const state = {
  camera: permission(true) as Permission | null,
  locationServices: true,
  locationGranted: true,
  watchers: new Set<Watcher>(),
}

export function resetNativeMocks(): void {
  state.camera = permission(true)
  state.locationServices = true
  state.locationGranted = true
  state.watchers.clear()
}

/** Quyền camera lúc màn mở; `null` là máy chưa trả lời. */
export function setCameraPermission(granted: boolean | null, canAskAgain = true): void {
  state.camera = granted === null ? null : permission(granted, canAskAgain)
}

/** Định vị của máy có bật không, và người dùng có cấp quyền vị trí khi được hỏi không. */
export function setLocation({ services = true, granted = true }: { services?: boolean; granted?: boolean }): void {
  state.locationServices = services
  state.locationGranted = granted
}

/** Số lượt theo dõi vị trí đang mở: màn dừng GPS thì về 0. */
export function locationWatchers(): number {
  return state.watchers.size
}

/** Máy báo một vị trí mới cho mọi lượt theo dõi đang mở. */
export function emitPosition(coords: Coords): void {
  for (const watcher of state.watchers) watcher.callback({ coords, timestamp: Date.now() })
}

/** Máy mất tín hiệu vị trí. */
export function failPosition(reason = 'lost'): void {
  for (const watcher of state.watchers) watcher.onError?.(reason)
}

export const expoCamera = {
  /** Khung camera là một `View` mang đủ prop: test gửi mã bằng `fireEvent(camera, 'barcodeScanned', { data })`. */
  CameraView: (props: ViewProps) => createElement(View, { ...props, testID: 'qr-camera' }),
  useCameraPermissions: () => [state.camera, async () => state.camera, async () => state.camera] as const,
}

export const expoLocation = {
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6 },
  hasServicesEnabledAsync: async () => state.locationServices,
  requestForegroundPermissionsAsync: async () => permission(state.locationGranted),
  getForegroundPermissionsAsync: async () => permission(state.locationGranted),
  watchPositionAsync: async (_options: unknown, callback: Watcher['callback'], onError?: (reason: string) => void) => {
    const watcher: Watcher = { callback, onError }
    state.watchers.add(watcher)
    return { remove: () => void state.watchers.delete(watcher) }
  },
}

/** Bộ điều hướng giả: test kiểm màn đã đi đâu bằng `expect(router.push).toHaveBeenCalledWith(…)`. */
export const router = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  dismissTo: jest.fn(),
  dismissAll: jest.fn(),
  canDismiss: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
}

export const expoRouter = {
  router,
  useRouter: () => router,
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}
