import { ApiError } from '@/data/http'
import type { User } from '@/types/user'

import { isPasswordChangeRequired } from './auth-adapter'
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

const EMAIL = 'binh@longbinh.vn'
const PASSWORD = 'mat-khau-dung'

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
    passwordGrant: jest.fn(async (_username: string, _password: string): Promise<TokenSet> => tokens('RT-1')),
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
  test('gửi email và mật khẩu cho Keycloak, đọc hồ sơ bằng token vừa có; người dùng và mã tài xế là của backend', async () => {
    const { auth, oauth, readProfile } = setup()
    const session = await auth.signIn(EMAIL, PASSWORD)
    expect(oauth.passwordGrant).toHaveBeenCalledWith(EMAIL, PASSWORD)
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
    // Chỉ refresh token được cất; token truy cập ở trong bộ nhớ
    expect(savedOf(session.saved)).toEqual({ v: 1, refreshToken: 'RT-1', profile: PROFILE })
    expect(auth.backendUserId()).toBe('15')
    await expect(auth.accessToken()).resolves.toBe('AT-RT-1')
  })

  test('tài khoản chưa khai họ tên: hiện tên đăng nhập', async () => {
    const { auth } = setup({ readProfile: async () => ({ ...PROFILE, fullName: null, phoneNumber: null, companyId: null }) })
    const { user } = await auth.signIn(EMAIL, PASSWORD)
    expect(user).toMatchObject({ fullName: 'taixe.binh', phone: '' })
    expect(user).not.toHaveProperty('companyId')
  })

  test.each(['INVALID_CREDENTIALS', 'ACCOUNT_SUSPENDED', 'PASSWORD_CHANGE_REQUIRED', 'NETWORK_ERROR'])(
    'Keycloak từ chối (%s): lỗi giữ nguyên mã, không đọc hồ sơ, không có phiên nào để đóng',
    async (code) => {
      const { auth, oauth, readProfile } = setup()
      oauth.passwordGrant.mockRejectedValueOnce(new ApiError(code))
      await expect(auth.signIn(EMAIL, PASSWORD)).rejects.toMatchObject({ code })
      expect(readProfile).not.toHaveBeenCalled()
      expect(oauth.endSession).not.toHaveBeenCalled()
      expect(auth.backendUserId()).toBeNull()
    },
  )

  test('máy chủ đòi đặt mật khẩu mới: màn nhận ra mã đó', async () => {
    const { auth, oauth } = setup()
    oauth.passwordGrant.mockRejectedValueOnce(new ApiError('PASSWORD_CHANGE_REQUIRED', { status: 400 }))
    expect(isPasswordChangeRequired(await auth.signIn(EMAIL, PASSWORD).catch((error: unknown) => error))).toBe(true)
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
      'tài khoản Keycloak chưa gắn với người dùng nào của backend (404)',
      async () => {
        throw new ApiError('SERVER_ERROR', { status: 404 })
      },
      { code: 'PROFILE_NOT_FOUND' },
    ],
    [
      'như trên, máy chủ kèm mã USER_NOT_FOUND (404)',
      async () => {
        throw new ApiError('USER_NOT_FOUND', { status: 404 })
      },
      { code: 'PROFILE_NOT_FOUND' },
    ],
    [
      'máy chủ lỗi khi đọc hồ sơ (500)',
      async () => {
        throw new ApiError('SERVER_ERROR', { status: 500 })
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
    await expect(auth.signIn(EMAIL, PASSWORD)).rejects.toMatchObject(expected)
    expect(oauth.endSession).toHaveBeenCalledWith('RT-1')
    expect(auth.backendUserId()).toBeNull()
    await expect(auth.accessToken()).resolves.toBeNull()
  })

  test('Keycloak không cấp refresh token: không vào app (không giữ được phiên quá 60 giây)', async () => {
    const { auth, oauth, readProfile } = setup()
    oauth.passwordGrant.mockResolvedValueOnce({ accessToken: 'AT', refreshToken: null, expiresAt: clock + 60_000 })
    await expect(auth.signIn(EMAIL, PASSWORD)).rejects.toMatchObject({ code: 'SIGN_IN_FAILED' })
    expect(readProfile).not.toHaveBeenCalled()
    expect(auth.backendUserId()).toBeNull()
  })
})

