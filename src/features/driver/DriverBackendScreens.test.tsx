import { configure, fireEvent, screen } from '@testing-library/react-native'

import type { ApiClient } from '@/data/http'
import { createMockAuth } from '@/features/auth/auth-mock'
import { fail, fakeDriverBackend, ok, STOP, TRIP, type Routes } from '@/test/driver-backend'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored, renderApp } from '@/test/render'

import { MyTripsScreen } from './MyTripsScreen'
import { TripScreen } from './TripScreen'

/*
 * Màn tài xế khi nguồn `driver` là máy chủ: adapter backend thật (`httpDriverApi`) trên máy chủ giả. Bảng `mockRoutes` dùng chung cho cả
 * file, mỗi test gán lại câu trả lời.
 */

const mockRoutes: Routes = {}
let mockBackend: { readonly client: ApiClient; readonly calls: { method: string; path: string }[] } | undefined

jest.mock('@/data/config', () => {
  const actual = jest.requireActual<typeof import('@/data/config')>('@/data/config')
  return { ...actual, dataConfig: { ...actual.dataConfig, sources: { ...actual.dataConfig.sources, driver: 'http' } } }
})

jest.mock('./driver-http', () => {
  const actual = jest.requireActual<typeof import('./driver-http')>('./driver-http')
  return {
    httpDriverApi: () =>
      actual.httpDriverApi({
        client: () => {
          if (mockBackend === undefined) throw new Error('chưa dựng máy chủ giả')
          return mockBackend.client
        },
        userId: () => '15',
      }),
  }
})

configure({ asyncUtilTimeout: 5000 })

function serve(routes: Routes) {
  for (const key of Object.keys(mockRoutes)) delete mockRoutes[key]
  Object.assign(mockRoutes, routes)
}

const posted = (path: string) => mockBackend?.calls.some((call) => call.method === 'POST' && call.path === path) ?? false

beforeAll(() => {
  mockBackend = fakeDriverBackend(mockRoutes)
})

beforeEach(() => {
  clearStored()
  resetNativeMocks()
  mockBackend?.calls.splice(0)
})

describe('Chuyến của tôi trên máy chủ: Xuất phát ở thẻ chuyến', () => {
  const loaded = { ...TRIP, tripId: 43, tripCode: 'TRIP-0043', status: 'LOADING', loadingCompleted: true }
  const preparing = { ...TRIP, tripId: 44, tripCode: 'TRIP-0044', status: 'LOADING', loadingCompleted: false }

  test('kho đã xếp xong: nút bật, bấm thì xuất phát rồi mở điểm giao; kho chưa xong: nút mờ kèm lý do', async () => {
    serve({ 'GET /api/driver/trips': () => ok([loaded, preparing]), 'POST /api/driver/trips/43/start': () => ok({ tripId: 43 }) })
    await renderApp(<MyTripsScreen />, { auth: createMockAuth() })

    const blocked = await screen.findByRole('button', { name: 'Xuất phát TRIP-0044' })
    expect(blocked).toBeDisabled()
    expect(screen.getByText('Kho chưa xếp xong — xuất phát được khi kho hoàn tất xếp hàng.')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Xuất phát TRIP-0043' }))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/trip/[tripId]', params: { tripId: '43' } })
    expect(posted('/api/driver/trips/43/start')).toBe(true)
    expect(posted('/api/driver/trips/44/start')).toBe(false)
  })

  test('máy chủ vẫn từ chối (kho vừa mở lại phiên xếp): dải lỗi trong thẻ nói lý do, không mở điểm giao', async () => {
    serve({ 'GET /api/driver/trips': () => ok([loaded]), 'POST /api/driver/trips/43/start': () => fail(409, 'LOADING_NOT_COMPLETED') })
    await renderApp(<MyTripsScreen />, { auth: createMockAuth() })

    await fireEvent.press(await screen.findByRole('button', { name: 'Xuất phát TRIP-0043' }))
    expect(await screen.findByText('Kho chưa xếp xong hàng cho chuyến này, chưa xuất phát được.')).toBeOnTheScreen()
    expect(router.push).not.toHaveBeenCalled()
  })
})

