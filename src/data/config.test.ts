import { resolveDataConfig } from './config'

const KEYCLOAK = { keycloakUrl: 'http://localhost:8180/', keycloakRealm: 'loadmaster', keycloakClientId: 'loadmaster-mobile' }

describe('resolveDataConfig', () => {
  test('không khai gì: mọi feature dùng kho mẫu', () => {
    expect(resolveDataConfig({})).toEqual({
      sources: { auth: 'mock', driver: 'mock', warehouse: 'mock', packages: 'mock' },
      apiUrl: null,
      keycloak: null,
      mode: 'mock',
    })
  })

  test('nối từng feature: feature khai trong danh sách dùng backend, phần còn lại ở kho mẫu', () => {
    const config = resolveDataConfig({ httpFeatures: ' auth ', apiUrl: 'http://10.0.2.2:8080/', ...KEYCLOAK })
    expect(config).toEqual({
      sources: { auth: 'http', driver: 'mock', warehouse: 'mock', packages: 'mock' },
      apiUrl: 'http://10.0.2.2:8080',
      keycloak: { issuer: 'http://localhost:8180/realms/loadmaster', clientId: 'loadmaster-mobile' },
      mode: 'mixed',
    })
  })

  test('mặc định http: mọi feature dùng backend', () => {
    expect(resolveDataConfig({ defaultSource: 'HTTP', apiUrl: 'https://api.example.test', ...KEYCLOAK }).mode).toBe('http')
  })

  test('tên feature lạ là lỗi, không bị bỏ qua', () => {
    expect(() => resolveDataConfig({ httpFeatures: 'auth,trip', apiUrl: 'http://x.test', ...KEYCLOAK })).toThrow(/trip/)
  })

  test('dùng backend mà thiếu địa chỉ là lỗi', () => {
    expect(() => resolveDataConfig({ httpFeatures: 'auth', ...KEYCLOAK })).toThrow(/EXPO_PUBLIC_API_URL/)
  })

  test('feature dùng backend trong khi đăng nhập còn giả lập là lỗi', () => {
    expect(() => resolveDataConfig({ httpFeatures: 'driver', apiUrl: 'http://x.test' })).toThrow(/auth/)
  })

  test('đăng nhập bằng backend mà thiếu một biến Keycloak là lỗi', () => {
    expect(() => resolveDataConfig({ httpFeatures: 'auth', apiUrl: 'http://x.test', ...KEYCLOAK, keycloakClientId: ' ' })).toThrow(
      /EXPO_PUBLIC_KEYCLOAK_CLIENT_ID/,
    )
  })
})
