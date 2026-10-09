/** Mã `PKG-<số>`, hoặc mã bắt đầu bằng `PKG-<số>-` (dạng instance của kiện đó). */
const PACKAGE_ID = /^PKG-(\d+)(?:-|$)/

/** Độ rộng số của mẫu Spec mục 12 (`PKG-001`), dùng khi chưa có mã nào để theo. */
const SPEC_SAMPLE_WIDTH = 3

/**
 * Mã kiện mới cho thao tác nhân bản (D-33, LM-045): số lớn nhất đang có cộng 1, tất định.
 *
 * - Chỉ tính mã `PKG-<số>` và mã bắt đầu bằng `PKG-<số>-`. Mã dạng instance như `PKG-002-01` giữ số 2, để
 *   instance của bản sao không va với nó. Mã tự đặt khác (`KHO-A-15`, `PKG-12A`) bị bỏ qua.
 * - Đệm 0 theo mã rộng nhất đang có (`PKG-0009` → `PKG-0010`), mặc định 3 chữ số; chỉ nới rộng khi số cần
 *   (`PKG-999` → `PKG-1000`), không bao giờ cắt.
 */
export function nextPackageId(existingIds: readonly string[]): string {
  const numbers = existingIds.flatMap((id) => PACKAGE_ID.exec(id)?.[1] ?? [])
  const highest = Math.max(0, ...numbers.map(Number))
  const width = numbers.length === 0 ? SPEC_SAMPLE_WIDTH : Math.max(...numbers.map((digits) => digits.length))
  return `PKG-${String(highest + 1).padStart(width, '0')}`
}
