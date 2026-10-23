import { act, cleanup, fireEvent, screen } from '@testing-library/react-native'
import { router, type Href } from 'expo-router'
import { renderRouter } from 'expo-router/testing-library'

import { resetMockDb } from '@/data/mock-db'
import { SESSION_KEY } from '@/features/auth/auth-adapter'
import { DEMO_ACCOUNTS } from '@/lib/mock-db'
import { MockDbError } from '@/lib/mock-db/errors'
import { readStored } from '@/lib/storage'
import { clearStored, signInAs } from '@/test/render'
import { ROLES, type Role } from '@/types/user'

// Đi qua router thật và các route của `src/app` (`setup.ts` thay `expo-router` bằng router giả cho các test màn khác).
jest.unmock('expo-router')

/** Lỗi màn Tài khoản / Thông báo / Đăng nhập ném ra lúc vẽ; `undefined` là màn vẽ bình thường. */
let mockAccountFailure: unknown
let mockNotificationsFailure: unknown
let mockSignInFailure: unknown

jest.mock('@/features/auth/AccountScreen', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react')
  const actual = jest.requireActual<typeof import('@/features/auth/AccountScreen')>('@/features/auth/AccountScreen')
  return {
    AccountScreen: () => {
      if (mockAccountFailure !== undefined) throw mockAccountFailure
      return createElement(actual.AccountScreen)
    },
  }
})

jest.mock('@/features/driver/NotificationsScreen', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react')
  const actual = jest.requireActual<typeof import('@/features/driver/NotificationsScreen')>('@/features/driver/NotificationsScreen')
  return {
    NotificationsScreen: () => {
      if (mockNotificationsFailure !== undefined) throw mockNotificationsFailure
      return createElement(actual.NotificationsScreen)
    },
  }
})

jest.mock('@/features/auth/SignInScreen', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react')
  const actual = jest.requireActual<typeof import('@/features/auth/SignInScreen')>('@/features/auth/SignInScreen')
  return {
    SignInScreen: () => {
      if (mockSignInFailure !== undefined) throw mockSignInFailure
      return createElement(actual.SignInScreen)
    },
  }
})

function emailOf(role: Role): string {
  const account = DEMO_ACCOUNTS.find((item) => item.role === role)
  if (account === undefined) throw new Error(`Kho mẫu không có tài khoản dùng thử của vai trò ${role}`)
  return account.email
}

/** Một route trong trạng thái của router: tên, khoá và navigator lồng bên trong (nếu có). */
type RouteNode = { readonly name: string; readonly key?: string; readonly state?: { readonly routes: readonly RouteNode[] } }

type OpenedApp = {
  /** Đường dẫn đang hiện. */
  pathname(): string
  /** Các route của stack gốc (`(app)` · `sign-in` · `+not-found`): trạng thái của router bọc stack đó trong route `__root`. */
  rootRoutes(): readonly RouteNode[]
}

/** Mở app ở `url` như khi mở từ một liên kết. */
async function openApp(url: string): Promise<OpenedApp> {
  const rendered = renderRouter('src/app', { initialUrl: url })
  await rendered
  return {
    pathname: () => rendered.getPathname(),
    rootRoutes: () => rendered.getRouterState()?.routes[0]?.state?.routes ?? [],
  }
}

const UNCODED_PREFIX = '[LoadMaster] lỗi không có mã:'

beforeEach(() => {
  resetMockDb()
  clearStored()
  mockAccountFailure = undefined
  mockNotificationsFailure = undefined
  mockSignInFailure = undefined
})

