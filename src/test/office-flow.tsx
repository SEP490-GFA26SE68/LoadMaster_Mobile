import type { ReactElement } from 'react'

import { createMockAuth } from '@/features/auth/auth-mock'
import type { Locale } from '@/lib/i18n'

import { renderApp, signInAs } from './render'

/**
 * Tài khoản và bước dựng sẵn cho test màn của điều phối viên và quản lý công ty, trên kho mẫu của app (`getMockDb()`). Dữ liệu vận hành
 * của Long Bình có sẵn trong seed: chuyến đang chạy, chuyến chờ duyệt, kiện kho báo thiếu… (đưa chuyến qua các bước bằng
 * `@/test/trip-flow`).
 */

/** Điều phối viên mẫu của Long Bình (Nguyễn Thanh Tùng, `US-0001`) và của Phương Nam (`US-PN-03`). */
export const DISPATCHER_EMAIL = 'dieuphoi@loadmaster.vn'
export const PHUONG_NAM_DISPATCHER_EMAIL = 'dieuphoi@phuongnam.vn'
/** Quản lý công ty mẫu của Long Bình (Trần Thị Mai, `US-0002`) và của Phương Nam (`US-PN-02`). */
export const MANAGER_EMAIL = 'quanly@loadmaster.vn'
export const PHUONG_NAM_MANAGER_EMAIL = 'quanly@phuongnam.vn'

export type OfficeRenderOptions = {
  /** Tài khoản seed đăng nhập trước khi vẽ; mặc định điều phối viên mẫu của Long Bình (`DISPATCHER_EMAIL`). */
  readonly email?: string
  readonly locale?: Locale
}

/**
 * Đăng nhập bằng một tài khoản seed (mặc định điều phối viên mẫu) rồi vẽ một màn trong đủ provider của app (`renderApp`): phiên của kho
 * mẫu và phiên của `AuthProvider` là cùng một người, như sau khi đăng nhập thật.
 */
export async function renderOfficeScreen(ui: ReactElement, { email = DISPATCHER_EMAIL, locale = 'vi' }: OfficeRenderOptions = {}) {
  await signInAs(email)
  return renderApp(ui, { locale, auth: createMockAuth() })
}
