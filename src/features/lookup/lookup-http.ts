import { api, ApiError, isApiError, type ApiClient } from '@/data/http'
import { roundCm, roundKg } from '@/domain/geometry'
import { HANDLING_CLASSES, type HandlingClass } from '@/domain/models'
import { PACKAGE_FLAGS, type Package, type PackageStatus } from '@/lib/mock-db'

import type { LookupApi, PackageLookup } from './lookup-api'

/*
 * Nguồn máy chủ của Tra cứu kiện (như `package-lookup-api.ts` của web):
 *   scanPackage         GET /api/packages/scan/{qrToken} · GET /api/packages/{id}
 *   lookupPackages      GET /api/packages/scan/{qrToken} · GET /api/packages/{id} · GET /api/packages
 *   reportPackageFound  GET /api/packages/scan/{qrToken} · POST /api/packages/{id}/found
 * Lượt quét trả điểm đến, chuyến, điểm giao và cờ nhưng không có kích thước; kích thước đọc ở `GET /api/packages/{id}`. Máy chủ chỉ trả
 * kiện của công ty người đang đăng nhập: không có (404) hoặc không được đọc (403) là `QR_UNKNOWN`, như kho mẫu.
 */

/** `PackageResponse` của máy chủ (một kiện, danh sách): kích thước cm. */
type PackageDto = {
  readonly id: number
  readonly packageCode?: string | null
  readonly trackingBarcode?: string | null
  readonly qrToken?: string | null
  readonly actualLength?: number | string | null
  readonly actualWidth?: number | string | null
  readonly actualHeight?: number | string | null
  readonly actualWeightKg?: number | string | null
  readonly handlingClass?: string | null
  readonly status?: string | null
  readonly destination?: string | null
  readonly flag?: string | null
}

/** `PackageDetailResponse` của lượt quét: chuyến (tên là mã chuyến) và điểm giao của kiện. */
type ScanDto = PackageDto & {
  readonly trip?: { readonly id: number; readonly name?: string | null } | null
  readonly stop?: { readonly number?: number | null; readonly name?: string | null } | null
}

/** Trạng thái của máy chủ → của app; kiện đã huỷ (`CANCELLED`) không có ở kho kiện của app. */
const STATUS_OF: Readonly<Record<string, PackageStatus>> = { PENDING: 'IMPORTED', PLANNED: 'ASSIGNED', LOADED: 'LOADED', DELIVERED: 'DELIVERED', RETURNED: 'RETURNED' }

/** Số dòng mỗi trang khi đọc danh sách kiện để khớp mã của bên gửi. */
const PAGE_SIZE = 200
/** Trần số trang đọc một lần tra: đủ cho kho kiện của một công ty, không đọc mãi khi máy chủ trả sai. */
const MAX_PAGES = 50

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const absent = (value: unknown): value is null | undefined => value === null || value === undefined
const cmOf = (cm: number | string | null | undefined) => (absent(cm) ? 0 : roundCm(Number(cm)))
const kgOf = (kg: number | string | null | undefined) => (absent(kg) ? 0 : roundKg(Number(kg)))
const same = (a: string | null | undefined, b: string) => (a ?? '').trim().toLowerCase() === b.toLowerCase()

function handlingClassOf(value: string | null | undefined): HandlingClass {
  const code = value?.trim().toUpperCase()
  return HANDLING_CLASSES.find((item) => item === code) ?? 'STANDARD'
}

/** Kiện của app từ kiện của máy chủ; trạng thái lạ trả `null`. Mã của bên gửi để trống thì lấy mã của kho. */
function packageOf(dto: PackageDto): Package | null {
  const status = STATUS_OF[dto.status ?? '']
  if (status === undefined) return null
  const id = String(dto.id)
  return {
    id,
    companyId: '',
    packageCode: dto.packageCode?.trim() || id,
    qrToken: dto.qrToken ?? '',
    lengthCm: cmOf(dto.actualLength),
    widthCm: cmOf(dto.actualWidth),
    heightCm: cmOf(dto.actualHeight),
    weightKg: kgOf(dto.actualWeightKg),
    handlingClass: handlingClassOf(dto.handlingClass),
    destination: dto.destination?.trim() ?? '',
    status,
    flags: PACKAGE_FLAGS.filter((flag) => flag === dto.flag),
    source: 'IMPORT',
    createdAt: '',
    createdBy: null,
    history: [],
  }
}

