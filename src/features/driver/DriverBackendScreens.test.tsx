import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native'

import type { ApiClient } from '@/data/http'
import { createMockAuth } from '@/features/auth/auth-mock'
import { driver as driverVi } from '@/lib/i18n/vi/driver'
import { openTrips } from '@/lib/i18n/vi/openTrips'
import { fail, fakeDriverBackend, ok, STOP, TRIP, type Routes } from '@/test/driver-backend'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored, renderApp } from '@/test/render'

import { DriverTripDetailScreen } from './detail/DriverTripDetailScreen'
import { MyTripsScreen } from './MyTripsScreen'
import { OpenTripsScreen } from './OpenTripsScreen'
import { TripScreen } from './TripScreen'
import { driverTripDetailPath } from './TripCard'

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
  const draft = {
    ...TRIP,
    tripId: 50,
    tripCode: 'TRIP-0050',
    vehicleLicensePlate: '51A-000.50',
    departureTime: '2026-10-20T08:00:00',
    status: 'DRAFT',
    stopCount: 0,
  }
  const cancelled = { ...draft, tripId: 51, tripCode: 'TRIP-0051', status: 'CANCELLED' }

  test('chuyến Nháp ở nhóm sắp tới, chỉ có đường xem chi tiết; chuyến đã huỷ vẫn bị ẩn', async () => {
    serve({ 'GET /api/driver/trips': () => ok([draft, cancelled]) })
    await renderApp(<MyTripsScreen />, { auth: createMockAuth() })

    expect(await screen.findByRole('header', { name: driverVi.myTrips.groups.upcoming })).toBeOnTheScreen()
    expect(screen.getByText(draft.tripCode)).toBeOnTheScreen()
    expect(screen.getByText(driverVi.myTrips.draftStatus)).toBeOnTheScreen()
    expect(screen.getByText('20/10/2026')).toBeOnTheScreen()
    expect(screen.getByText(draft.vehicleLicensePlate)).toBeOnTheScreen()
    expect(screen.queryByText(cancelled.tripCode)).toBeNull()
    expect(screen.queryByText(driverVi.myTrips.empty.title)).toBeNull()

    const options = await screen.findAllByRole('button', { name: driverVi.myTrips.actionsMenu })
    expect(options).toHaveLength(1)
    await fireEvent.press(options[0]!)

    const detail = await screen.findByRole('button', { name: driverVi.myTrips.viewDetail })
    expect(screen.queryByRole('button', { name: driverVi.myTrips.preview })).toBeNull()
    expect(screen.queryByRole('button', { name: driverVi.myTrips.resume })).toBeNull()
    expect(screen.queryByRole('button', { name: driverVi.start })).toBeNull()
    expect(screen.queryByRole('button', { name: `${driverVi.start} ${draft.tripCode}` })).toBeNull()
    await fireEvent.press(detail)
    expect(router.push).toHaveBeenCalledWith(driverTripDetailPath('50'))
  })

  test('đầu màn không có nút "Xem bảng lương" (lương đã có tab riêng ở thanh dưới)', async () => {
    serve({ 'GET /api/driver/trips': () => ok([TRIP]) })
    await renderApp(<MyTripsScreen />, { auth: createMockAuth() })

    expect(await screen.findByText(TRIP.tripCode)).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Xem bảng lương' })).toBeNull()
  })

  test('thẻ chuyến hiện tên chuyến của backend', async () => {
    serve({ 'GET /api/driver/trips': () => ok([{ ...TRIP, tripName: 'Tuyến Biên Hoà - Vũng Tàu' }]) })
    await renderApp(<MyTripsScreen />, { auth: createMockAuth() })

    expect(await screen.findByText('Tuyến Biên Hoà - Vũng Tàu')).toBeOnTheScreen()
  })

  test('kho đã xếp xong: nút bật, bấm thì xuất phát rồi mở điểm giao; kho chưa xong: nút mờ kèm lý do', async () => {
    serve({ 'GET /api/driver/trips': () => ok([loaded, preparing]), 'POST /api/driver/trips/43/start': () => ok({ tripId: 43 }) })
    await renderApp(<MyTripsScreen />, { auth: createMockAuth() })

    const options = await screen.findAllByRole('button', { name: 'Tùy chọn' })
    expect(options.length).toBeGreaterThanOrEqual(2)

    // Chuyến chưa xếp xong: nút mờ kèm lý do
    fireEvent.press(options[1]!)
    const blocked = await screen.findByRole('button', { name: 'Xuất phát TRIP-0044' })
    expect(blocked).toBeDisabled()
    expect(screen.getAllByText('Kho chưa xếp xong — xuất phát được khi kho hoàn tất xếp hàng.').length).toBeGreaterThanOrEqual(1)

    // Chuyến đã xếp xong: xuất phát rồi mở điểm giao
    fireEvent.press(options[0]!)
    await fireEvent.press(await screen.findByRole('button', { name: 'Xuất phát TRIP-0043' }))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/trip/[tripId]', params: { tripId: '43' } })
    expect(posted('/api/driver/trips/43/start')).toBe(true)
    expect(posted('/api/driver/trips/44/start')).toBe(false)
  })

  test('máy chủ vẫn từ chối (kho vừa mở lại phiên xếp): dải lỗi trong thẻ nói lý do, không mở điểm giao', async () => {
    serve({ 'GET /api/driver/trips': () => ok([loaded]), 'POST /api/driver/trips/43/start': () => fail(409, 'LOADING_NOT_COMPLETED') })
    await renderApp(<MyTripsScreen />, { auth: createMockAuth() })

    const options = await screen.findAllByRole('button', { name: 'Tùy chọn' })
    fireEvent.press(options[0]!)
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

describe('Chi tiết chuyến trên máy chủ: Xuất phát', () => {
  const loadedDetail = {
    tripId: 43,
    tripCode: 'TRIP-0043',
    tripName: 'Chuyến giao',
    status: 'LOADING',
    loadingCompleted: true,
    depotName: 'Kho Long Bình',
    depotAddress: 'Biên Hoà',
    totalStops: 0,
    totalPackages: 0,
    stops: [],
  }

  test('kho đã xếp xong: bấm thì POST start rồi mở điểm giao', async () => {
    serve({
      'GET /api/driver/trips/43/detail': () => ok(loadedDetail),
      'POST /api/driver/trips/43/start': () => ok({ tripId: 43 }),
    })
    await renderApp(<DriverTripDetailScreen tripId="43" />, { auth: createMockAuth() })

    await fireEvent.press(await screen.findByRole('button', { name: 'Xuất phát TRIP-0043' }))

    expect(posted('/api/driver/trips/43/start')).toBe(true)
    expect(router.push).toHaveBeenCalledWith({ pathname: '/trip/[tripId]', params: { tripId: '43' } })
  })

  test('máy chủ vẫn từ chối: dải lỗi, không mở điểm giao', async () => {
    serve({
      'GET /api/driver/trips/43/detail': () => ok(loadedDetail),
      'POST /api/driver/trips/43/start': () => fail(409, 'LOADING_NOT_COMPLETED'),
    })
    await renderApp(<DriverTripDetailScreen tripId="43" />, { auth: createMockAuth() })

    await fireEvent.press(await screen.findByRole('button', { name: 'Xuất phát TRIP-0043' }))

    expect(await screen.findByText('Kho chưa xếp xong hàng cho chuyến này, chưa xuất phát được.')).toBeOnTheScreen()
    expect(router.push).not.toHaveBeenCalled()
  })
})

describe('Chuyến đang mở trên máy chủ (OpenTripsScreen)', () => {
  const openTrip = {
    id: 101,
    tripId: 101,
    tripCode: 'TRIP-0101',
    tripName: 'Chuyến giao Biên Hoà',
    departureTime: '2026-10-20T08:00:00',
    originWarehouse: 'Kho Tổng Sóng Thần',
    stopCount: 3,
    myClaimStatus: null,
    myRejectReason: null,
  }

  test('sau khi rút phiếu CANCELLED, tài xế có thể xin chuyến lại', async () => {
    let claimStatus: 'PENDING' | 'CANCELLED' | null = null
    serve({
      'GET /api/driver/open-trips': () =>
        ok([
          {
            ...openTrip,
            myClaimStatus: claimStatus,
          },
        ]),
      'POST /api/driver/trips/101/claim': () => {
        claimStatus = 'PENDING'
        return ok({
          id: 201,
          tripId: 101,
          driverUserId: 15,
          driverName: 'Nguyễn Văn Tài',
          driverPhone: '0901234567',
          status: 'PENDING',
          note: null,
          createdAt: '2026-10-18T10:00:00',
          decidedById: null,
          decidedByName: null,
          decidedAt: null,
          rejectReason: null,
        })
      },
      'POST /api/driver/trips/101/claim/cancel': () => {
        claimStatus = 'CANCELLED'
        return ok({
          id: 201,
          tripId: 101,
          driverUserId: 15,
          driverName: 'Nguyễn Văn Tài',
          driverPhone: '0901234567',
          status: 'CANCELLED',
          note: null,
          createdAt: '2026-10-18T10:00:00',
          decidedById: null,
          decidedByName: null,
          decidedAt: null,
          rejectReason: null,
        })
      },
    })

    await renderApp(<OpenTripsScreen />, { auth: createMockAuth() })

    // Tài xế thấy chuyến
    expect(await screen.findByText('Chuyến giao Biên Hoà')).toBeOnTheScreen()
    expect(screen.getByText('TRIP-0101')).toBeOnTheScreen()

    // "Xin nhận chuyến" nằm trong menu "..." của thẻ, không còn là nút ngoài thẻ
    expect(screen.queryByRole('button', { name: openTrips.actions.claim })).toBeNull()
    await fireEvent.press(await screen.findByRole('button', { name: driverVi.myTrips.actionsMenu }))
    await fireEvent.press(await screen.findByRole('button', { name: openTrips.actions.claim }))

    // Thẻ chuyển sang "Đang chờ duyệt"; menu có "Rút phiếu" thay cho "Xin nhận chuyến"
    expect(await screen.findByText(openTrips.status.pending)).toBeOnTheScreen()
    await fireEvent.press(await screen.findByRole('button', { name: driverVi.myTrips.actionsMenu }))
    expect(screen.queryByRole('button', { name: openTrips.actions.claim })).toBeNull()
    await fireEvent.press(await screen.findByRole('button', { name: openTrips.actions.cancel }))

    // Backend giữ trạng thái CANCELLED, nhưng tài xế có thể gửi phiếu mới.
    await waitFor(() => expect(screen.queryByText(openTrips.status.pending)).toBeNull())
    await fireEvent.press(await screen.findByRole('button', { name: driverVi.myTrips.actionsMenu }))
    await fireEvent.press(await screen.findByRole('button', { name: openTrips.actions.claim }))

    expect(await screen.findByText(openTrips.status.pending)).toBeOnTheScreen()
    await fireEvent.press(await screen.findByRole('button', { name: driverVi.myTrips.actionsMenu }))
    expect(await screen.findByRole('button', { name: openTrips.actions.cancel })).toBeOnTheScreen()
  })

  test('menu "..." của thẻ có "Xem chi tiết": mở màn chi tiết chuyến', async () => {
    serve({ 'GET /api/driver/open-trips': () => ok([openTrip]) })
    await renderApp(<OpenTripsScreen />, { auth: createMockAuth() })

    await fireEvent.press(await screen.findByRole('button', { name: driverVi.myTrips.actionsMenu }))
    await fireEvent.press(await screen.findByRole('button', { name: driverVi.myTrips.viewDetail }))

    expect(router.push).toHaveBeenCalledWith(driverTripDetailPath('101'))
  })

  test('phiếu bị từ chối: thẻ hiện chip và lý do, menu chỉ còn "Xem chi tiết" (không xin lại)', async () => {
    serve({ 'GET /api/driver/open-trips': () => ok([{ ...openTrip, myClaimStatus: 'REJECTED', myRejectReason: 'Xe không phù hợp' }]) })
    await renderApp(<OpenTripsScreen />, { auth: createMockAuth() })

    expect(await screen.findByText(openTrips.status.rejected)).toBeOnTheScreen()
    expect(screen.getByText('Lý do: Xe không phù hợp')).toBeOnTheScreen()
    await fireEvent.press(await screen.findByRole('button', { name: driverVi.myTrips.actionsMenu }))
    expect(await screen.findByRole('button', { name: driverVi.myTrips.viewDetail })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: openTrips.actions.claim })).toBeNull()
    expect(screen.queryByRole('button', { name: openTrips.actions.cancel })).toBeNull()
  })

  test('ca lỗi TRIP_CLAIM_TRIP_TAKEN: hiện câu lỗi đúng và đọc lại danh sách', async () => {
    let getCalls = 0
    serve({
      'GET /api/driver/open-trips': () => {
        getCalls++
        return ok([openTrip])
      },
      'POST /api/driver/trips/101/claim': () => fail(409, 'TRIP_CLAIM_TRIP_TAKEN'),
    })

    await renderApp(<OpenTripsScreen />, { auth: createMockAuth() })

    await fireEvent.press(await screen.findByRole('button', { name: driverVi.myTrips.actionsMenu }))
    await fireEvent.press(await screen.findByRole('button', { name: 'Xin nhận chuyến' }))

    // Hiện câu lỗi đúng của TRIP_CLAIM_TRIP_TAKEN
    expect(await screen.findByText('Chuyến này đã có tài xế nhận.')).toBeOnTheScreen()
    // Đã gọi đọc lại danh sách
    expect(getCalls).toBeGreaterThanOrEqual(2)
  })
})
