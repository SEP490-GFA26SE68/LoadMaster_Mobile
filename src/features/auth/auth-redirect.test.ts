import { redirectSystemPath } from '@/app/+native-intent'

import { isAuthRedirect } from './auth-redirect'

describe('lượt Keycloak trả người dùng về app', () => {
  test.each([
    ['loadmaster://auth?code=abc&state=xyz', true],
    ['loadmaster:///auth?code=abc', true],
    ['loadmaster://auth/', true],
    ['exp://192.168.1.5:8081/--/auth?code=abc', true],
    ['/auth?code=abc', true],
    ['loadmaster://trip/41', false],
    ['loadmaster://trips', false],
    ['loadmaster://author', false],
    ['/', false],
  ])('%s → %s', (url, expected) => {
    expect(isAuthRedirect(url)).toBe(expected)
  })

  test('router không mở màn nào khi app đang chạy; mở lạnh thì về màn đầu; địa chỉ khác đi tiếp', async () => {
    expect(await redirectSystemPath?.({ path: 'loadmaster://auth?code=abc', initial: false })).toBeNull()
    expect(await redirectSystemPath?.({ path: 'loadmaster://auth?code=abc', initial: true })).toBe('/')
    expect(await redirectSystemPath?.({ path: 'loadmaster://trip/41', initial: false })).toBe('loadmaster://trip/41')
  })
})
