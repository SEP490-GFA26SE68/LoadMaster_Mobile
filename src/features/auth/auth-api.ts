/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`auth-mock.ts` kho mẫu, `keycloak-auth.ts` backend).
 *   đăng nhập, làm mới token, đăng xuất   Keycloak của backend: /realms/{realm}/protocol/openid-connect/{auth,token,logout}
 *   readProfile                           GET /api/users/me
 */
import { createAdapter } from '@/data/adapter'
import { dataConfig, FEATURES } from '@/data/config'
import { ApiError, createApiClient } from '@/data/http'
import { getMockDb } from '@/data/mock-db'
import { DEMO_ACCOUNTS } from '@/lib/mock-db'
import { writeStored } from '@/lib/storage'

import { SESSION_KEY, type AuthAdapter } from './auth-adapter'
import { createMockAuth } from './auth-mock'
import { createKeycloakAuth, type StandIn } from './keycloak-auth'
import { createKeycloakOAuth } from './keycloak-oauth'

// GET /api/users/me — gọi bằng token vừa có, trước khi phiên vào app (client chung `api()` lấy token của phiên đang mở)
function readProfile(accessToken: string): Promise<unknown> {
  if (dataConfig.apiUrl === null) throw new ApiError('HTTP_NOT_WIRED')
  return createApiClient({ baseUrl: dataConfig.apiUrl, accessToken: async () => accessToken }).get('/api/users/me')
}

/**
 * Đăng nhập bằng backend mà feature khác còn chạy trên kho mẫu: kho mẫu mở phiên của tài khoản mẫu cùng vai trò, để chuyến, kiện mẫu
 * hiện như với người đó (cùng cách bản web làm).
 */
const mockStandIn: StandIn = {
  open(role) {
    const account = DEMO_ACCOUNTS.find((entry) => entry.role === role)
    return account === undefined ? null : getMockDb().restoreSession(account.id)
  },
  async close() {
    await getMockDb().signOut()
  },
}

function keycloakAuth(): AuthAdapter {
  // `resolveDataConfig` đã đòi đủ cấu hình Keycloak khi đăng nhập dùng backend
  if (dataConfig.keycloak === null) throw new ApiError('HTTP_NOT_WIRED', { params: { feature: 'auth' } })
  const usesMockData = FEATURES.some((feature) => feature !== 'auth' && dataConfig.sources[feature] === 'mock')
  return createKeycloakAuth({
    oauth: createKeycloakOAuth(dataConfig.keycloak),
    readProfile,
    persist: (saved) => writeStored(SESSION_KEY, saved),
    ...(usesMockData ? { standIn: mockStandIn } : {}),
  })
}

/** Adapter đăng nhập theo cấu hình nguồn dữ liệu của feature `auth`. Chỉ `AuthProvider` gọi. */
export const authAdapter = createAdapter<AuthAdapter>('auth', { mock: createMockAuth, http: keycloakAuth })
