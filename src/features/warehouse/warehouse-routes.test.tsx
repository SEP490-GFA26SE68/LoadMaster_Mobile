import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { renderRouter } from 'expo-router/testing-library'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'
import { DRIVER_EMAIL } from '@/test/driver-flow'
import { clearStored, signInAs } from '@/test/render'
import { LOADED_TRIP, READY_TRIP, STALE_TRIP, WAREHOUSE_EMAIL } from '@/test/warehouse-flow'

import { loadingPath } from './session-routes'

// Đi qua router thật và các route của `src/app` (`setup.ts` thay `expo-router` bằng router giả cho các test màn khác).
jest.unmock('expo-router')

/** Trạng thái của một navigator: các route đang mở và các màn nó khai. */
type NavigatorNode = { readonly routes: readonly RouteNode[]; readonly routeNames?: readonly string[] }

/** Một route trong trạng thái của router: tên và navigator lồng bên trong (nếu có). */
type RouteNode = { readonly name: string; readonly state?: NavigatorNode }

type OpenedApp = {
  pathname(): string
  /** Các route của nhóm `(app)` đang mở: thanh tab và các màn chồng lên nó. */
  appRoutes(): readonly string[]
  /** Các màn nhóm `(app)` khai cho người đang đăng nhập — màn có `guard` sai bị bỏ khỏi navigator. */
  appScreens(): readonly string[]
  /** Các tab thanh tab khai cho người đang đăng nhập. */
  tabScreens(): readonly string[]
}

/** Mở app ở `url` như khi mở từ một liên kết. */
async function openApp(url: string): Promise<OpenedApp> {
  const rendered = renderRouter('src/app', { initialUrl: url })
  await rendered
  const child = (node: NavigatorNode | undefined, name: string) => node?.routes.find((route) => route.name === name)?.state
  const app = () => child(rendered.getRouterState()?.routes[0]?.state as NavigatorNode | undefined, '(app)')
  const tabs = () => child(app(), '(tabs)')
  return {
    pathname: () => rendered.getPathname(),
    appRoutes: () => app()?.routes.map((route) => route.name) ?? [],
    appScreens: () => app()?.routeNames ?? [],
    tabScreens: () => tabs()?.routeNames ?? [],
  }
}

/** Nút "Về danh sách chuyến" của phiên: `0` là nút thoát ở dải trời, `1` là nút ở chân màn. */
function backButton(index: 0 | 1) {
  const button = screen.getAllByRole('button', { name: 'Về danh sách chuyến' })[index]
  if (button === undefined) throw new Error(`màn không có nút "Về danh sách chuyến" thứ ${index + 1}`)
  return button
}

/** Tab của thanh tab đáy; tên đọc là nhãn của tab kèm vị trí ("Kho, tab, 2 of 4"). */
function tabNamed(label: string) {
  return new RegExp(`^${label}, tab, `)
}

beforeEach(() => {
  resetMockDb()
  clearStored()
})

afterEach(async () => {
  // renderRouter bật đồng hồ giả: gỡ cây trước khi trả đồng hồ thật, không thì hẹn giờ dọn của navigator chạy sang test sau
  await cleanup()
  jest.useRealTimers()
  jest.restoreAllMocks()
})

/*
 * Màn có `guard` sai bị bỏ khỏi navigator (`Stack.Protected` / `Tabs.Protected`): liên kết tới nó không mở màn đó mà rơi về route
 * đầu của nhóm — `(tabs)/index`, nơi chuyển sang màn chính của vai trò. Nên test hỏi "người này về màn chính của mình, navigator
 * không khai màn đó", không chờ màn "Không có màn này".
 */