afterEach(async () => {
  // renderRouter bật đồng hồ giả: gỡ cây trước khi trả đồng hồ thật, không thì hẹn giờ dọn của navigator chạy sang test sau
  await cleanup()
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('màn lỗi chung', () => {
  beforeEach(() => {
    // React ghi lỗi mà màn lỗi đã bắt vào console.error; ở đây màn ném lỗi là cố ý
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  test('màn chính ném lỗi không mã: hiện màn lỗi với câu chung, ghi nhật ký; "Thử lại" vẽ lại màn khi hết lỗi', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    await signInAs(emailOf('dispatcher'))
    mockAccountFailure = new TypeError("Cannot read properties of undefined (reading 'fullName')")
    const { pathname } = await openApp('/')

    expect(await screen.findByRole('header', { name: 'Không hiện được màn này' })).toBeOnTheScreen()
    expect(screen.getByText('Có lỗi xảy ra. Thử lại sau.')).toBeOnTheScreen()
    expect(screen.queryByText(/fullName/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Về màn chính' })).toBeOnTheScreen()
    expect(warn).toHaveBeenCalledWith(UNCODED_PREFIX, expect.stringContaining("reading 'fullName'"))

    mockAccountFailure = undefined
    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('header', { name: 'Tài khoản' })).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Không hiện được màn này' })).toBeNull()
    expect(pathname()).toBe('/account')
  })

  test('lỗi có mã: hiện câu của mã, không câu chung, không ghi nhật ký lỗi không mã', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    await signInAs(emailOf('driver'))
    mockNotificationsFailure = new MockDbError('NOT_FOUND', { collection: 'trips', id: 'TRIP-404' })
    await openApp('/notifications')

    expect(await screen.findByRole('header', { name: 'Không hiện được màn này' })).toBeOnTheScreen()
    expect(screen.getByText('Không tìm thấy TRIP-404.')).toBeOnTheScreen()
    expect(screen.queryByText('Có lỗi xảy ra. Thử lại sau.')).toBeNull()
    expect(screen.queryByText(/NOT_FOUND/)).toBeNull()
    expect(warn).not.toHaveBeenCalledWith(UNCODED_PREFIX, expect.anything())
  })

  test('màn mở trong lúc dùng app ném lỗi: "Thử lại" dựng lại cả nhóm, người dùng về màn chính của vai trò', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    await signInAs(emailOf('driver'))
    const { pathname } = await openApp('/trips')
    expect(await screen.findByRole('header', { name: 'Chuyến của tôi' })).toBeOnTheScreen()

    mockNotificationsFailure = new Error('màn thông báo vỡ')
    await act(async () => {
      router.push('/notifications')
    })
    expect(await screen.findByRole('header', { name: 'Không hiện được màn này' })).toBeOnTheScreen()

    mockNotificationsFailure = undefined
    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('header', { name: 'Chuyến của tôi' })).toBeOnTheScreen()
    expect(pathname()).toBe('/trips')
  })

  test('lỗi còn lặp lại: "Về màn chính" thoát khỏi màn lỗi về màn của vai trò', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    await signInAs(emailOf('driver'))
    mockNotificationsFailure = new Error('màn thông báo vỡ')
    const { pathname } = await openApp('/notifications')
    expect(await screen.findByRole('header', { name: 'Không hiện được màn này' })).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Về màn chính' }))
    expect(await screen.findByRole('header', { name: 'Chuyến của tôi' })).toBeOnTheScreen()
    expect(screen.queryByRole('header', { name: 'Không hiện được màn này' })).toBeNull()
    expect(pathname()).toBe('/trips')
  })

  test('chính màn chính lỗi mãi: "Về màn chính" thôi hiện khi chỉ mở lại màn đó; "Đăng xuất" đưa người dùng ra, xoá phiên', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    await signInAs(emailOf('dispatcher'))
    mockAccountFailure = new Error('màn tài khoản vỡ')
    const { pathname } = await openApp('/')
    expect(await screen.findByRole('header', { name: 'Không hiện được màn này' })).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Về màn chính' }))
    expect(await screen.findByRole('header', { name: 'Không hiện được màn này' })).toBeOnTheScreen()
    expect(pathname()).toBe('/account')
    expect(screen.queryByRole('button', { name: 'Về màn chính' })).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }))
    expect(await screen.findByRole('header', { name: 'Đăng nhập' })).toBeOnTheScreen()
    expect(pathname()).toBe('/sign-in')
    // Mở lại app không khôi phục phiên rồi đưa người dùng về đúng màn đang lỗi
    expect(await readStored(SESSION_KEY)).toBeNull()
  })

  test('màn đăng nhập ném lỗi: chỉ có "Thử lại" — màn chính của người chưa đăng nhập là chính màn đó, chưa có phiên để đăng xuất', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockSignInFailure = new Error('màn đăng nhập vỡ')
    await openApp('/sign-in')
    expect(await screen.findByRole('header', { name: 'Không hiện được màn này' })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Về màn chính' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).toBeNull()

    mockSignInFailure = undefined
    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('header', { name: 'Đăng nhập' })).toBeOnTheScreen()
  })
})

