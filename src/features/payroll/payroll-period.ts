/** Kỳ lương theo định dạng chuẩn backend `YYYY-MM`. */
export type PayrollPeriodKey = `${number}-${string}`

const PERIOD_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const VN_OFFSET_MS = 7 * 60 * 60 * 1000

/** Kiểm tra chuỗi có đúng định dạng kỳ lương `YYYY-MM` không. */
export function isPayrollPeriodKey(value: string): value is PayrollPeriodKey {
  return PERIOD_PATTERN.test(value)
}

/** Tách năm và tháng (1..12) từ chuỗi `YYYY-MM`. */
export function parsePayrollPeriod(period: string): { readonly year: number; readonly month: number } | null {
  const match = PERIOD_PATTERN.exec(period)
  if (match === null) return null
  return { year: Number(match[1]), month: Number(match[2]) }
}

/** Tạo chuỗi `YYYY-MM` từ năm và tháng (1..12). */
export function formatPayrollPeriodKey(year: number, month: number): PayrollPeriodKey {
  return `${year}-${String(month).padStart(2, '0')}` as PayrollPeriodKey
}

/** Kỳ lương hiện tại theo múi giờ Việt Nam (UTC+7), khớp `ZoneId.of("Asia/Ho_Chi_Minh")` ở backend. */
export function currentPayrollPeriod(now: Date = new Date()): PayrollPeriodKey {
  const vn = new Date(now.getTime() + VN_OFFSET_MS)
  return formatPayrollPeriodKey(vn.getUTCFullYear(), vn.getUTCMonth() + 1)
}

/** Cộng/trừ số tháng so với một kỳ `YYYY-MM` (tự động xử lý qua năm). */
export function shiftPayrollPeriod(period: PayrollPeriodKey, deltaMonths: number): PayrollPeriodKey {
  const parsed = parsePayrollPeriod(period)
  if (parsed === null) throw new Error(`Invalid payroll period: ${period}`)
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1 + deltaMonths, 1))
  return formatPayrollPeriodKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1)
}

/** So sánh hai kỳ `YYYY-MM`: âm nếu `a < b`, 0 nếu bằng, dương nếu `a > b`. */
export function comparePayrollPeriod(a: PayrollPeriodKey, b: PayrollPeriodKey): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/** Hai chuỗi `month` (2 chữ số) và `year` (4 chữ số) để truyền vào i18n không bị định dạng phân tách hàng nghìn. */
export function payrollPeriodParts(period: PayrollPeriodKey): { readonly month: string; readonly year: string } {
  const parsed = parsePayrollPeriod(period)
  if (parsed === null) return { month: '', year: period }
  return { month: String(parsed.month).padStart(2, '0'), year: String(parsed.year) }
}