describe('nhân viên kho trên app', () => {
  test('mở app: vào tab Kho; thanh tab có Kho · Tra cứu kiện · Tài khoản, không có tab của tài xế', async () => {
    await signInAs(WAREHOUSE_EMAIL)
    const { pathname, tabScreens } = await openApp('/')

    expect(await screen.findByRole('header', { name: 'Chuyến cần xếp' })).toBeOnTheScreen()
    expect(pathname()).toBe('/warehouse')
    expect(screen.getByRole('button', { name: tabNamed('Kho') })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: tabNamed('Tra cứu kiện') })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: tabNamed('Tài khoản') })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: tabNamed('Chuyến của tôi') })).toBeNull()
    expect(tabScreens()).toEqual(['index', 'warehouse', 'lookup', 'account'])

    await fireEvent.press(screen.getByRole('button', { name: tabNamed('Tra cứu kiện') }))
    await waitFor(() => expect(pathname()).toBe('/lookup'))
    expect(await screen.findByRole('header', { name: 'Tra cứu kiện' })).toBeOnTheScreen()
  })

  test('đăng nhập bằng tài khoản dùng thử của kho: form điền sẵn email và mật khẩu mẫu, vào tab Kho', async () => {
    const account = DEMO_ACCOUNTS.find((item) => item.role === 'warehouse' && item.email === WAREHOUSE_EMAIL)
    expect(account).toBeDefined()
    const { pathname } = await openApp('/sign-in')

    await fireEvent.press(await screen.findByRole('button', { name: `Nhân viên kho, ${WAREHOUSE_EMAIL}` }))
    await waitFor(() => expect(screen.getByLabelText('Email').props.value).toBe(WAREHOUSE_EMAIL))
    expect(screen.getByLabelText('Mật khẩu').props.value).toBe(SEED_PASSWORD)
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByRole('header', { name: 'Chuyến cần xếp' })).toBeOnTheScreen()
    expect(pathname()).toBe('/warehouse')
  })

  test('tab Tài khoản: tên vai trò, không có câu "chưa có màn làm việc"', async () => {
    await signInAs(WAREHOUSE_EMAIL)
    await openApp('/account')

    expect(await screen.findByRole('header', { name: 'Tài khoản' })).toBeOnTheScreen()
    expect(screen.getByText('Lê Văn Hải')).toBeOnTheScreen()
    expect(screen.getByText('Nhân viên kho')).toBeOnTheScreen()
    expect(screen.getByText(WAREHOUSE_EMAIL)).toBeOnTheScreen()
    expect(screen.queryByText('Bản này chưa có màn làm việc cho vai trò của bạn.')).toBeNull()
    expect(screen.queryByText('Vai trò của bạn làm việc trên bản web. App chỉ có phần tài khoản.')).toBeNull()
  })

  test('mở thẳng phiên của một chuyến (liên kết, thông báo): thoát là về tab Kho, không còn màn nào chồng lên thanh tab', async () => {
    await signInAs(WAREHOUSE_EMAIL)
    const { pathname, appRoutes } = await openApp(`/loading/${STALE_TRIP}`)

    expect(await screen.findByRole('header', { name: 'Chờ tối ưu và duyệt lại' })).toBeOnTheScreen()
    expect(pathname()).toBe(`/loading/${STALE_TRIP}`)
    expect(appRoutes()).toEqual(['(tabs)', 'loading/[tripId]'])

    await fireEvent.press(backButton(0))
    expect(await screen.findByRole('header', { name: 'Chuyến cần xếp' })).toBeOnTheScreen()
    expect(pathname()).toBe('/warehouse')
    expect(appRoutes()).toEqual(['(tabs)'])
  })

  test('từ tab Kho mở phiên của một chuyến rồi về: vẫn đúng thanh tab cũ', async () => {
    await signInAs(WAREHOUSE_EMAIL)
    const { pathname, appRoutes } = await openApp('/warehouse')
    expect(await screen.findByRole('header', { name: 'Chuyến cần xếp' })).toBeOnTheScreen()

    await act(async () => {
      router.push(loadingPath(STALE_TRIP))
    })
    expect(await screen.findByRole('header', { name: 'Chờ tối ưu và duyệt lại' })).toBeOnTheScreen()
    expect(pathname()).toBe(`/loading/${STALE_TRIP}`)

    await fireEvent.press(backButton(1))
    expect(await screen.findByRole('header', { name: 'Chuyến cần xếp' })).toBeOnTheScreen()
    expect(pathname()).toBe('/warehouse')
    expect(appRoutes()).toEqual(['(tabs)'])
  })

  test('liên kết tới màn một chuyến của tài xế: kho không có màn đó, app mở tab Kho', async () => {
    await signInAs(WAREHOUSE_EMAIL)
    const { pathname, appRoutes, appScreens } = await openApp(`/trip/${LOADED_TRIP}`)

    expect(await screen.findByRole('header', { name: 'Chuyến cần xếp' })).toBeOnTheScreen()
    expect(pathname()).toBe('/warehouse')
    expect(appRoutes()).toEqual(['(tabs)'])
    expect(appScreens()).toContain('loading/[tripId]')
    expect(appScreens()).not.toContain('trip/[tripId]')
    expect(screen.queryByRole('header', { name: 'Điểm 1 / 3' })).toBeNull()
  })

  test('liên kết tới tab của tài xế: app mở tab Kho', async () => {
    await signInAs(WAREHOUSE_EMAIL)
    const { pathname, tabScreens } = await openApp('/trips')

    expect(await screen.findByRole('header', { name: 'Chuyến cần xếp' })).toBeOnTheScreen()
    expect(pathname()).toBe('/warehouse')
    expect(tabScreens()).toContain('warehouse')
    expect(tabScreens()).not.toContain('trips')
  })
})

