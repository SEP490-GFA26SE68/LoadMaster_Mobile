import { resolveDataConfig } from './config'

describe('resolveDataConfig', () => {
  test('không khai gì: mọi feature dùng kho mẫu', () => {
    expect(resolveDataConfig({})).toEqual({ sources: { auth: 'mock', driver: 'mock' }, apiUrl: null, mode: 'mock' })
  })

  test('nối từng feature: feature khai trong danh sách dùng backend, phần còn lại ở kho mẫu', () => {
    const config = resolveDataConfig({ httpFeatures: ' auth ', apiUrl: 'http://10.0.2.2:8080/' })
    expect(config).toEqual({ sources: { auth: 'http', driver: 'mock' }, apiUrl: 'http://10.0.2.2:8080', mode: 'mixed' })
  })

  test('mặc định http: mọi feature dùng backend', () => {
    expect(resolveDataConfig({ defaultSource: 'HTTP', apiUrl: 'https://api.example.test' }).mode).toBe('http')
  })

  test('tên feature lạ là lỗi, không bị bỏ qua', () => {
    expect(() => resolveDataConfig({ httpFeatures: 'auth,trip', apiUrl: 'http://x.test' })).toThrow(/trip/)
  })

  test('dùng backend mà thiếu địa chỉ là lỗi', () => {
    expect(() => resolveDataConfig({ httpFeatures: 'auth' })).toThrow(/EXPO_PUBLIC_API_URL/)
  })

  test('feature dùng backend trong khi đăng nhập còn giả lập là lỗi', () => {
    expect(() => resolveDataConfig({ httpFeatures: 'driver', apiUrl: 'http://x.test' })).toThrow(/auth/)
  })
})
