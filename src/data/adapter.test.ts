import { createAdapter } from './adapter'
import { resolveDataConfig } from './config'
import { isApiError } from './http/api-error'

const onMock = resolveDataConfig({})
const onHttp = resolveDataConfig({ defaultSource: 'http', apiUrl: 'http://x.test' })

describe('createAdapter', () => {
  test('chọn adapter theo nguồn của feature và chỉ dựng một lần, ở lần gọi đầu', () => {
    const mock = jest.fn(() => ({ source: 'mock' }))
    const http = jest.fn(() => ({ source: 'http' }))

    const fromMock = createAdapter('driver', { mock, http }, onMock)
    expect(mock).not.toHaveBeenCalled()
    expect(fromMock()).toEqual({ source: 'mock' })
    expect(fromMock()).toBe(fromMock())
    expect(mock).toHaveBeenCalledTimes(1)
    expect(http).not.toHaveBeenCalled()

    expect(createAdapter('driver', { mock, http }, onHttp)()).toEqual({ source: 'http' })
  })

  test('feature chưa có adapter http mà cấu hình chọn backend: lỗi HTTP_NOT_WIRED, không quay về kho mẫu', () => {
    const mock = jest.fn(() => ({}))
    const adapter = createAdapter('driver', { mock }, onHttp)
    let thrown: unknown
    try {
      adapter()
    } catch (error) {
      thrown = error
    }
    expect(isApiError(thrown) && thrown.code).toBe('HTTP_NOT_WIRED')
    expect(mock).not.toHaveBeenCalled()
  })
})