describe('màn không tìm thấy', () => {
  // Tài xế có tab Chuyến; mọi vai trò khác chỉ có tab Tài khoản
  const HOMES = ROLES.map((role) => (role === 'driver' ? { role, path: '/trips', header: 'Chuyến của tôi' } : { role, path: '/account', header: 'Tài khoản' }))

  test('chưa đăng nhập: địa chỉ lạ hiện "Không có màn này", "Về màn chính" mở màn đăng nhập', async () => {
    const { pathname } = await openApp('/khong-co-man-nay')

    expect(await screen.findByRole('header', { name: 'Không có màn này' })).toBeOnTheScreen()
    expect(screen.getByText('Địa chỉ vừa mở không khớp màn nào của app. Liên kết có thể đã cũ hoặc bị gõ sai.')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Về màn chính' }))
    expect(await screen.findByRole('header', { name: 'Đăng nhập' })).toBeOnTheScreen()
    expect(pathname()).toBe('/sign-in')
  })

  test.each(HOMES)('$role: địa chỉ lạ hiện "Không có màn này", "Về màn chính" mở $path', async ({ role, path, header }) => {
    await signInAs(emailOf(role))
    const { pathname } = await openApp('/khong-co-man-nay')

    expect(await screen.findByRole('header', { name: 'Không có màn này' })).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Về màn chính' }))
    expect(await screen.findByRole('header', { name: header })).toBeOnTheScreen()
    expect(pathname()).toBe(path)
  })

  test('liên kết lạ mở lúc đang dùng app: "Về màn chính" lùi về màn chính đã mở, không dựng thêm một nhóm', async () => {
    await signInAs(emailOf('driver'))
    const { pathname, rootRoutes } = await openApp('/trips')
    expect(await screen.findByRole('header', { name: 'Chuyến của tôi' })).toBeOnTheScreen()
    await act(async () => {
      router.push('/notifications')
    })
    expect(await screen.findByRole('header', { name: 'Thông báo' })).toBeOnTheScreen()
    const appKey = rootRoutes()[0]?.key

    // Router chồng màn không tìm thấy lên nhóm đang mở. `Href` chỉ nhận route có thật nên địa chỉ lạ đi qua `string`.
    const unknownPath: string = '/khong-co-man-nay'
    await act(async () => {
      router.push(unknownPath as Href)
    })
    expect(await screen.findByRole('header', { name: 'Không có màn này' })).toBeOnTheScreen()
    expect(rootRoutes().map((route) => route.name)).toEqual(['(app)', '+not-found'])

    await fireEvent.press(screen.getByRole('button', { name: 'Về màn chính' }))
    expect(await screen.findByRole('header', { name: 'Chuyến của tôi' })).toBeOnTheScreen()
    expect(pathname()).toBe('/trips')
    // Vẫn đúng nhóm `(app)` cũ, và màn Thông báo mở chồng trong nhóm cũng đã gỡ
    expect(rootRoutes().map(({ name, key }) => ({ name, key }))).toEqual([{ name: '(app)', key: appKey }])
    expect(rootRoutes()[0]?.state?.routes.map((route) => route.name)).toEqual(['(tabs)'])
  })
})
