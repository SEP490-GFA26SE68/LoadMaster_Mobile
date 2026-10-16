import { ApiError } from '@/data/http'
import type { User } from '@/types/user'

import { isSignInCancelled } from './auth-adapter'
import { createKeycloakAuth, type KeycloakAuthDeps } from './keycloak-auth'
import type { TokenSet } from './keycloak-oauth'

/** Hồ sơ `GET /api/users/me` của một tài xế. */
const PROFILE = {
  id: 15,
  keycloakId: 'kc-15',
  username: 'taixe.binh',
  email: 'binh@longbinh.vn',
  fullName: 'Trần Văn Bình',
  phoneNumber: '0901234567',
  companyId: 3,
  userRoleType: 'DRIVER',
  status: 'ACTIVE',
}

const SAVED = JSON.stringify({ v: 1, refreshToken: 'RT-9', profile: PROFILE })

let clock = 1_000_000

/** Token truy cập sống 60 giây như realm của backend. */
const tokens = (refreshToken: string): TokenSet => ({ accessToken: `AT-${refreshToken}`, refreshToken, expiresAt: clock + 60_000 })

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

function setup(overrides: Partial<KeycloakAuthDeps> = {}) {
  const oauth = {
    authorize: jest.fn(async (): Promise<TokenSet | null> => tokens('RT-1')),
    // Mỗi lần làm mới Keycloak cấp refresh token mới
    refresh: jest.fn(async (refreshToken: string): Promise<TokenSet> => tokens(`${refreshToken}+`)),
    endSession: jest.fn(async (_refreshToken: string) => undefined),
  }
  const readProfile = jest.fn(async (_accessToken: string): Promise<unknown> => PROFILE)
  const persist = jest.fn(async (_saved: string) => undefined)
  const auth = createKeycloakAuth({ oauth, readProfile, persist, now: () => clock, ...overrides })
  return { auth, oauth, readProfile, persist }
}

const savedOf = (value: string | undefined) => JSON.parse(String(value)) as unknown

beforeEach(() => {
  clock = 1_000_000
})

describe('đăng nhập', () => {
  test('mở trang đăng nhập, đọc hồ sơ bằng token vừa có; người dùng và mã tài xế là của backend', async () => {
    const { auth, readProfile } = setup()
    const session = await auth.signIn()
    expect(readProfile).toHaveBeenCalledWith('AT-RT-1')
    expect(session.user).toEqual({
      id: '15',
      fullName: 'Trần Văn Bình',
      email: 'binh@longbinh.vn',
      phone: '0901234567',
      role: 'driver',
      status: 'active',
      lastActiveAt: null,
      companyId: '3',
    })
    expect(savedOf(session.saved)).toEqual({ v: 1, refreshToken: 'RT-1', profile: PROFILE })
    expect(auth.backendUserId()).toBe('15')
    await expect(auth.accessToken()).resolves.toBe('AT-RT-1')
  })

  test('tài khoản chưa khai họ tên: hiện tên đăng nhập', async () => {
    const { auth } = setup({ readProfile: async () => ({ ...PROFILE, fullName: null, phoneNumber: null, companyId: null }) })
    const { user } = await auth.signIn()
    expect(user).toMatchObject({ fullName: 'taixe.binh', phone: '' })
    expect(user).not.toHaveProperty('companyId')
  })

  test('người dùng đóng trang đăng nhập: SIGN_IN_CANCELLED, không đọc hồ sơ', async () => {
    const { auth, oauth, readProfile } = setup()
    oauth.authorize.mockResolvedValueOnce(null)
    expect(isSignInCancelled(await auth.signIn().catch((error: unknown) => error))).toBe(true)
    expect(readProfile).not.toHaveBeenCalled()
    expect(auth.backendUserId()).toBeNull()
  })

  const refused: readonly (readonly [string, () => Promise<unknown>, Record<string, unknown>])[] = [
    ['vai trò app chưa biết', async () => ({ ...PROFILE, userRoleType: 'ACCOUNTANT' }), { code: 'ROLE_UNKNOWN', params: { role: 'ACCOUNTANT' } }],
    ['tài khoản bị khoá', async () => ({ ...PROFILE, status: 'INACTIVE' }), { code: 'ACCOUNT_SUSPENDED' }],
    [
      'backend không nhận token Keycloak vừa cấp (401)',
      async () => {
        throw new ApiError('UNAUTHENTICATED', { status: 401 })
      },
      { code: 'SIGN_IN_REJECTED' },
    ],
    [
      'backend chưa có hồ sơ của tài khoản (404)',
      async () => {
        throw new ApiError('SERVER_ERROR', { status: 404 })
      },
      { code: 'PROFILE_UNAVAILABLE' },
    ],
    ['hồ sơ sai dạng', async () => ({ id: 'mười lăm' }), { code: 'PROFILE_UNAVAILABLE' }],
    [
      'mất mạng khi đọc hồ sơ',
      async () => {
        throw new ApiError('NETWORK_ERROR')
      },
      { code: 'NETWORK_ERROR' },
    ],
  ]

  test.each(refused)('%s: không vào app, đóng luôn phiên vừa mở ở Keycloak', async (_case, readProfile, expected) => {
    const { auth, oauth } = setup({ readProfile })
    await expect(auth.signIn()).rejects.toMatchObject(expected)
    expect(oauth.endSession).toHaveBeenCalledWith('RT-1')
    expect(auth.backendUserId()).toBeNull()
    await expect(auth.accessToken()).resolves.toBeNull()
  })
})

