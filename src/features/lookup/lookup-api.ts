/**
 * Hàm → endpoint backend của Tra cứu kiện; mỗi nguồn là một adapter (`lookup-mock.ts` kho mẫu, `lookup-http.ts` máy chủ).
 *   scanPackage         GET /api/packages/scan/{qrToken} · GET /api/packages/{id}
 *   lookupPackages      GET /api/packages/scan/{qrToken} · GET /api/packages/{id} · GET /api/packages
 *   reportPackageFound  POST /api/packages/{id}/found
 */
import { createAdapter } from '@/data/adapter'
import { isApiError } from '@/data/http/api-error'
import { isMockDbError, type Package, type PackageType } from '@/lib/mock-db'

import { httpLookupApi } from './lookup-http'
import { mockLookupApi } from './lookup-mock'

/** Một kiện của màn Tra cứu kiện: kiện, loại kiện, và chuyến + điểm giao đang giữ kiện (nếu có). */
export type PackageLookup = {
  readonly package: Package
  readonly type: PackageType | undefined
  readonly trip: { readonly id: string; readonly name: string } | undefined
  /** Số điểm giao theo thứ tự của chuyến (điểm đầu là 1) và tên điểm. */
  readonly stop: { readonly number: number; readonly name: string } | undefined
}

/** Việc tra cứu kiện làm được với nguồn đang dùng; màn ẩn việc nguồn chưa làm được. */
export type LookupCapabilities = {
  /** Nguồn có tra cứu kiện: không thì không có tab Tra cứu kiện. */
  readonly available: boolean
  /** Nhân viên kho báo đã tìm thấy lại kiện mang cờ "Không tìm thấy" (gỡ cờ). */
  readonly reportFound: boolean
}

/**
 * Hợp đồng dữ liệu của Tra cứu kiện. Nguồn chỉ trả kiện của công ty người đang đăng nhập: mã không khớp kiện nào — hoặc chỉ khớp kiện
 * của công ty khác — là `QR_UNKNOWN`, không lộ là mã đó có thật.
 */
export type LookupApi = {
  readonly capabilities: LookupCapabilities
  /** Kiện của mã QR vừa quét. */
  scanPackage(token: string): Promise<PackageLookup>
  /** Kiện khớp mã người dùng gõ — mã QR, mã của bên gửi hoặc mã của kho; mã của bên gửi trùng nhau thì mọi kiện khớp, mới nhất trước. */
  lookupPackages(code: string): Promise<PackageLookup[]>
  /** Gỡ cờ "Không tìm thấy" của kiện mang mã QR này; chỉ nhân viên kho, chỉ kiện đang mang cờ đó. */
  reportPackageFound(token: string): Promise<Package>
}

const adapter = createAdapter<LookupApi>('packages', { mock: mockLookupApi, http: () => httpLookupApi() })

/** Lỗi "không khớp kiện nào" — kho mẫu và backend cùng mã `QR_UNKNOWN`. */
export function isUnknownPackage(error: unknown): boolean {
  return (isMockDbError(error) || isApiError(error)) && error.code === 'QR_UNKNOWN'
}

/** Việc tra cứu kiện làm được với nguồn đang dùng. */
export function lookupCapabilities(): LookupCapabilities {
  return adapter().capabilities
}

// GET /api/packages/scan/{qrToken} · GET /api/packages/{id}
export function scanPackage(token: string): Promise<PackageLookup> {
  return adapter().scanPackage(token)
}

// GET /api/packages/scan/{qrToken} · GET /api/packages/{id} · GET /api/packages
export function lookupPackages(code: string): Promise<PackageLookup[]> {
  return adapter().lookupPackages(code)
}

// POST /api/packages/{id}/found
export function reportPackageFound(token: string): Promise<Package> {
  return adapter().reportPackageFound(token)
}
