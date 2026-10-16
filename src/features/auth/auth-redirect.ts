/** Keycloak trả người dùng về `loadmaster://auth?code=…` sau khi đăng nhập; client của realm phải khai địa chỉ này. */
export const AUTH_REDIRECT_PATH = 'auth'

const SCHEME_AND_HOST = /^[a-z][a-z0-9+.-]*:\/\//i

/**
 * Địa chỉ mở app có phải lượt Keycloak trả người dùng về không: `loadmaster://auth?…` (bản dựng của app), `exp://<máy>/--/auth?…`
 * (Expo Go), hoặc đường dẫn `/auth`.
 */
export function isAuthRedirect(url: string): boolean {
  const path = url.replace(SCHEME_AND_HOST, '').split(/[?#]/)[0] ?? ''
  return path.replace(/\/+$/, '').split('/').at(-1) === AUTH_REDIRECT_PATH
}
