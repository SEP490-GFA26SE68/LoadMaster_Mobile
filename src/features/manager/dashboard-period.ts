import { addDays } from '@/lib/mock-db'

/**
 * Kỳ của bảng điều khiển (LM-090, D-48). Kỳ giữ trên URL bằng tham số tiếng Việt không dấu (D-52):
 * `?ky=7-ngay|30-ngay|thang-nay|tuy-chon`, kỳ tuỳ chọn thêm `&tu=YYYY-MM-DD&den=YYYY-MM-DD`.
 * Chuyến thuộc kỳ theo **ngày chạy** (`scheduledDate`, giờ Việt Nam), tính cả hai đầu.
 */
export const PERIOD_PRESETS = ['7-ngay', '30-ngay', 'thang-nay', 'tuy-chon'] as const

export type PeriodPreset = (typeof PERIOD_PRESETS)[number]

export const DEFAULT_PERIOD: PeriodPreset = '30-ngay'

/** Tên tham số trên URL. */
export const PERIOD_PARAMS = { preset: 'ky', from: 'tu', to: 'den' } as const

/** Lựa chọn kỳ như trên URL; `from`/`to` là chuỗi thô (rỗng khi vắng), chỉ dùng khi `preset` là tuỳ chọn. */
export type PeriodSelection = { readonly preset: PeriodPreset; readonly from: string; readonly to: string }

/** Khoảng ngày `YYYY-MM-DD` đã giải, `from` ≤ `to`. */
export type DateRange = { readonly from: string; readonly to: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Ngày có thật dạng `YYYY-MM-DD` (loại 30/02, năm 6 chữ số của ô `type="date"`). */
export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && addDays(value, 0) === value
}

export function isPeriodPreset(value: string | null): value is PeriodPreset {
  return PERIOD_PRESETS.some((preset) => preset === value)
}

export function readPeriodSelection(params: URLSearchParams): PeriodSelection {
  const preset = params.get(PERIOD_PARAMS.preset)
  return {
    preset: isPeriodPreset(preset) ? preset : DEFAULT_PERIOD,
    from: params.get(PERIOD_PARAMS.from) ?? '',
    to: params.get(PERIOD_PARAMS.to) ?? '',
  }
}

/**
 * Khoảng ngày của kỳ tính từ `today` (giờ Việt Nam). 7 và 30 ngày tính lùi, gồm hôm nay; tháng này là trọn tháng lịch.
 * Tuỳ chọn: đầu thiếu hoặc sai lấy theo kỳ 30 ngày, hai đầu ngược thì đảo.
 */
export function resolvePeriod({ preset, from, to }: PeriodSelection, today: string): DateRange {
  switch (preset) {
    case '7-ngay':
      return { from: addDays(today, -6), to: today }
    case '30-ngay':
      return { from: addDays(today, -29), to: today }
    case 'thang-nay': {
      const first = `${today.slice(0, 8)}01`
      // Qua đầu tháng sau (ngày 1–4 của tháng sau) rồi lùi một ngày từ mùng 1 tháng đó.
      const next = addDays(first, 31)
      return { from: first, to: addDays(`${next.slice(0, 8)}01`, -1) }
    }
    case 'tuy-chon': {
      const fallback = resolvePeriod({ preset: DEFAULT_PERIOD, from: '', to: '' }, today)
      const start = isIsoDate(from) ? from : fallback.from
      const end = isIsoDate(to) ? to : fallback.to
      return start <= end ? { from: start, to: end } : { from: end, to: start }
    }
  }
}

/** Mọi ngày của kỳ theo thứ tự, gồm hai đầu. */
export function daysOf({ from, to }: DateRange): string[] {
  const days: string[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
  return days
}

export function isWithinPeriod(date: string, { from, to }: DateRange): boolean {
  return date >= from && date <= to
}