describe('token', () => {
  test('sắp hết hạn: các lượt gọi cùng lúc chung một lần làm mới, refresh token mới được cất', async () => {
    const { auth, oauth, persist } = setup()
    await auth.signIn()
    clock += 30_000
    await expect(auth.accessToken()).resolves.toBe('AT-RT-1')
    expect(oauth.refresh).not.toHaveBeenCalled()

    clock += 15_000 // còn 15 giây: dưới ngưỡng 20 giây
    await expect(Promise.all([auth.accessToken(), auth.accessToken(), auth.accessToken()])).resolves.toEqual(['AT-RT-1+', 'AT-RT-1+', 'AT-RT-1+'])
    expect(oauth.refresh).toHaveBeenCalledTimes(1)
    expect(oauth.refresh).toHaveBeenCalledWith('RT-1')
    expect(persist).toHaveBeenCalledTimes(1)
    expect(savedOf(persist.mock.calls[0]?.[0])).toEqual({ v: 1, refreshToken: 'RT-1+', profile: PROFILE })
  })

  test('Keycloak không nhận refresh token nữa: UNAUTHENTICATED (app đăng xuất), phiên bị quên', async () => {
    const { auth, oauth } = setup()
    await auth.signIn()
    oauth.refresh.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'))
    clock += 60_000
    await expect(auth.accessToken()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    expect(auth.backendUserId()).toBeNull()
    await expect(auth.accessToken()).resolves.toBeNull()
  })

  test('không tới được Keycloak: báo lỗi mạng nhưng giữ phiên, lượt sau làm mới lại', async () => {
    const { auth, oauth } = setup()
    await auth.signIn()
    oauth.refresh.mockRejectedValueOnce(new ApiError('NETWORK_ERROR'))
    clock += 60_000
    await expect(auth.accessToken()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(auth.backendUserId()).toBe('15')
    await expect(auth.accessToken()).resolves.toBe('AT-RT-1+')
  })

  test('đăng xuất khi đang làm mới: quên ngay, lượt làm mới về sau không cất lại phiên', async () => {
    const { auth, oauth, persist } = setup()
    await auth.signIn()
    const pending = deferred<TokenSet>()
    oauth.refresh.mockReturnValueOnce(pending.promise)
    clock += 60_000
    const call = auth.accessToken()
    const closing = auth.signOut()
    expect(auth.backendUserId()).toBeNull()

    pending.resolve(tokens('RT-2'))
    await expect(call).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await closing
    expect(persist).not.toHaveBeenCalled()
    expect(oauth.endSession).toHaveBeenCalledWith('RT-1')
    await expect(auth.accessToken()).resolves.toBeNull()
  })
})

describe('mở lại phiên đã cất', () => {
  test('làm mới token rồi đọc lại hồ sơ; chuỗi cất mới mang refresh token mới và hồ sơ mới', async () => {
    const { auth, oauth, readProfile } = setup()
    readProfile.mockResolvedValueOnce({ ...PROFILE, fullName: 'Trần Văn Bình Minh' })
    const session = await auth.restore(SAVED)
    expect(oauth.refresh).toHaveBeenCalledWith('RT-9')
    expect(readProfile).toHaveBeenCalledWith('AT-RT-9+')
    expect(session?.user).toMatchObject({ id: '15', fullName: 'Trần Văn Bình Minh', role: 'driver' })
    expect(savedOf(session?.saved)).toMatchObject({ refreshToken: 'RT-9+', profile: { fullName: 'Trần Văn Bình Minh' } })
  })

  test('mất sóng lúc mở app: vào bằng hồ sơ đã cất, có mạng lại thì làm mới', async () => {
    const { auth, oauth, readProfile } = setup()
    oauth.refresh.mockRejectedValueOnce(new ApiError('NETWORK_ERROR'))
    const session = await auth.restore(SAVED)
    expect(session?.user).toMatchObject({ id: '15', fullName: 'Trần Văn Bình' })
    expect(readProfile).not.toHaveBeenCalled()
    expect(auth.backendUserId()).toBe('15')
    await expect(auth.accessToken()).resolves.toBe('AT-RT-9+')
  })

  test('phiên ở Keycloak đã hết, hoặc chuỗi cất không phải phiên Keycloak (đổi từ kho mẫu): không mở lại', async () => {
    const { auth, oauth } = setup()
    oauth.refresh.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'))
    await expect(auth.restore(SAVED)).resolves.toBeNull()
    await expect(auth.restore('US-0013')).resolves.toBeNull()
    expect(oauth.refresh).toHaveBeenCalledTimes(1)
    expect(auth.backendUserId()).toBeNull()
  })

  test('tài khoản đã bị khoá từ lần trước: không mở lại, đóng phiên ở Keycloak', async () => {
    const { auth, oauth, readProfile } = setup()
    readProfile.mockResolvedValueOnce({ ...PROFILE, status: 'INACTIVE' })
    await expect(auth.restore(SAVED)).resolves.toBeNull()
    expect(oauth.endSession).toHaveBeenCalledWith('RT-9+')
    expect(auth.backendUserId()).toBeNull()
  })
})

test('feature khác còn ở kho mẫu: mã, công ty, kho là của tài khoản mẫu cùng vai trò; tên, email là của backend', async () => {
  const standInUser: User = {
    id: 'US-0013',
    fullName: 'Tài xế mẫu',
    email: 'taixe@longbinh.vn',
    phone: '',
    role: 'driver',
    status: 'active',
    depot: 'Kho Long Bình',
    lastActiveAt: null,
    companyId: 'LOG-001',
  }
  const standIn = { open: jest.fn((): User | null => standInUser), close: jest.fn(async () => undefined) }
  const { auth, oauth } = setup({ standIn })
  const { user } = await auth.signIn()
  expect(standIn.open).toHaveBeenCalledWith('driver')
  expect(user).toMatchObject({ id: 'US-0013', companyId: 'LOG-001', depot: 'Kho Long Bình', fullName: 'Trần Văn Bình', email: 'binh@longbinh.vn' })
  expect(auth.backendUserId()).toBe('15')

  await auth.signOut()
  expect(standIn.close).toHaveBeenCalledTimes(1)
  expect(oauth.endSession).toHaveBeenCalledWith('RT-1')
})
