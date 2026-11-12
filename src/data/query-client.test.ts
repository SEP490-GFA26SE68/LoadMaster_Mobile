import { ApiError } from './http'
import { createQueryClient, QUERY_RETRY_LIMIT, shouldRetryQuery } from './query-client'
import { FEATURES, type DataSource, type Feature } from './config'

describe('shouldRetryQuery', () => {
  it.each(['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'])('thử lại lỗi tạm thời %s', (code) => {
    expect(shouldRetryQuery(0, new ApiError(code))).toBe(true)
  })

  it('thử lại khi máy chủ quá tải hay hết giờ theo mã HTTP', () => {
    expect(shouldRetryQuery(0, new ApiError('CONFLICT', { status: 503 }))).toBe(true)
    expect(shouldRetryQuery(0, new ApiError('RATE', { status: 429 }))).toBe(true)
    expect(shouldRetryQuery(0, new ApiError('SLOW', { status: 408 }))).toBe(true)
  })

  it('không thử lại lỗi nghiệp vụ, phiên, quyền hay lỗi không phải của backend', () => {
    expect(shouldRetryQuery(0, new ApiError('TRIP_LOCKED', { status: 409 }))).toBe(false)
    expect(shouldRetryQuery(0, new ApiError('UNAUTHENTICATED', { status: 401 }))).toBe(false)
    expect(shouldRetryQuery(0, new ApiError('UNAUTHORIZED', { status: 403 }))).toBe(false)
    expect(shouldRetryQuery(0, new Error('boom'))).toBe(false)
  })

  it(`dừng sau ${QUERY_RETRY_LIMIT} lần thử lại`, () => {
    const error = new ApiError('NETWORK_ERROR')
    expect(shouldRetryQuery(QUERY_RETRY_LIMIT - 1, error)).toBe(true)
    expect(shouldRetryQuery(QUERY_RETRY_LIMIT, error)).toBe(false)
  })
})

describe('createQueryClient', () => {
  const sources = (http: readonly Feature[]): Record<Feature, DataSource> =>
    Object.fromEntries(FEATURES.map((feature) => [feature, http.includes(feature) ? 'http' : 'mock'])) as Record<Feature, DataSource>

  it('truy vấn của feature đọc backend tạm dừng khi mất mạng, của kho mẫu vẫn chạy', () => {
    const client = createQueryClient(sources(['driver', 'packages']))
    expect(client.getQueryDefaults(['driver', 'trips']).networkMode).toBe('online')
    expect(client.getQueryDefaults(['packages', 'lookup', 'x']).networkMode).toBe('online')
    expect(client.getQueryDefaults(['warehouse', 'tasks']).networkMode).toBe('always')
  })

  it('lệnh ghi không thử lại và không xếp hàng chờ mạng', () => {
    const client = createQueryClient(sources(['driver']))
    expect(client.getDefaultOptions().mutations).toMatchObject({ networkMode: 'always', retry: false })
    expect(client.getDefaultOptions().queries?.retry).toBe(shouldRetryQuery)
  })
})
