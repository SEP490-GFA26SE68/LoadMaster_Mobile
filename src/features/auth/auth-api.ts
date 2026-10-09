/**
 * Hàm → endpoint backend; nối backend chỉ thêm adapter `http`.
 *   chưa nối: đăng nhập qua Keycloak của backend (realm dùng chung với bản web) — adapter kiểu `redirect`
 *   GET /api/users/me — hồ sơ người đang đăng nhập, đọc sau khi có token
 */
import { createAdapter } from '@/data/adapter'

import type { AuthAdapter } from './auth-adapter'
import { createMockAuth } from './auth-mock'

/** Adapter đăng nhập theo cấu hình nguồn dữ liệu của feature `auth`. Chỉ `AuthProvider` gọi. */
export const authAdapter = createAdapter<AuthAdapter>('auth', { mock: createMockAuth })
