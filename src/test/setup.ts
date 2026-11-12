/**
 * Chạy trước mỗi file test. Các module native được thay bằng bản chạy trong Node:
 * - `expo-secure-store` (kho khoá của máy): một bảng trong bộ nhớ, xoá giữa các test bằng `clearStored()` của `@/test/render`; `failStored()`
 *   cho kho từ chối đọc hoặc ghi;
 * - `expo-crypto`: `crypto` có sẵn của Node;
 * - `expo-camera`, `expo-location`, `expo-router`: bản giả ở `@/test/native-mocks` — test đặt quyền camera, quyền và tín hiệu vị trí, và
 *   kiểm màn đã điều hướng đi đâu;
 * - `react-native-webview`: một `View` (Jest không có WebGL).
 */
jest.mock('expo-secure-store', () => {
  const mockStored = new Map<string, string>()
  const mockFailing = new Set<'read' | 'write'>()
  const store = globalThis as { clearStoredForTest?: () => void; failStoredForTest?: (ops: readonly ('read' | 'write')[]) => void }
  store.clearStoredForTest = () => {
    mockStored.clear()
    mockFailing.clear()
  }
  store.failStoredForTest = (ops) => ops.forEach((op) => mockFailing.add(op))
  const guard = (op: 'read' | 'write') => {
    if (mockFailing.has(op)) throw new Error('kho khoá giả từ chối')
  }
  return {
    getItemAsync: async (key: string) => {
      guard('read')
      return mockStored.get(key) ?? null
    },
    setItemAsync: async (key: string, value: string) => {
      guard('write')
      mockStored.set(key, value)
    },
    deleteItemAsync: async (key: string) => {
      guard('write')
      mockStored.delete(key)
    },
  }
})

jest.mock('expo-crypto', () => ({
  getRandomValues: <T extends ArrayBufferView>(array: T): T => globalThis.crypto.getRandomValues(array as never),
}))

jest.mock('expo-camera', () => jest.requireActual<typeof import('./native-mocks')>('./native-mocks').expoCamera)
jest.mock('expo-location', () => jest.requireActual<typeof import('./native-mocks')>('./native-mocks').expoLocation)
jest.mock('expo-router', () => jest.requireActual<typeof import('./native-mocks')>('./native-mocks').expoRouter)
jest.mock('react-native-webview', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react')
  const { View } = jest.requireActual<typeof import('react-native')>('react-native')
  const WebView = (props: object) => createElement(View, props)
  return { WebView }
})
