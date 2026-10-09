import { dataConfig, type DataConfig, type Feature } from './config'
import { ApiError } from './http/api-error'

/**
 * Hai cách lấy dữ liệu của một feature, cùng một hợp đồng `T`: kho mẫu và backend. `http` vắng nghĩa là feature chưa nối backend —
 * chọn nguồn `http` cho nó là lỗi `HTTP_NOT_WIRED` ở lần gọi đầu, không âm thầm dùng kho mẫu.
 */
export type Adapters<T> = {
  readonly mock: () => T
  readonly http?: () => T
}

/**
 * Trả hàm lấy adapter của feature theo cấu hình; adapter chỉ được dựng ở lần gọi đầu (kho mẫu không bị nạp khi feature dùng backend).
 * Mỗi `features/<tên>/<tên>-api.ts` gọi hàm này đúng một lần — đó là chỗ duy nhất của feature biết dữ liệu đến từ đâu.
 */
export function createAdapter<T>(feature: Feature, adapters: Adapters<T>, config: DataConfig = dataConfig): () => T {
  let built: T | undefined
  return () => {
    if (built === undefined) {
      const factory = config.sources[feature] === 'http' ? adapters.http : adapters.mock
      if (factory === undefined) throw new ApiError('HTTP_NOT_WIRED', { params: { feature } })
      built = factory()
    }
    return built
  }
}
