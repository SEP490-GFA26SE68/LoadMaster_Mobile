/**
 * Định dạng số, đơn vị, ngày giờ theo ngôn ngữ giao diện — cùng `Formatter` với bản web (`src/lib/format.ts` của web) để code chép sang
 * gọi y như cũ. Khác web ở một điểm: Hermes không bảo đảm có `Intl.ListFormat` và kiểu `unit` của `Intl.NumberFormat`, nên hai chỗ đó
 * có đường lui tự ghép. Đầu vào luôn là đơn vị nghiệp vụ: cm, kg, cm³.
 */

export type FormatLocale = 'vi-VN' | 'en-US'

export type Formatter = {
  /** 8240 → "8.240" · "8,240" */
  integer(value: number): string
  /** Luôn một chữ số thập phân: 18.44 → "18,4" · "18.4" */
  decimal(value: number): string
  /** 1250.55 → "1.250,6 cm" · 240 → "240 cm" */
  length(centimeters: number): string
  lengthValue(centimeters: number): string
  /** "1.203,5 × 235 × 239,2 cm" */
  dimensions(lengthCm: number, widthCm: number, heightCm: number): string
  widthByHeight(widthCm: number, heightCm: number): string
  /** "PKG-007, PKG-008 và PKG-009" · "PKG-007 and PKG-008" */
  list(items: readonly string[]): string
  /** 5320 → "5.320 kg" · "5,320 kg" */
  weight(kilograms: number): string
  volume(cubicCentimeters: number): string
  volumeM3(cubicCentimeters: number): string
  currency(value: number): string
  /** Giá trị 0–100: 87.42 → "87,4%" · "87.4%" */
  percent(value: number): string
  ratio(value: number): string
  /** "14/09/2026" · "Sep 14, 2026" */
  date(value: Date | string): string
  /** "14/09" · "Sep 14" */
  dayMonth(value: Date | string): string
  /** Đồng hồ 24 giờ ở mọi ngôn ngữ: "14:30" */
  time(value: Date | string): string
}

const CUBIC_CENTIMETERS_PER_CUBIC_METER = 1_000_000

const DATE_OPTIONS: Record<FormatLocale, Intl.DateTimeFormatOptions> = {
  'vi-VN': { day: '2-digit', month: '2-digit', year: 'numeric' },
  'en-US': { day: 'numeric', month: 'short', year: 'numeric' },
}

const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

/** Liên từ nối hai phần tử cuối khi máy không có `Intl.ListFormat`. */
const LIST_JOINT: Record<FormatLocale, string> = { 'vi-VN': ' và ', 'en-US': ' and ' }

function withoutYear(formatter: Intl.DateTimeFormat, value: Date): string {
  const parts = formatter.formatToParts(value)
  const year = parts.findIndex((part) => part.type === 'year')
  if (year < 0) return formatter.format(value)
  const joint = parts[year - 1]?.type === 'literal' ? year - 1 : year + 1
  return parts
    .filter((_, index) => index !== year && index !== joint)
    .map((part) => part.value)
    .join('')
}

/** Số kèm đơn vị: để `Intl` ghép khi máy hỗ trợ kiểu `unit`, không thì nối ký hiệu sau con số. */
function withUnit(locale: FormatLocale, unit: 'centimeter' | 'kilogram' | 'percent', symbol: string, options: Intl.NumberFormatOptions) {
  try {
    const formatter = new Intl.NumberFormat(locale, { ...options, style: 'unit', unit })
    return (value: number) => formatter.format(value)
  } catch {
    const plain = new Intl.NumberFormat(locale, options)
    return (value: number) => `${plain.format(value)}${symbol}`
  }
}

function listJoiner(locale: FormatLocale): (items: readonly string[]) => string {
  if (typeof Intl.ListFormat === 'function') {
    const conjunction = new Intl.ListFormat(locale, { type: 'conjunction' })
    return (items) => conjunction.format(items)
  }
  return (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')}${LIST_JOINT[locale]}${items[items.length - 1]}`)
}

export function createFormatter(locale: FormatLocale): Formatter {
  const numbers = (options: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, options)

  const whole = numbers({ maximumFractionDigits: 0 })
  const oneDecimal = numbers({ minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const upToOneDecimal = numbers({ maximumFractionDigits: 1 })
  const twoDecimals = numbers({ minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const centimeters = withUnit(locale, 'centimeter', ' cm', { maximumFractionDigits: 1 })
  const kilograms = withUnit(locale, 'kilogram', ' kg', { maximumFractionDigits: 2 })
  const percent = withUnit(locale, 'percent', '%', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const currency = numbers({ style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
  const date = new Intl.DateTimeFormat(locale, DATE_OPTIONS[locale])
  const time = new Intl.DateTimeFormat(locale, TIME_OPTIONS)
  const list = listJoiner(locale)

  return {
    integer: (value) => whole.format(value),
    decimal: (value) => oneDecimal.format(value),
    length: (value) => centimeters(value),
    lengthValue: (value) => upToOneDecimal.format(value),
    dimensions: (lengthCm, widthCm, heightCm) => `${upToOneDecimal.format(lengthCm)} × ${upToOneDecimal.format(widthCm)} × ${centimeters(heightCm)}`,
    widthByHeight: (widthCm, heightCm) => `${upToOneDecimal.format(widthCm)} × ${centimeters(heightCm)}`,
    list,
    weight: (value) => kilograms(value),
    volume: (value) => `${whole.format(value)} cm³`,
    volumeM3: (value) => `${oneDecimal.format(value / CUBIC_CENTIMETERS_PER_CUBIC_METER)} m³`,
    currency: (value) => currency.format(value),
    percent: (value) => percent(value),
    ratio: (value) => twoDecimals.format(value),
    date: (value) => date.format(toDate(value)),
    dayMonth: (value) => withoutYear(date, toDate(value)),
    time: (value) => time.format(toDate(value)),
  }
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}
