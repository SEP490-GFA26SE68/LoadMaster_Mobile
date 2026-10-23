import { useSyncExternalStore } from 'react'

import type { User } from '@/types/user'

/**
 * Thông báo đã đọc, theo người đọc, giữ trong bộ nhớ suốt một lần mở app (như `read-state.ts` của web): đổi màn không mất, tắt hẳn app
 * thì mất. Là trạng thái giao diện, không phải dữ liệu nghiệp vụ — khi backend có thông báo, "đã đọc" về máy chủ.
 *
 * Người đọc là vai trò + mã + email, không chỉ mã: đăng nhập bằng backend mà dữ liệu còn ở kho mẫu thì mọi tài khoản backend cùng vai
 * trò mượn chung mã của tài khoản mẫu (`userFromBackend`), chỉ email là của họ — khoá theo mã thì người đăng nhập sau thấy thông báo
 * của người trước là đã đọc. Cùng tài khoản mà đổi vai trò cũng là người đọc mới. Chưa có người đăng nhập (`null`) thì không đọc gì.
 */
export type NotificationReader = Pick<User, 'id' | 'role' | 'email'>

const readByReader = new Map<string, ReadonlySet<string>>()
const listeners = new Set<() => void>()
const NONE: ReadonlySet<string> = new Set()

function keyOf(reader: NotificationReader): string {
  return JSON.stringify([reader.role, reader.id, reader.email])
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify() {
  for (const listener of listeners) listener()
}

export function markNotificationsRead(reader: NotificationReader | null, ids: readonly string[]): void {
  if (reader === null) return
  const key = keyOf(reader)
  const current = readByReader.get(key) ?? NONE
  if (ids.every((id) => current.has(id))) return
  readByReader.set(key, new Set([...current, ...ids]))
  notify()
}

/** Mã thông báo `reader` đã đọc; đổi tham chiếu mỗi lần đánh dấu để màn vẽ lại. */
export function useReadNotifications(reader: NotificationReader | null): ReadonlySet<string> {
  const key = reader === null ? null : keyOf(reader)
  return useSyncExternalStore(subscribe, () => (key === null ? NONE : (readByReader.get(key) ?? NONE)))
}

/** Test: bỏ mọi dấu đã đọc. */
export function resetReadNotifications(): void {
  readByReader.clear()
  notify()
}
