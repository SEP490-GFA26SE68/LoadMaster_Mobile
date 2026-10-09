/**
 * Chạy trước mỗi file test. Hai module native được thay bằng bản chạy trong Node:
 * - `expo-secure-store` (kho khoá của máy): một bảng trong bộ nhớ, xoá giữa các test bằng `clearStored()` của `@/test/render`;
 * - `expo-crypto`: `crypto` có sẵn của Node.
 */
jest.mock('expo-secure-store', () => {
  const mockStored = new Map<string, string>()
  ;(globalThis as { clearStoredForTest?: () => void }).clearStoredForTest = () => mockStored.clear()
  return {
    getItemAsync: async (key: string) => mockStored.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void mockStored.set(key, value),
    deleteItemAsync: async (key: string) => void mockStored.delete(key),
  }
})

jest.mock('expo-crypto', () => ({
  getRandomValues: <T extends ArrayBufferView>(array: T): T => globalThis.crypto.getRandomValues(array as never),
}))
