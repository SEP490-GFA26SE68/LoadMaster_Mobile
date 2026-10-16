/**
 * Ngày lịch `YYYY-MM-DD` (ngày chạy của chuyến, D-46) → `Date` lúc giữa trưa theo giờ máy, để `format.date` hiện đúng ngày ở mọi
 * múi giờ. `new Date('2026-09-14')` là nửa đêm UTC nên máy ở múi giờ âm sẽ hiện thành ngày hôm trước.
 */
export function calendarDate(day: string): Date {
  return new Date(`${day}T12:00:00`)
}