describe('token', () => {
  test('sắp hết hạn: các lượt gọi cùng lúc chung một lần làm mới, refresh token mới được cất', async () => {
    const { auth, oauth, persist } = setup()
    await auth.signIn(EMAIL, PASSWORD)
    clock += 30_000
    await expect(auth.accessToken()).resolves.toBe('AT-RT-1')
    expect(oauth.refresh).not.toHaveBeenCalled()

    clock += 15_000 // còn 15 giây: dưới ngưỡng 20 giây
    await expect(Promise.all([auth.accessToken(), auth.accessToken(), auth.accessToken()])).resolves.toEqual(['AT-RT-1+', 'AT-RT-1+', 'AT-RT-1+'])
    expect(oauth.refresh).toHaveBeenCalledTimes(1)
    expect(oauth.refresh).toHaveBeenCalledWith('RT-1')
    expect(persist).toHaveBeenCalledTimes(1)
    expect(savedOf(persist.mock.calls[0]?.[0])).toEqual({ v: 1, refreshToken: 'RT-1+', profile: PROFILE })

    // Lần làm mới sau dùng refresh token vừa xoay vòng
    clock += 60_000
    await expect(auth.accessToken()).resolves.toBe('AT-RT-1++')
    expect(oauth.refresh).toHaveBeenLastCalledWith('RT-1+')
  })

  test('backend trả 401 cho token còn hạn: làm mới một lần cho mọi lượt gọi bị từ chối', async () => {
    const { auth, oauth } = setup()
    await auth.signIn(EMAIL, PASSWORD)
    await expect(Promise.all([auth.renewAccessToken('AT-RT-1'), auth.renewAccessToken('AT-RT-1')])).resolves.toEqual(['AT-RT-1+', 'AT-RT-1+'])
    expect(oauth.refresh).toHaveBeenCalledTimes(1)
    // Lượt gọi mang token cũ về muộn: token đã đổi, gọi lại bằng token mới mà không làm mới thêm
    await expect(auth.renewAccessToken('AT-RT-1')).resolves.toBe('AT-RT-1+')
    expect(oauth.refresh).toHaveBeenCalledTimes(1)
  })

  test('làm mới khi chưa đăng nhập: UNAUTHENTICATED', async () => {
    const { auth, oauth } = setup()
    await expect(auth.renewAccessToken('AT')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    expect(oauth.refresh).not.toHaveBeenCalled()
  })

  test('Keycloak không nhận refresh token nữa: UNAUTHENTICATED (app đăng xuất), phiên bị quên', async () => {
    const { auth, oauth } = setup()
    await auth.signIn(EMAIL, PASSWORD)
    oauth.refresh.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'))
    clock += 60_000
    await expect(auth.accessToken()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    expect(auth.backendUserId()).toBeNull()
    await expect(auth.accessToken()).resolves.toBeNull()
  })

  test('không tới được Keycloak: báo lỗi mạng nhưng giữ phiên, lượt sau làm mới lại', async () => {
    const { auth, oauth } = setup()
    await auth.signIn(EMAIL, PASSWORD)
    oauth.refresh.mockRejectedValueOnce(new ApiError('NETWORK_ERROR'))
    clock += 60_000
    await expect(auth.accessToken()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(auth.backendUserId()).toBe('15')
    await expect(auth.accessToken()).resolves.toBe('AT-RT-1+')
  })

  test('đăng xuất khi đang làm mới: quên ngay, lượt làm mới về sau không cất lại phiên', async () => {
    const { auth, oauth, persist } = setup()
    await auth.signIn(EMAIL, PASSWORD)
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

describe('đăng xuất', () => {
  test('đóng phiên ở Keycloak bằng refresh token đang giữ (đã xoay vòng)', async () => {
    const { auth, oauth } = setup()
    await auth.signIn(EMAIL, PASSWORD)
    clock += 60_000
    await auth.accessToken()
    await auth.signOut()
    expect(oauth.endSession).toHaveBeenCalledTimes(1)
    expect(oauth.endSession).toHaveBeenCalledWith('RT-1+')
    expect(auth.backendUserId()).toBeNull()
  })

  test('chưa đăng nhập: không gọi Keycloak', async () => {
    const { auth, oauth } = setup()
    await auth.signOut()
    expect(oauth.endSession).not.toHaveBeenCalled()
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

  test('tài khoản không còn gắn với người dùng của backend (404): không mở lại, đóng phiên ở Keycloak', async () => {
    const { auth, oauth, readProfile } = setup()
    readProfile.mockRejectedValueOnce(new ApiError('SERVER_ERROR', { status: 404 }))
    await expect(auth.restore(SAVED)).resolves.toBeNull()
    expect(oauth.endSession).toHaveBeenCalledWith('RT-9+')
    expect(auth.backendUserId()).toBeNull()
  })

  test('máy chủ lỗi khi đọc lại hồ sơ: vào bằng hồ sơ đã cất', async () => {
    const { auth, readProfile } = setup()
    readProfile.mockRejectedValueOnce(new ApiError('SERVER_ERROR', { status: 503 }))
    const session = await auth.restore(SAVED)
    expect(session?.user).toMatchObject({ id: '15', fullName: 'Trần Văn Bình' })
    expect(savedOf(session?.saved)).toMatchObject({ refreshToken: 'RT-9+' })
  })
})

test('feature khác còn ở kho mẫu: mã, công ty là của tài khoản mẫu cùng vai trò, kho của nó không chép sang; tên, email là của backend', async () => {
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
  const { user } = await auth.signIn(EMAIL, PASSWORD)
  expect(standIn.open).toHaveBeenCalledWith('driver')
  expect(user).toMatchObject({ id: 'US-0013', companyId: 'LOG-001', fullName: 'Trần Văn Bình', email: 'binh@longbinh.vn' })
  // Backend không có kho / chi nhánh: màn Tài khoản không hiện kho của tài khoản mẫu
  expect(user.depot).toBeUndefined()
  expect(auth.backendUserId()).toBe('15')

  await auth.signOut()
  expect(standIn.close).toHaveBeenCalledTimes(1)
  expect(oauth.endSession).toHaveBeenCalledWith('RT-1')
})
