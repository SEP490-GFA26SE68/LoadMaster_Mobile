import { ApiError } from '@/data/http'

import { GPS_RETRY_MAX_MS, gpsRetryDelayMs, isTransientGpsError } from './useDeviceLocation'

describe('GPS thật: lỗi gửi vị trí', () => {
  test('mất mạng, hết giờ, máy chủ lỗi hoặc quá tải là lỗi tạm thời — giữ GPS bật', () => {
    expect(isTransientGpsError(new ApiError('NETWORK_ERROR'))).toBe(true)
    expect(isTransientGpsError(new ApiError('TIMEOUT'))).toBe(true)
    expect(isTransientGpsError(new ApiError('SERVER_ERROR', { status: 503 }))).toBe(true)
    expect(isTransientGpsError(new ApiError('CONFLICT', { status: 429 }))).toBe(true)
  })

  test('chuyến không còn chạy, nguồn từ chối hay lỗi không phải của mạng thì tắt GPS', () => {
    expect(isTransientGpsError(new ApiError('TRIP_NOT_IN_TRANSIT', { status: 400 }))).toBe(false)
    expect(isTransientGpsError(new ApiError('UNAUTHORIZED', { status: 403 }))).toBe(false)
    expect(isTransientGpsError(new Error('kho mẫu từ chối'))).toBe(false)
  })

  test('thử lại giãn dần 30 → 60 → 120 giây rồi giữ ở 120 giây', () => {
    expect([1, 2, 3, 4, 8].map(gpsRetryDelayMs)).toEqual([30_000, 60_000, 120_000, 120_000, GPS_RETRY_MAX_MS])
  })
})
