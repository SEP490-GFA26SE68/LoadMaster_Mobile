/**
 * Hạn nhập bằng hai ô chữ trên điện thoại: ngày `dd/MM/yyyy` và giờ `HH:mm`, theo giờ của máy (bản web dùng ô ngày, ô giờ của trình
 * duyệt). Hàm thuần: đọc chữ đang gõ thành mốc ISO 8601 hoặc trả mã lỗi để form dịch; chiều ngược lại điền sẵn hai ô từ một mốc.
 */

export type DeadlineParse =
  | { readonly kind: 'empty' }
  | { readonly kind: 'ok'; readonly iso: string }
  /** `incomplete`: chỉ có một trong hai ô; `invalid`: chữ không phải ngày / giờ có thật. */
  | { readonly kind: 'error'; readonly code: 'incomplete' | 'invalid' }

/** Ngày: `25/10/2026`; nhận cả dấu chấm, gạch ngang và ngày, tháng một chữ số. */
const DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/
/** Giờ: `14:30`; nhận cả `14.30`, `14h30`. */
const TIME = /^(\d{1,2})[:.hH](\d{2})$/

const INVALID: DeadlineParse = { kind: 'error', code: 'invalid' }

export function parseDeadline(date: string, time: string): DeadlineParse {
  const dateText = date.trim()
  const timeText = time.trim()
  if (dateText === '' && timeText === '') return { kind: 'empty' }
  if (dateText === '' || timeText === '') return { kind: 'error', code: 'incomplete' }
  const day = DATE.exec(dateText)
  const clock = TIME.exec(timeText)
  if (day === null || clock === null) return INVALID
  const [d, m, y] = [Number(day[1]), Number(day[2]), Number(day[3])]
  const [h, min] = [Number(clock[1]), Number(clock[2])]
  if (h > 23 || min > 59) return INVALID
  const value = new Date(y, m - 1, d, h, min)
  // Ngày không có thật (31/02) thì Date tràn sang tháng sau: so lại từng phần
  if (value.getFullYear() !== y || value.getMonth() !== m - 1 || value.getDate() !== d) return INVALID
  return { kind: 'ok', iso: value.toISOString() }
}

const pad = (value: number) => String(value).padStart(2, '0')

/** Chữ của hai ô cho một mốc ISO 8601, theo giờ của máy. */
export function deadlineText(iso: string): { readonly date: string; readonly time: string } {
  const value = new Date(iso)
  return {
    date: `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  }
}
