import type { Href } from 'expo-router'

import { isPlatformRole, type Role } from '@/types/user'

import { can } from './permissions'

/** Màn mở ra sau khi đăng nhập. Phải là màn vai trò đó mở được: vai trò chưa có màn làm việc trên app thì về Tài khoản. */
export function landingOf(role: Role): Href {
  return can(role, 'driver.operate') ? '/trips' : '/account'
}

/**
 * Lời giải thích ở màn Tài khoản cho vai trò chưa có màn làm việc: `webOnly` — việc của vai trò nằm ở bản web (ba vai trò nền tảng,
 * quản trị công ty); `notYet` — app sẽ có màn cho vai trò này nhưng bản này chưa làm; `null` — đã có màn.
 */
export function scopeNote(role: Role): 'webOnly' | 'notYet' | null {
  if (can(role, 'driver.operate')) return null
  return isPlatformRole(role) || role === 'companyAdmin' ? 'webOnly' : 'notYet'
}
