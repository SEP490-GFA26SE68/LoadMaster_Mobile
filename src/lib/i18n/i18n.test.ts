import { createApiClient } from '@/data/http/api-client'
import { ApiError } from '@/data/http/api-error'
import { createFormatter } from '@/lib/format'
import { MockDbError } from '@/lib/mock-db'

import { dataErrorMessage } from './data-error'
import { createTranslator } from './translate'

const vi = createTranslator('vi')
const en = createTranslator('en')

/** Lỗi client dựng từ một phản hồi giả của backend: phong bì có hoặc không có mã nghiệp vụ. */
async function refusal(status: number, code: string | null): Promise<ApiError> {
  const client = createApiClient({
    baseUrl: 'http://api.test',
    accessToken: async () => null,
    fetch: (async () =>
      ({
        ok: false,
        status,
        text: async () => JSON.stringify({ success: false, code, message: 'thông điệp thô', data: null }),
      }) as Response) as unknown as typeof fetch,
  })
  try {
    await client.get('/x')
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('lượt gọi không ném lỗi')
}

describe('createTranslator', () => {
  test('điền tham số; số viết theo ngôn ngữ', () => {
    expect(vi('driver.myTrips.packages', { count: 1280 })).toBe('1.280 kiện')
    expect(en('driver.myTrips.packages', { count: 1280 })).toBe('1,280 packages')
  })

  test('số nhiều: tiếng Anh đổi dạng khi đếm 1, tiếng Việt không đổi', () => {
    expect(en('driver.myTrips.stops', { count: 1 })).toBe('1 stop')
    expect(en('driver.myTrips.stops', { count: 4 })).toBe('4 stops')
    expect(vi('driver.myTrips.stops', { count: 1 })).toBe('1 điểm')
  })
})

describe('dataErrorMessage', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('lỗi kho mẫu và lỗi backend cùng mã cho cùng một câu', () => {
    expect(dataErrorMessage(new MockDbError('NOT_SIGNED_IN', {}), vi)).toBe('Phiên đăng nhập đã hết, hãy đăng nhập lại.')
    expect(dataErrorMessage(new ApiError('NOT_SIGNED_IN', { status: 401 }), vi)).toBe('Phiên đăng nhập đã hết, hãy đăng nhập lại.')
  })

  test('mã nghiệp vụ backend app chưa có câu: cùng câu với phản hồi cùng mã HTTP không kèm mã', async () => {
    for (const status of [400, 401, 403, 404, 409, 500]) {
      const [withCode, withoutCode] = await Promise.all([refusal(status, 'SOMETHING_NEW'), refusal(status, null)])
      expect(withCode.code).toBe('SOMETHING_NEW')
      expect(dataErrorMessage(withCode, vi)).toBe(dataErrorMessage(withoutCode, vi))
    }
    expect(dataErrorMessage(await refusal(400, 'SOMETHING_NEW'), vi)).toBe('Máy chủ gặp lỗi. Thử lại sau.')
    expect(dataErrorMessage(await refusal(401, 'SOMETHING_NEW'), vi)).toBe('Phiên đăng nhập đã hết, hãy đăng nhập lại.')
    expect(dataErrorMessage(await refusal(403, 'SOMETHING_NEW'), en)).toBe('You do not have permission to do this.')
    // Mã đã có câu vẫn dùng câu của mã, không theo mã HTTP
    expect(dataErrorMessage(await refusal(400, 'NOT_SIGNED_IN'), vi)).toBe('Phiên đăng nhập đã hết, hãy đăng nhập lại.')
  })

  test('lỗi mạng của backend có câu riêng; mã lạ không kèm phản hồi và lỗi không có mã về câu chung', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    expect(dataErrorMessage(new ApiError('NETWORK_ERROR'), en)).toBe('Could not reach the server. Check your connection and try again.')
    expect(dataErrorMessage(new ApiError('SOMETHING_NEW'), vi)).toBe('Có lỗi xảy ra. Thử lại sau.')
    expect(warn).not.toHaveBeenCalled()
    expect(dataErrorMessage(new Error('boom'), vi)).toBe('Có lỗi xảy ra. Thử lại sau.')
    // Lỗi không có mã là lỗi lập trình: người dùng thấy câu chung, nguyên nhân vào nhật ký của máy (AGENTS mục 9)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('[LoadMaster] lỗi không có mã:', expect.stringContaining('boom'))
  })
})

describe('createFormatter', () => {
  test('đơn vị và danh sách theo ngôn ngữ', () => {
    const format = createFormatter('vi-VN')
    expect(format.weight(8240)).toBe('8.240 kg')
    expect(format.dimensions(720, 235, 240)).toBe('720 × 235 × 240 cm')
    expect(format.list(['PKG-007', 'PKG-008', 'PKG-009'])).toBe('PKG-007, PKG-008 và PKG-009')
    expect(format.date('2026-09-14T07:30:00+07:00')).toBe('14/09/2026')
  })

  test('máy không có Intl.ListFormat (Hermes): tự ghép danh sách bằng liên từ của từ điển', () => {
    const listFormat = Object.getOwnPropertyDescriptor(Intl, 'ListFormat')
    Object.defineProperty(Intl, 'ListFormat', { value: undefined, configurable: true })
    try {
      expect(createFormatter('vi-VN').list(['PKG-007', 'PKG-008', 'PKG-009'])).toBe('PKG-007, PKG-008 và PKG-009')
      expect(createFormatter('en-US').list(['PKG-007', 'PKG-008'])).toBe('PKG-007 and PKG-008')
      expect(createFormatter('vi-VN').list(['PKG-007'])).toBe('PKG-007')
    } finally {
      if (listFormat) Object.defineProperty(Intl, 'ListFormat', listFormat)
    }
  })
})
