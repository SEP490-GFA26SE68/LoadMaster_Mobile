/**
 * Nguồn dữ liệu của từng feature: kho mẫu trong máy (`mock`) hoặc backend (`http`). Backend dùng chung với bản web và chưa có đủ mọi
 * phần, nên app nối **từng feature một**: feature nào backend đã sẵn thì khai ở `EXPO_PUBLIC_HTTP_FEATURES`, phần còn lại vẫn chạy
 * trên kho mẫu. Màn và hook không đọc file này — chỉ lớp `-api.ts` của feature (qua `createAdapter`) và màn Tài khoản.
 */

/** Feature có lớp dữ liệu riêng. Thêm feature mới thì thêm tên vào đây, trong cùng issue với `-api.ts` của nó. */
export const FEATURES = ['auth', 'driver'] as const

export type Feature = (typeof FEATURES)[number]

export type DataSource = 'mock' | 'http'

export type DataEnv = {
  readonly defaultSource?: string | undefined
  readonly httpFeatures?: string | undefined
  readonly apiUrl?: string | undefined
  readonly keycloakUrl?: string | undefined
  readonly keycloakRealm?: string | undefined
  readonly keycloakClientId?: string | undefined
}

/** Keycloak của backend (realm dùng chung với bản web): `issuer` là `<địa chỉ>/realms/<realm>`, không có dấu `/` cuối. */
export type KeycloakConfig = {
  readonly issuer: string
  readonly clientId: string
}

export type DataConfig = {
  readonly sources: Readonly<Record<Feature, DataSource>>
  /** Địa chỉ gốc của backend, không có dấu `/` cuối; `null` khi mọi feature dùng kho mẫu và không khai địa chỉ. */
  readonly apiUrl: string | null
  /** Có khi đăng nhập dùng backend; `null` khi đăng nhập trên kho mẫu. */
  readonly keycloak: KeycloakConfig | null
  readonly mode: 'mock' | 'http' | 'mixed'
}

function isFeature(name: string): name is Feature {
  return FEATURES.some((feature) => feature === name)
}

const trimmed = (value: string | undefined) => value?.trim() || null

function keycloakOf(env: DataEnv): KeycloakConfig {
  const url = trimmed(env.keycloakUrl)?.replace(/\/+$/, '') ?? null
  const realm = trimmed(env.keycloakRealm)
  const clientId = trimmed(env.keycloakClientId)
  if (url === null || realm === null || clientId === null) {
    throw new Error('Đăng nhập bằng backend cần đủ EXPO_PUBLIC_KEYCLOAK_URL, EXPO_PUBLIC_KEYCLOAK_REALM, EXPO_PUBLIC_KEYCLOAK_CLIENT_ID')
  }
  return { issuer: `${url}/realms/${encodeURIComponent(realm)}`, clientId }
}

/**
 * Đọc cấu hình từ biến môi trường. Cấu hình sai là lỗi ngay lúc mở app (không âm thầm quay về kho mẫu): tên feature lạ, dùng backend
 * mà thiếu địa chỉ, đăng nhập bằng backend mà thiếu Keycloak, hoặc nối một feature vào backend trong khi đăng nhập còn là giả lập —
 * backend cần token của phiên thật. Chiều ngược lại chạy được: đăng nhập bằng backend, feature còn ở kho mẫu thì kho mẫu mở phiên của
 * tài khoản mẫu cùng vai trò (`auth-api.ts`).
 */
export function resolveDataConfig(env: DataEnv): DataConfig {
  const fallback: DataSource = env.defaultSource?.trim().toLowerCase() === 'http' ? 'http' : 'mock'
  const wired = (env.httpFeatures ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '')
  const unknown = wired.filter((name) => !isFeature(name))
  if (unknown.length > 0) throw new Error(`EXPO_PUBLIC_HTTP_FEATURES có tên feature không tồn tại: ${unknown.join(', ')}`)

  const sourceOfFeature = (feature: Feature): DataSource => (fallback === 'http' || wired.includes(feature) ? 'http' : 'mock')
  const sources: Record<Feature, DataSource> = { auth: sourceOfFeature('auth'), driver: sourceOfFeature('driver') }
  const onHttp = FEATURES.filter((feature) => sources[feature] === 'http')
  const onMock = FEATURES.filter((feature) => sources[feature] === 'mock')
  const apiUrl = trimmed(env.apiUrl)?.replace(/\/+$/, '') ?? null

  if (onHttp.length > 0 && apiUrl === null) throw new Error('Có feature dùng backend nhưng thiếu EXPO_PUBLIC_API_URL')
  if (onHttp.length > 0 && sources.auth !== 'http') {
    throw new Error(`Feature ${onHttp.join(', ')} dùng backend thì "auth" cũng phải dùng backend: backend cần token của phiên đăng nhập thật`)
  }
  const keycloak = sources.auth === 'http' ? keycloakOf(env) : null
  return { sources, apiUrl, keycloak, mode: onHttp.length === 0 ? 'mock' : onMock.length === 0 ? 'http' : 'mixed' }
}

/** Cấu hình của lần chạy này. Expo chỉ thay thế `process.env.EXPO_PUBLIC_*` khi tên biến viết đầy đủ như dưới đây. */
export const dataConfig: DataConfig = resolveDataConfig({
  defaultSource: process.env.EXPO_PUBLIC_DATA_SOURCE,
  httpFeatures: process.env.EXPO_PUBLIC_HTTP_FEATURES,
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  keycloakUrl: process.env.EXPO_PUBLIC_KEYCLOAK_URL,
  keycloakRealm: process.env.EXPO_PUBLIC_KEYCLOAK_REALM,
  keycloakClientId: process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID,
})
