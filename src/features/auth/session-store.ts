import { readStored, writeStored } from '@/lib/storage'

import { SESSION_KEY } from './auth-adapter'

/**
 * Phiên đăng nhập trong kho khoá của máy. Kho khoá từ chối thì không im lặng: ghi log (ở `lib/storage`) và báo cho `AuthProvider`, để
 * người dùng biết vì sao phải đăng nhập lại.
 *   unreadable — mở app không đọc được phiên đã cất: vào màn đăng nhập kèm lý do;
 *   notSaved   — đã đăng nhập (hoặc token vừa làm mới) mà không cất được: phiên chỉ sống tới khi đóng app.
 * Kênh báo nằm ở module vì adapter Keycloak cất refresh token mới ngay trong lượt làm mới token, ngoài cây React.
 */
export type SessionStoreProblem = 'unreadable' | 'notSaved'

type Listener = (problem: SessionStoreProblem) => void

const listeners = new Set<Listener>()

function report(problem: SessionStoreProblem): void {
  for (const listener of listeners) listener(problem)
}

/** Nghe lỗi của kho khoá; trả hàm gỡ. */
export function onSessionStoreProblem(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Phiên đã cất, hoặc `null` khi chưa cất gì hay kho khoá từ chối (đã báo `unreadable`). */
export async function readSession(): Promise<string | null> {
  const stored = await readStored(SESSION_KEY)
  if (stored.ok) return stored.value
  report('unreadable')
  return null
}

/** Cất phiên; không cất được thì báo `notSaved`. */
export async function saveSession(saved: string): Promise<void> {
  if (!(await writeStored(SESSION_KEY, saved))) report('notSaved')
}

/**
 * Xoá phiên đã cất. Không xoá được thì chỉ ghi log: người dùng đang rời phiên, và lần mở sau phiên cũ chỉ mở lại được khi nguồn vẫn nhận
 * nó (Keycloak đã đóng phiên ở lượt đăng xuất).
 */
export async function clearSession(): Promise<void> {
  await writeStored(SESSION_KEY, null)
}
