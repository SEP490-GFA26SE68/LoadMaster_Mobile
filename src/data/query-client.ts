import { QueryClient } from '@tanstack/react-query'

import { dataConfig, FEATURES, type DataSource, type Feature } from './config'
import { isTransientError } from './http'

/** Truy vấn đọc gặp lỗi tạm thời (mất mạng, hết giờ, máy chủ lỗi) thì thử lại tối đa chừng này lần, giãn dần 1 → 2 giây. */
export const QUERY_RETRY_LIMIT = 2

/** Thử lại truy vấn đọc: chỉ lỗi tạm thời; lỗi có mã nghiệp vụ, phiên, quyền thì gọi lại vẫn vậy — để màn hiện câu và nút thử lại. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < QUERY_RETRY_LIMIT && isTransientError(error)
}

/**
 * Cache truy vấn của app.
 * - Đọc: lỗi tạm thời thì thử lại có giới hạn. Khoá của feature đọc backend (gốc khoá trùng tên feature: `['driver', …]`, `['packages', …]`…)
 *   chạy `online`: mất mạng thì truy vấn tạm dừng, giữ dữ liệu đang có, có mạng lại thì đọc lại ngay (`onlineManager`, nối NetInfo ở
 *   `data/network.ts`). Khoá của kho mẫu chạy `always`: kho nằm ngay trong máy, mất mạng vẫn đọc được.
 * - Ghi (`always`, không thử lại): **không có hàng đợi ghi khi mất mạng** — lệnh ghi chạy ngay, mất mạng thì báo lỗi; màn khoá nút ghi
 *   khi máy mất mạng (`OfflineGate`). Thử lại ngầm một lệnh ghi có thể ghi hai lần.
 */
export function createQueryClient(sources: Readonly<Record<Feature, DataSource>> = dataConfig.sources): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { networkMode: 'offlineFirst', retry: shouldRetryQuery },
      mutations: { networkMode: 'always', retry: false },
    },
  })
  for (const feature of FEATURES) {
    client.setQueryDefaults([feature], { networkMode: sources[feature] === 'http' ? 'online' : 'always' })
  }
  return client
}
