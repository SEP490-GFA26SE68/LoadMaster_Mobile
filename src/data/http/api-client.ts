import { ApiError, isApiError } from './api-error'

/**
 * Nơi duy nhất của app gọi `fetch` tới backend LoadMaster (dùng chung với bản web). Mỗi lượt gọi: gắn token của phiên, giới hạn thời
 * gian, mở phong bì `{ success, code, message, data, errors }` của backend, và đổi mọi thất bại thành `ApiError` có mã.
 * Adapter `http` của các `-api.ts` dùng client này qua `api()` ở `./index.ts`; không nơi nào khác gọi `fetch`.
 */
export type ApiClientOptions = {
  readonly baseUrl: string
  /** Token truy cập của phiên hiện tại; `null` khi chưa đăng nhập. */
  readonly accessToken: () => Promise<string | null>
  /** Backend trả 401: phiên đã hết — nơi giữ phiên đăng xuất người dùng. */
  readonly onUnauthenticated?: () => void
  readonly fetch?: typeof fetch
  readonly timeoutMs?: number
}

export type QueryValue = string | number | boolean | null | undefined

export type RequestOptions = {
  readonly query?: Readonly<Record<string, QueryValue>>
  readonly body?: unknown
}

export type ApiClient = {
  get<T>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T>
  post<T>(path: string, options?: RequestOptions): Promise<T>
  put<T>(path: string, options?: RequestOptions): Promise<T>
  patch<T>(path: string, options?: RequestOptions): Promise<T>
  delete<T>(path: string, options?: RequestOptions): Promise<T>
}

type Envelope = { success?: unknown; code?: unknown; data?: unknown; errors?: unknown }

const DEFAULT_TIMEOUT_MS = 15_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function urlOf(baseUrl: string, path: string, query: RequestOptions['query']): string {
  const pairs = Object.entries(query ?? {}).filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== null)
  const search = pairs.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`).join('&')
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}${search === '' ? '' : `?${search}`}`
}

function codeOfStatus(status: number): string {
  if (status === 401) return 'UNAUTHENTICATED'
  if (status === 403) return 'UNAUTHORIZED'
  return 'SERVER_ERROR'
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.trim() === '') return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

export function createApiClient({ baseUrl, accessToken, onUnauthenticated, fetch: fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: ApiClientOptions): ApiClient {
  async function request<T>(method: string, path: string, { query, body }: RequestOptions = {}): Promise<T> {
    let token: string | null
    try {
      token = await accessToken()
    } catch (error) {
      // Máy chủ định danh không gia hạn phiên nữa: như backend trả 401. Endpoint mở (không đòi token) sẽ không bao giờ báo điều đó.
      if (isApiError(error) && error.code === 'UNAUTHENTICATED') onUnauthenticated?.()
      throw error
    }
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token !== null) headers.Authorization = `Bearer ${token}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let response: Response
    try {
      response = await fetchImpl(urlOf(baseUrl, path, query), {
        method,
        headers,
        signal: controller.signal,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch {
      throw new ApiError(controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR')
    } finally {
      clearTimeout(timer)
    }

    const payload = await readJson(response)
    const envelope: Envelope | null = isRecord(payload) && 'success' in payload ? payload : null

    if (!response.ok || envelope?.success === false) {
      if (response.status === 401) onUnauthenticated?.()
      const code = typeof envelope?.code === 'string' && envelope.code !== '' ? envelope.code : codeOfStatus(response.status)
      throw new ApiError(code, { status: response.status, params: isRecord(envelope?.errors) ? envelope.errors : {} })
    }
    return (envelope === null ? payload : envelope.data) as T
  }

  return {
    get: (path, options) => request('GET', path, options),
    post: (path, options) => request('POST', path, options),
    put: (path, options) => request('PUT', path, options),
    patch: (path, options) => request('PATCH', path, options),
    delete: (path, options) => request('DELETE', path, options),
  }
}
