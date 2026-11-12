import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/**
 * Nơi lưu nhỏ của app (phiên đăng nhập, ngôn ngữ): kho khoá của hệ điều hành qua `expo-secure-store`. Bản xem thử trên trình duyệt
 * (`pnpm web`, chỉ để dev) không có kho đó nên dùng `sessionStorage`. Không lưu dữ liệu nghiệp vụ ở đây.
 *
 * Kho khoá có thể từ chối (máy vừa khôi phục, khoá của hệ điều hành đổi, bộ nhớ đầy): hai hàm không ném lỗi mà **ghi log và trả kết quả**,
 * để nơi gọi quyết định có phải báo người dùng không — mất phiên đăng nhập thì phải báo, mất lựa chọn ngôn ngữ thì không.
 */
const KEY_PREFIX = 'loadmaster.'

/** Kết quả đọc: `ok` sai là kho khoá từ chối — khác với "chưa lưu gì" (`value` là `null`). */
export type StoredRead = { readonly ok: true; readonly value: string | null } | { readonly ok: false }

function webStorage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

function warn(action: 'read' | 'write', key: string, error: unknown): void {
  console.warn(`[LoadMaster] secure store refused to ${action} "${key}":`, error)
}

export async function readStored(key: string): Promise<StoredRead> {
  try {
    if (Platform.OS === 'web') return { ok: true, value: webStorage()?.getItem(KEY_PREFIX + key) ?? null }
    return { ok: true, value: await SecureStore.getItemAsync(KEY_PREFIX + key) }
  } catch (error) {
    warn('read', key, error)
    return { ok: false }
  }
}

/** Trả `false` khi kho khoá từ chối: giá trị chỉ sống tới lần mở app kế tiếp (với `null`: giá trị cũ còn nằm trên máy). */
export async function writeStored(key: string, value: string | null): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (value === null) webStorage()?.removeItem(KEY_PREFIX + key)
      else webStorage()?.setItem(KEY_PREFIX + key, value)
    } else if (value === null) await SecureStore.deleteItemAsync(KEY_PREFIX + key)
    else await SecureStore.setItemAsync(KEY_PREFIX + key, value)
    return true
  } catch (error) {
    warn('write', key, error)
    return false
  }
}
