import { dataConfig } from '../config'
import { createApiClient, type ApiClient } from './api-client'
import { ApiError } from './api-error'

export { createApiClient, type ApiClient, type RequestOptions } from './api-client'
export { ApiError, isApiError } from './api-error'

type AuthLink = {
  readonly accessToken: () => Promise<string | null>
  readonly onUnauthenticated: () => void
  /** Mã người đang đăng nhập (đăng nhập bằng backend: mã người dùng của backend); `null` khi chưa đăng nhập. */
  readonly userId: () => string | null
}

let link: AuthLink = { accessToken: async () => null, onUnauthenticated: () => {}, userId: () => null }
let client: ApiClient | undefined

/**
 * `AuthProvider` nối phiên đăng nhập vào client: token cho mỗi lượt gọi, việc phải làm khi backend báo phiên đã hết, và người đang
 * đăng nhập (endpoint của tài xế hiện nhận mã tài xế ở tham số thay vì đọc từ token).
 */
export function connectAuth(next: AuthLink): void {
  link = next
}

/** Mã người đang đăng nhập, cho adapter `http` cần gửi kèm; `null` khi chưa đăng nhập. */
export function currentUserId(): string | null {
  return link.userId()
}

/** Client của backend, dùng trong adapter `http` của các `-api.ts`. Chưa khai địa chỉ backend thì là lỗi `HTTP_NOT_WIRED`. */
export function api(): ApiClient {
  if (dataConfig.apiUrl === null) throw new ApiError('HTTP_NOT_WIRED')
  client ??= createApiClient({
    baseUrl: dataConfig.apiUrl,
    accessToken: () => link.accessToken(),
    onUnauthenticated: () => link.onUnauthenticated(),
  })
  return client
}
