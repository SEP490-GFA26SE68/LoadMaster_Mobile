import { createMockDb, SEED_ANCHOR_DATE, vnDate, type MockDb } from '@/lib/mock-db'

/** Độ trễ giả của kho mẫu, đủ để thấy trạng thái đang tải. */
const APP_LATENCY_MS = 300

let appDb: MockDb | undefined

/**
 * Kho mẫu của app: cùng bộ logic và seed với bản web (`src/lib/mock-db`, chép từ web), tạo ở lần gọi đầu và sống trong bộ nhớ tới khi
 * app đóng. Nó **không thay backend**: bản web và máy khác không thấy gì trong kho này. Chỉ adapter `mock` của các `-api.ts` gọi hàm này.
 * Dưới Jest kho neo ngày cố định và không có độ trễ để test tất định.
 */
export function getMockDb(): MockDb {
  if (appDb === undefined) {
    const underTest = process.env.NODE_ENV === 'test'
    appDb = createMockDb({
      latencyMs: underTest ? 0 : APP_LATENCY_MS,
      today: underTest ? SEED_ANCHOR_DATE : vnDate(new Date()),
      ...(underTest ? {} : { random: Math.random }),
    })
  }
  return appDb
}

/** Chỉ cho test: bỏ kho đang có để test sau bắt đầu từ seed. */
export function resetMockDb(): void {
  appDb = undefined
}
