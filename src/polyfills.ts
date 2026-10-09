import * as ExpoCrypto from 'expo-crypto'

/**
 * Bù những thứ bộ máy JavaScript của máy (Hermes) thiếu mà logic chép từ web đang dùng. Nạp file này trước mọi thứ khác ở
 * `src/app/_layout.tsx`. Danh sách đo trên Android bằng bản APK của SDK 57 (09/10/2026):
 *
 * - thiếu, bù ở đây: `Array.prototype.toSorted`, `crypto.getRandomValues`;
 * - thiếu, KHÔNG bù — đừng dùng: `Object.groupBy`, `Array.fromAsync`, `Intl.PluralRules`, `Intl.ListFormat`,
 *   `Intl.RelativeTimeFormat`, `Intl.Segmenter` (`scripts/sync-from-web.mjs` chặn chúng trong code chép từ web);
 * - có sẵn: `toReversed`, `toSpliced`, `with`, `findLast`, `at`, `structuredClone`, `Intl.NumberFormat` (kể cả kiểu `unit`),
 *   `Intl.DateTimeFormat`.
 *
 * Jest chạy trên Node nên có đủ mọi thứ: thiếu một bản bù chỉ lộ ra khi chạy trên máy.
 */

type CryptoLike = { getRandomValues?: unknown }
const scope = globalThis as { crypto?: CryptoLike }

if (typeof scope.crypto?.getRandomValues !== 'function') {
  scope.crypto = { ...scope.crypto, getRandomValues: ExpoCrypto.getRandomValues }
}

if (typeof Array.prototype.toSorted !== 'function') {
  // Đúng nghĩa của chuẩn: trả mảng mới đã sắp, mảng gốc giữ nguyên
  // eslint-disable-next-line no-extend-native -- bản bù cho một hàm chuẩn mà máy thiếu, chỉ thêm khi chưa có
  Object.defineProperty(Array.prototype, 'toSorted', {
    configurable: true,
    writable: true,
    value: function toSorted<T>(this: readonly T[], compare?: (a: T, b: T) => number): T[] {
      return [...this].sort(compare)
    },
  })
}
