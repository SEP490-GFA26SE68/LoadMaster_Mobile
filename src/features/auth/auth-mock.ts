import { getMockDb } from '@/data/mock-db'
import type { MockDb } from '@/lib/mock-db'

import type { PasswordAuth } from './auth-adapter'

/** Nhường một nhịp cho giao diện vẽ trạng thái đang tải: lần gọi kho đầu tiên dựng seed ngay trên luồng JS. */
const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/** Đăng nhập giả lập trên kho mẫu: kho giữ phiên như server; chuỗi cất lại là mã người dùng. */
export function createMockAuth(db: () => MockDb = getMockDb): PasswordAuth {
  return {
    kind: 'password',
    async signIn(email, password) {
      await nextTick()
      const user = await db().authenticate(email, password)
      return { user, saved: user.id }
    },
    async restore(saved) {
      await nextTick()
      const user = db().restoreSession(saved)
      return user === null ? null : { user, saved: user.id }
    },
    async signOut() {
      await db().signOut()
    },
    async accessToken() {
      return null
    },
    // Kho mẫu không có backend phía sau: không feature nào được dùng backend khi đăng nhập giả lập (`data/config.ts`)
    backendUserId() {
      return null
    },
  }
}