describe('điểm giao trên máy chủ', () => {
  test('chưa có giờ đến: "Đã đến điểm 2" ghi giờ đến ở máy chủ, rồi mới mở việc dỡ và báo sự cố', async () => {
    let arrived = false
    serve({
      'GET /api/driver/trips': () => ok([TRIP]),
      'GET /api/driver/trips/41/current-stop': () => ok({ ...STOP, actualArrival: arrived ? STOP.actualArrival : null }),
      'POST /api/driver/stops/902/arrive': () => {
        arrived = true
        return ok({ stopId: 902 })
      },
    })
    await renderApp(<TripScreen tripId="41" />, { auth: createMockAuth() })

    expect(await screen.findByRole('header', { name: 'Điểm 2 / 3' })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Đối chiếu kiện dỡ' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Báo sự cố' })).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Đã đến điểm 2' }))
    expect(await screen.findByRole('button', { name: 'Đối chiếu kiện dỡ' })).toBeOnTheScreen()
    expect(posted('/api/driver/stops/902/arrive')).toBe(true)
    expect(screen.getByRole('button', { name: 'Báo sự cố' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Hoàn tất điểm giao' })).toBeDisabled()
  })

  test('mọi kiện đã dỡ nhưng còn xác nhận tay chờ duyệt: nút hoàn tất mờ, lý do ngay trên nút', async () => {
    const packages = STOP.packages.map((pkg, index) => ({ ...pkg, unloaded: true, ...(index === 0 ? { manualStatus: 'PENDING' } : {}) }))
    serve({ 'GET /api/driver/trips': () => ok([TRIP]), 'GET /api/driver/trips/41/current-stop': () => ok({ ...STOP, packages }) })
    await renderApp(<TripScreen tripId="41" />, { auth: createMockAuth() })

    expect(await screen.findByText('Còn 1 xác nhận tay của điểm này chờ điều phối viên duyệt — chưa hoàn tất điểm giao được.')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Hoàn tất điểm giao' })).toBeDisabled()
  })

  test('điểm nhận dọc đường: gõ mã của bên gửi đưa kiện lên xe; không có xác nhận tay (máy chủ chưa có)', async () => {
    let picked = false
    const pickupStop = {
      ...STOP,
      stopId: 905,
      stopSequence: 3,
      stopName: 'Xưởng may Thuận An',
      stopType: 'PICKUP',
      packages: [],
      pickupPackages: [{ packageId: 8101, packageName: 'Áo khoác', packageCode: 'HG-1', trackingBarcode: null, weight: 8, unloadOrder: null }],
    }
    serve({
      'GET /api/driver/trips': () => ok([TRIP]),
      'GET /api/driver/trips/41/current-stop': () => ok({ ...pickupStop, pickupPackages: pickupStop.pickupPackages.map((pkg) => ({ ...pkg, picked })) }),
      'POST /api/driver/pickup-packages/8101/pick': () => {
        picked = true
        return ok({ packageId: 8101 })
      },
    })
    await renderApp(<TripScreen tripId="41" />, { auth: createMockAuth() })

    await fireEvent.press(await screen.findByRole('button', { name: 'Đối chiếu kiện nhận' }))
    expect(await screen.findByRole('header', { name: 'Đối chiếu kiện nhận tại điểm 3' })).toBeOnTheScreen()
    expect(screen.queryByRole('tab', { name: 'Xác nhận tay' })).toBeNull()
    await fireEvent.press(screen.getByRole('tab', { name: 'Gõ mã' }))
    await fireEvent.changeText(screen.getByLabelText('Mã QR hoặc mã bên gửi'), 'hg-1')
    await fireEvent.press(screen.getByRole('button', { name: 'Đối chiếu mã' }))

    expect(await screen.findByRole('button', { name: 'Hoàn tất điểm nhận' })).toBeEnabled()
    expect(posted('/api/driver/pickup-packages/8101/pick')).toBe(true)
  })
})
