import { ApiError } from '@/data/http/api-error'
import { createFormatter } from '@/lib/format'
import { MockDbError } from '@/lib/mock-db'

import { dataErrorMessage } from './data-error'
import { createTranslator } from './translate'

const vi = createTranslator('vi')
const en = createTranslator('en')

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
  test('lỗi kho mẫu và lỗi backend cùng mã cho cùng một câu', () => {
    expect(dataErrorMessage(new MockDbError('NOT_SIGNED_IN', {}), vi)).toBe('Phiên đăng nhập đã hết, hãy đăng nhập lại.')
    expect(dataErrorMessage(new ApiError('NOT_SIGNED_IN', { status: 401 }), vi)).toBe('Phiên đăng nhập đã hết, hãy đăng nhập lại.')
  })

  test('lỗi mạng của backend có câu riêng; mã lạ và lỗi không có mã về câu chung', () => {
    expect(dataErrorMessage(new ApiError('NETWORK_ERROR'), en)).toBe('Could not reach the server. Check your connection and try again.')
    expect(dataErrorMessage(new ApiError('SOMETHING_NEW', { status: 400 }), vi)).toBe('Có lỗi xảy ra. Thử lại sau.')
    expect(dataErrorMessage(new Error('boom'), vi)).toBe('Có lỗi xảy ra. Thử lại sau.')
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
})
