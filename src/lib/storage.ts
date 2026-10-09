import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/**
 * Nơi lưu nhỏ của app (phiên đăng nhập, ngôn ngữ): kho khoá của hệ điều hành qua `expo-secure-store`. Bản xem thử trên trình duyệt
 * (`pnpm web`, chỉ để dev) không có kho đó nên dùng `sessionStorage`. Không lưu dữ liệu nghiệp vụ ở đây.
 */
const KEY_PREFIX = 'loadmaster.'

function webStorage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

export async function readStored(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return webStorage()?.getItem(KEY_PREFIX + key) ?? null
    return await SecureStore.getItemAsync(KEY_PREFIX + key)
  } catch {
    // Không đọc được thì coi như chưa lưu gì: người dùng đăng nhập lại.
    return null
  }
}

export async function writeStored(key: string, value: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (value === null) webStorage()?.removeItem(KEY_PREFIX + key)
      else webStorage()?.setItem(KEY_PREFIX + key, value)
    } else if (value === null) await SecureStore.deleteItemAsync(KEY_PREFIX + key)
    else await SecureStore.setItemAsync(KEY_PREFIX + key, value)
  } catch {
    // Không lưu được thì lựa chọn chỉ sống tới lần mở app kế tiếp.
  }
}
