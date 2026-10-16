import { useSyncExternalStore } from 'react'

/**
 * Thông báo đã đọc, theo người dùng, giữ trong bộ nhớ suốt một lần mở app (như `read-state.ts` của web): đổi màn không mất, tắt hẳn app
 * thì mất. Là trạng thái giao diện, không phải dữ liệu nghiệp vụ — khi backend có thông báo, "đã đọc" về máy chủ.
 */
const readByUser = new Map<string, ReadonlySet<string>>()
const listeners = new Set<() => void>()
const NONE: ReadonlySet<string> = new Set()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify() {
  for (const listener of listeners) listener()
}

export function markNotificationsRead(userId: string, ids: readonly string[]): void {
  const current = readByUser.get(userId) ?? NONE
  if (ids.every((id) => current.has(id))) return
  readByUser.set(userId, new Set([...current, ...ids]))
  notify()
}

/** Mã thông báo `userId` đã đọc; đổi tham chiếu mỗi lần đánh dấu để màn vẽ lại. */
export function useReadNotifications(userId: string): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => readByUser.get(userId) ?? NONE)
}

/** Test: bỏ mọi dấu đã đọc. */
export function resetReadNotifications(): void {
  readByUser.clear()
  notify()
}
