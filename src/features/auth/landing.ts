import type { Href } from 'expo-router'

import { isPlatformRole, type Role, type User } from '@/types/user'

import { can } from './permissions'

/**
 * Màn mở ra sau khi đăng nhập. Phải là màn vai trò đó mở được (tab nằm sau đúng quyền này ở `(tabs)/_layout.tsx`): tài xế về "Chuyến của
 * tôi", nhân viên kho về tab Kho; vai trò chưa có màn làm việc trên app thì về Tài khoản.
 */
export function landingOf(role: Role): Href {
  if (can(role, 'driver.operate')) return '/trips'
  if (can(role, 'warehouse.operate')) return '/warehouse'
  return '/account'
}

/**
 * "Màn chính" của người đang dùng app — đích của nút "Về màn chính" ở màn lỗi và màn không tìm thấy: màn của vai trò khi đã đăng nhập,
 * màn đăng nhập khi chưa (route của nhóm `(app)` nằm sau phiên, người chưa đăng nhập không mở được `/`).
 */
export function homeOf(user: User | null): Href {
  return user === null ? '/sign-in' : landingOf(user.role)
}

/**
 * Lời giải thích ở màn Tài khoản cho vai trò chưa có màn làm việc: `webOnly` — việc của vai trò nằm ở bản web (ba vai trò nền tảng,
 * quản trị công ty); `notYet` — app sẽ có màn cho vai trò này nhưng bản này chưa làm; `null` — đã có màn (tài xế, nhân viên kho).
 */
export function scopeNote(role: Role): 'webOnly' | 'notYet' | null {
  if (can(role, 'driver.operate') || can(role, 'warehouse.operate')) return null
  return isPlatformRole(role) || role === 'companyAdmin' ? 'webOnly' : 'notYet'
}
