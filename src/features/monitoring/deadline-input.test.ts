import { deadlineText, parseDeadline } from './deadline-input'

/** Hai ô chữ của hạn đọc theo giờ của máy chạy test: kỳ vọng dựng bằng `new Date(năm, tháng, ngày, giờ, phút)` cùng múi giờ đó. */
const local = (year: number, month: number, day: number, hour: number, minute: number) => new Date(year, month - 1, day, hour, minute).toISOString()

test('ngày dd/mm/yyyy và giờ HH:mm thành mốc ISO; nhận dấu chấm, gạch ngang, một chữ số, giờ kiểu 17h30', () => {
  expect(parseDeadline('25/10/2026', '17:30')).toStrictEqual({ kind: 'ok', iso: local(2026, 10, 25, 17, 30) })
  expect(parseDeadline(' 5.1.2027 ', '7.05')).toStrictEqual({ kind: 'ok', iso: local(2027, 1, 5, 7, 5) })
  expect(parseDeadline('05-01-2027', '07h05')).toStrictEqual({ kind: 'ok', iso: local(2027, 1, 5, 7, 5) })
})

test('trống cả hai ô là không có hạn; chỉ một ô là chưa đủ', () => {
  expect(parseDeadline('', '  ')).toStrictEqual({ kind: 'empty' })
  expect(parseDeadline('25/10/2026', '')).toStrictEqual({ kind: 'error', code: 'incomplete' })
  expect(parseDeadline('', '17:30')).toStrictEqual({ kind: 'error', code: 'incomplete' })
})

test('ngày, giờ không có thật hoặc sai dạng là không hợp lệ', () => {
  for (const [date, time] of [
    ['31/02/2026', '10:00'],
    ['31/04/2026', '10:00'],
    ['12/13/2026', '10:00'],
    ['25/10/26', '10:00'],
    ['25/10/2026', '24:00'],
    ['25/10/2026', '10:60'],
    ['25/10/2026', '1030'],
    ['mai', 'chiều'],
  ] as const) {
    expect(parseDeadline(date, time)).toStrictEqual({ kind: 'error', code: 'invalid' })
  }
  expect(parseDeadline('29/02/2028', '08:00')).toStrictEqual({ kind: 'ok', iso: local(2028, 2, 29, 8, 0) })
})

test('điền sẵn hai ô từ một mốc rồi đọc lại ra đúng mốc đó (tới phút)', () => {
  const iso = local(2026, 9, 6, 8, 5)
  expect(deadlineText(iso)).toStrictEqual({ date: '06/09/2026', time: '08:05' })
  const { date, time } = deadlineText(iso)
  expect(parseDeadline(date, time)).toStrictEqual({ kind: 'ok', iso })
})
