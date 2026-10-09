import { dataConfig } from '../config'
import { createApiClient, type ApiClient } from './api-client'
import { ApiError } from './api-error'

export { createApiClient, type ApiClient, type RequestOptions } from './api-client'
export { ApiError, isApiError } from './api-error'

type AuthLink = {
  readonly accessToken: () => Promise<string | null>
  readonly onUnauthenticated: () => void
}

let link: AuthLink = { accessToken: async () => null, onUnauthenticated: () => {} }
let client: ApiClient | undefined

/** `AuthProvider` nối phiên đăng nhập vào client: token cho mỗi lượt gọi, và việc phải làm khi backend báo phiên đã hết. */
export function connectAuth(next: AuthLink): void {
  link = next
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