/** Một kiện của màn từ lượt quét (điểm đến, chuyến, điểm giao, cờ) và kiện đầy đủ (kích thước). Chuyến hiện bằng mã chuyến. */
function lookupOf(scan: ScanDto, full: PackageDto): PackageLookup | null {
  const pkg = packageOf({ ...full, ...withoutAbsent(scan) })
  if (pkg === null) return null
  const tripCode = scan.trip ? scan.trip.name?.trim() || String(scan.trip.id) : undefined
  const number = scan.stop?.number
  const stop = scan.stop && typeof number === 'number' ? { number, name: scan.stop.name?.trim() ?? '' } : undefined
  return { package: tripCode === undefined ? pkg : { ...pkg, tripId: tripCode }, type: undefined, trip: undefined, stop }
}

/** Bỏ trường máy chủ để trống, để lượt quét không xoá kích thước của kiện đầy đủ. */
function withoutAbsent(dto: ScanDto): Partial<PackageDto> {
  return Object.fromEntries(Object.entries(dto).filter(([, value]) => !absent(value))) as Partial<PackageDto>
}

/** Không có hoặc không được đọc: không khớp, không lộ gì thêm. */
function missing(error: unknown): null {
  if (isApiError(error) && (error.status === 404 || error.status === 403 || error.code === 'QR_UNKNOWN')) return null
  throw error
}

export function httpLookupApi({ client = api }: { client?: () => ApiClient } = {}): LookupApi {
  /** Lượt quét; mã QR của máy chủ là UUID chữ thường và máy chủ so đúng từng chữ, còn ô quét của app viết hoa mã. */
  async function scan(token: string): Promise<ScanDto> {
    const value = token.trim().toLowerCase()
    try {
      return await client().get<ScanDto>(`/api/packages/scan/${encodeURIComponent(value)}`)
    } catch (error) {
      if (isApiError(error) && error.status === 404) throw new ApiError('QR_UNKNOWN', { status: 404, params: { token } })
      throw error
    }
  }

  const read = (id: number | string) => client().get<PackageDto>(`/api/packages/${encodeURIComponent(String(id))}`)

  async function byToken(token: string): Promise<PackageLookup | null> {
    const scanned = await scan(token)
    return lookupOf(scanned, await read(scanned.id))
  }

  async function byId(id: string): Promise<PackageLookup | null> {
    const full = await read(id)
    return full.qrToken ? lookupOf(await scan(full.qrToken), full) : null
  }

  /** Kiện có mã của bên gửi hoặc mã vạch đúng `code` (không kể hoa thường): máy chủ không lọc theo mã, app đọc hết các trang rồi lọc. */
  async function byCode(code: string): Promise<PackageDto[]> {
    const found: PackageDto[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const rows = (await client().get<readonly PackageDto[] | null>('/api/packages', { query: { page, size: PAGE_SIZE, sort: 'id,asc' } })) ?? []
      found.push(...rows.filter((row) => same(row.packageCode, code) || same(row.trackingBarcode, code)))
      if (rows.length < PAGE_SIZE) break
    }
    return found
  }

  return {
    capabilities: { available: true, reportFound: true },

    async scanPackage(token) {
      const found = await byToken(token)
      if (found === null) throw new ApiError('QR_UNKNOWN', { status: 404, params: { token } })
      return found
    },

    async lookupPackages(code) {
      const value = code.trim()
      const [token, id, codes] = await Promise.all([
        UUID.test(value) ? byToken(value).catch(missing) : null,
        /^\d+$/.test(value) ? byId(value).catch(missing) : null,
        byCode(value),
      ])
      const found = new Map<string, PackageLookup>()
      for (const item of [token, id]) if (item) found.set(item.package.id, item)
      // Danh sách không trả đủ kích thước: mỗi kiện khớp đọc lại đầy đủ rồi quét để có điểm đến, chuyến, điểm giao
      const others = codes.filter((row) => !found.has(String(row.id)))
      const scanned = await Promise.all(others.map((row) => byId(String(row.id)).catch(missing)))
      for (const item of scanned) if (item) found.set(item.package.id, item)
      if (found.size === 0) throw new ApiError('QR_UNKNOWN', { status: 404, params: { token: value } })
      return [...found.values()].toSorted((a, b) => Number(b.package.id) - Number(a.package.id))
    },

    async reportPackageFound(token) {
      const { id } = await scan(token)
      const pkg = packageOf(await client().post<PackageDto>(`/api/packages/${encodeURIComponent(String(id))}/found`))
      if (pkg === null) throw new ApiError('NOT_FOUND', { status: 404 })
      return pkg
    },
  }
}