describe('tài xế trên app', () => {
  test('không có tab Kho, Tra cứu kiện', async () => {
    await signInAs(DRIVER_EMAIL)
    const { tabScreens } = await openApp('/')

    expect(await screen.findByRole('header', { name: 'Chuyến của tôi' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: tabNamed('Chuyến của tôi') })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: tabNamed('Kho') })).toBeNull()
    expect(screen.queryByRole('button', { name: tabNamed('Tra cứu kiện') })).toBeNull()
    expect(tabScreens()).toEqual(['index', 'trips', 'account'])
  })

  test('liên kết tới phiên soạn → xếp của kho: tài xế không có màn đó, app mở Chuyến của tôi, chuyến không bị bắt đầu xếp', async () => {
    await signInAs(DRIVER_EMAIL)
    const start = jest.spyOn(getMockDb(), 'startLoading')
    const { pathname, appRoutes, appScreens } = await openApp(`/loading/${READY_TRIP}`)

    expect(await screen.findByRole('header', { name: 'Chuyến của tôi' })).toBeOnTheScreen()
    expect(pathname()).toBe('/trips')
    expect(appRoutes()).toEqual(['(tabs)'])
    expect(appScreens()).toContain('trip/[tripId]')
    expect(appScreens()).not.toContain('loading/[tripId]')
    expect(start).not.toHaveBeenCalled()
    expect((await getMockDb().getTrip(READY_TRIP)).phase).toBe('planning')
  })

  test.each(['/warehouse', '/lookup'])('liên kết tới tab %s của kho: app mở Chuyến của tôi', async (url) => {
    await signInAs(DRIVER_EMAIL)
    const { pathname } = await openApp(url)

    expect(await screen.findByRole('header', { name: 'Chuyến của tôi' })).toBeOnTheScreen()
    expect(pathname()).toBe('/trips')
  })
})

describe('điều phối viên trên app', () => {
  test('có quyền tra cứu kiện nhưng app chưa có màn cho vai trò này: không có tab Tra cứu kiện, liên kết tới tab mở Tài khoản', async () => {
    const dispatcher = DEMO_ACCOUNTS.find((item) => item.role === 'dispatcher')
    if (dispatcher === undefined) throw new Error('seed không có tài khoản dùng thử của điều phối viên')
    await signInAs(dispatcher.email)
    const { pathname, tabScreens } = await openApp('/lookup')

    expect(await screen.findByRole('header', { name: 'Tài khoản' })).toBeOnTheScreen()
    expect(pathname()).toBe('/account')
    expect(tabScreens()).toEqual(['index', 'account'])
    expect(screen.queryByRole('button', { name: tabNamed('Tra cứu kiện') })).toBeNull()
  })
})
