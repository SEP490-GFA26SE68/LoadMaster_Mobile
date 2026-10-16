import type { NativeIntent } from 'expo-router'

import { isAuthRedirect } from '@/features/auth/auth-redirect'

/**
 * Địa chỉ mở app từ bên ngoài. Lượt Keycloak trả người dùng về (`loadmaster://auth?code=…`) do thư viện đăng nhập tự đọc: router không
 * mở màn nào (không có route `auth`); app bị mở lạnh bằng địa chỉ đó thì về màn đầu.
 */
export const redirectSystemPath: NativeIntent['redirectSystemPath'] = ({ path, initial }) => {
  if (isAuthRedirect(path)) return initial ? '/' : null
  return path
}
