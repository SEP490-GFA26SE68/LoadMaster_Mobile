import { ApiError, isApiError, type ApiClient } from '@/data/http'

/*
 * Công cụ chung của adapter `http` ở các màn điều phối viên và quản lý công ty (giám sát, chuyến hàng, tổng quan), như `backend-time.ts`,
 * `api-page.ts` và `withBusinessCode` của web.
 */

/**
 * Mốc giờ backend trả → ISO 8601 của app (`toISOString()`). Backend có hai dạng: `Instant` kèm `Z` hoặc độ lệch (tới 9 chữ số lẻ của giây)
 * và `LocalDateTime` không múi giờ — giờ Việt Nam; ngày và giờ ngăn bằng `T` hay dấu cách. Phần lẻ giữ 3 chữ số (Hermes không đọc nhiều
 * hơn). Dạng khác là lỗi của máy chủ.
 */
const BACKEND_TIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?$/

export function isoFromBackend(value: string): string {
  const match = BACKEND_TIME.exec(value.trim())
  if (match === null) throw new ApiError('SERVER_ERROR')
  const [, day = '', minutes = '', seconds = '00', fraction = '', offset = '+07:00'] = match
  const date = new Date(`${day}T${minutes}:${seconds}.${fraction.padEnd(3, '0').slice(0, 3)}${offset}`)
  if (Number.isNaN(date.getTime())) throw new ApiError('SERVER_ERROR')
  return date.toISOString()
}

/** Như `isoFromBackend`, cho trường máy chủ được để trống: rỗng là `undefined`. */
export const optionalIso = (value: string | null | undefined): string | undefined =>
  value === null || value === undefined || value.trim() === '' ? undefined : isoFromBackend(value)

/** Giờ Việt Nam không đổi theo mùa: +07:00. */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000

/** Chiều ngược của `isoFromBackend`: ISO 8601 của app → `LocalDateTime` giờ Việt Nam (`2026-10-16T18:05:00`) cho thân lệnh gửi máy chủ. */
export function backendLocalDateTime(iso: string): string {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) throw new ApiError('SERVER_ERROR')
  return new Date(time + VN_OFFSET_MS).toISOString().slice(0, 19)
}

/**
 * Đổi phản hồi lỗi **không kèm mã** (client đặt `SERVER_ERROR` kèm mã HTTP) sang mã nghiệp vụ, ở lệnh mà mã HTTP đó chỉ có một nghĩa.
 * Lỗi đã kèm mã của backend đi thẳng.
 */
export async function withStatusCode<T>(request: Promise<T>, codes: Readonly<Partial<Record<number, string>>>): Promise<T> {
  try {
    return await request
  } catch (error) {
    const code = isApiError(error) && error.code === 'SERVER_ERROR' ? codes[error.status] : undefined
    if (code === undefined || !isApiError(error)) throw error
    throw new ApiError(code, { status: error.status, params: error.params })
  }
}

/**
 * Đọc hết một danh sách phân trang (`PageResponse`: client trả phần `data` của trang). Tham số trang là `page` (từ 0) và `size` (backend
 * cho tối đa 100). Dừng khi một trang ngắn hơn `size`, hoặc sau `maxPages` trang để một máy chủ lỗi không làm vòng lặp chạy mãi.
 */
export async function readAllPages<T>(
  client: ApiClient,
  path: string,
  query: Readonly<Record<string, string | number | boolean | undefined>> = {},
  { size = 100, maxPages = 50 }: { readonly size?: number; readonly maxPages?: number } = {},
): Promise<T[]> {
  const items: T[] = []
  for (let page = 0; page < maxPages; page += 1) {
    const rows = (await client.get<T[] | null>(path, { query: { ...query, page, size } })) ?? []
    items.push(...rows)
    if (rows.length < size) return items
  }
  return items
}

/** Giá trị phải thuộc một tập của hợp đồng; ngoài tập là `undefined`. */
export const pick = <T extends string>(values: readonly T[], value: string | null | undefined): T | undefined =>
  values.find((item) => item === value)

/** Như `pick`, nhưng giá trị ngoài tập là lỗi của máy chủ. */
export function required<T extends string>(values: readonly T[], value: string | null | undefined): T {
  const found = pick(values, value)
  if (found === undefined) throw new ApiError('SERVER_ERROR')
  return found
}

/** Việc máy chủ chưa có: không âm thầm bỏ qua. */
export const notSupported = async (): Promise<never> => {
  throw new ApiError('NOT_SUPPORTED')
}

/** Số thập phân của backend (`BigDecimal` ra JSON là số, có khi là chuỗi); `null` là chưa có số. Số hỏng là lỗi của máy chủ. */
export function decimalOf(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) throw new ApiError('SERVER_ERROR')
  return number
}
