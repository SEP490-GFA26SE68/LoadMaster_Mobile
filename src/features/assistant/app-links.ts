import type { Href } from 'expo-router'

import { hasTab, type WorkTab } from '@/features/auth/landing'
import type { Role } from '@/types/user'

import type { AssistantLink } from './assistant-model'

/** Liên kết trợ lý gợi ý, đã đổi sang màn của app. */
export type AppLink = { readonly label: string; readonly href: Href }

/** Tối đa ba nút dưới mỗi câu trả lời, như bản web. */
const MAX_LINKS = 3

/**
 * Route của bản web (đường dẫn máy chủ gợi ý) → tab của app cho vai trò này. Route nào app không có màn tương ứng (bảng giá, chuyến của điều
 * phối viên, kho kiện…) thì không có ở đây: liên kết đó bị bỏ, không bao giờ mở trình duyệt sang bản web.
 */
const WEB_TO_TAB: Readonly<Record<string, (role: Role) => WorkTab | null>> = {
  '/tai-xe': () => 'trips',
  '/kho': () => 'warehouse',
  '/tra-cuu-kien': () => 'lookup',
  '/phieu-luong': (role) => (role === 'warehouse' ? 'warehouse-payroll' : role === 'driver' ? 'payroll' : null),
}

/** Màn Tài khoản: mọi vai trò đều có (hồ sơ cá nhân của bản web). */
const ACCOUNT_PATHS = new Set(['/ho-so'])

function appHrefOf(to: string, role: Role): Href | null {
  // Bỏ truy vấn và neo của route web; chỉ nhận đường dẫn trong ứng dụng (`/…`, không `//máy-khác`)
  const path = to.split(/[?#]/)[0]?.replace(/\/+$/, '') ?? ''
  if (!/^\/(?!\/)[^\s\\]*$/.test(path)) return null
  if (ACCOUNT_PATHS.has(path)) return '/account'
  const tab = WEB_TO_TAB[path]?.(role) ?? null
  return tab !== null && hasTab(role, tab) ? `/${tab}` : null
}

/** Liên kết của câu trả lời mà app mở được, theo thứ tự máy chủ gửi, không trùng màn, tối đa ba. */
export function appLinksOf(links: readonly AssistantLink[], role: Role): AppLink[] {
  const seen = new Set<string>()
  const result: AppLink[] = []
  for (const link of links) {
    const label = link.label.trim()
    const href = appHrefOf(link.to.trim(), role)
    if (label === '' || href === null || seen.has(String(href))) continue
    seen.add(String(href))
    result.push({ label, href })
    if (result.length === MAX_LINKS) break
  }
  return result
}
