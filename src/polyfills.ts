import * as ExpoCrypto from 'expo-crypto'

/**
 * Phần logic chép từ web (`src/lib/mock-db`) gọi `crypto.getRandomValues` của trình duyệt; Hermes không có sẵn. Nạp file này trước
 * mọi thứ khác ở `src/app/_layout.tsx`.
 */
type CryptoLike = { getRandomValues?: unknown }
const scope = globalThis as { crypto?: CryptoLike }

if (typeof scope.crypto?.getRandomValues !== 'function') {
  scope.crypto = { ...scope.crypto, getRandomValues: ExpoCrypto.getRandomValues }
}
