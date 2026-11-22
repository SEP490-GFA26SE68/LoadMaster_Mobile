import type { Href } from 'expo-router'

import type { Role, User } from '@/types/user'

import { can, type Permission } from './permissions'

/** Tab làm việc của thanh tab đáy (route `src/app/(app)/(tabs)/<tên>.tsx`), theo thứ tự trên thanh; Tài khoản luôn có nên không nằm ở đây. */
export const WORK_TABS = ['overview', 'trip-list', 'monitoring', 'trips', 'open-trips', 'payroll', 'warehouse', 'lookup', 'warehouse-payroll'] as const

export type WorkTab = (typeof WORK_TABS)[number]

/**
 * Quyền mở từng tab — cổng của route, như `RequirePermission` của bản web.
 * Lưu ý: `permissions.ts` được đồng bộ nguyên văn từ web (`web-mirror.json`); phiếu lương tài xế
 * (`/api/driver/payroll`) dùng cổng `driver.operate`, phiếu lương kho (`/api/warehouse/payroll`, tab `warehouse-payroll`) dùng cổng
 * `warehouse.operate`; tới Feat 4 sẽ đổi sang quyền chung `payroll.viewOwn` khi web bổ sung.
 */
const TAB_PERMISSION: Readonly<Record<WorkTab, Permission>> = {
  overview: 'dashboard.view',
  'trip-list': 'trips.view',
  monitoring: 'monitoring.view',
  trips: 'driver.operate',
  'open-trips': 'driver.operate',
  payroll: 'driver.operate',
  warehouse: 'warehouse.operate',
  lookup: 'packages.lookup',
  'warehouse-payroll': 'warehouse.operate',
}

/**
 * Tab làm việc của từng vai trò theo phạm vi app đã duyệt, màn chính đứng đầu (như `NAV_ITEMS` của bản web). Quyền vẫn là cổng (`hasTab`).
 * Vai trò có quyền của một màn mà màn đó của họ nằm ở bản web thì không có tab: điều phối viên có `dashboard.view` và `packages.lookup`
 * nhưng bảng điều khiển và tra cứu kiện của họ ở bản web. Ba vai trò nền tảng và quản trị công ty chỉ có Tài khoản.
 */
const ROLE_TABS: Readonly<Record<Role, readonly WorkTab[]>> = {
  systemAdmin: [],
  systemManager: [],
  systemSupporter: [],
  companyAdmin: [],
  companyManager: ['overview', 'trip-list', 'monitoring'],
  dispatcher: ['trip-list', 'monitoring'],
  warehouse: ['warehouse', 'lookup', 'warehouse-payroll'],
  driver: ['trips', 'open-trips', 'payroll'],
}

/** Vai trò có tab này: tab nằm trong phạm vi app của vai trò và vai trò có quyền mở màn đó. */
export function hasTab(role: Role | undefined, tab: WorkTab): boolean {
  return role !== undefined && ROLE_TABS[role].includes(tab) && can(role, TAB_PERMISSION[tab])
}

/**
 * Màn mở ra sau khi đăng nhập: tab làm việc đầu tiên của vai trò — tài xế "Chuyến của tôi", nhân viên kho Kho, quản lý công ty Tổng
 * quan, điều phối viên Chuyến hàng; vai trò không có màn làm việc trên app thì về Tài khoản.
 */
export function landingOf(role: Role): Href {
  const first = ROLE_TABS[role].find((tab) => hasTab(role, tab))
  return first === undefined ? '/account' : `/${first}`
}

/**
 * "Màn chính" của người đang dùng app — đích của nút "Về màn chính" ở màn lỗi và màn không tìm thấy: màn của vai trò khi đã đăng nhập,
 * màn đăng nhập khi chưa (route của nhóm `(app)` nằm sau phiên, người chưa đăng nhập không mở được `/`).
 */
export function homeOf(user: User | null): Href {
  return user === null ? '/sign-in' : landingOf(user.role)
}

/**
 * Lời giải thích ở màn Tài khoản cho vai trò không có tab làm việc nào: `webOnly` — việc của vai trò nằm ở bản web (ba vai trò nền tảng,
 * quản trị công ty); `null` — vai trò có màn làm việc trên app.
 */
export function scopeNote(role: Role): 'webOnly' | null {
  return ROLE_TABS[role].some((tab) => hasTab(role, tab)) ? null : 'webOnly'
}
