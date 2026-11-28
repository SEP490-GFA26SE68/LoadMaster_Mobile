import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native'

import type { ApiClient } from '@/data/http'
import { fakeDriverBackend } from '@/test/driver-backend'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored } from '@/test/render'
import { renderWarehouseScreen } from '@/test/warehouse-flow'
import { fail, loadingDto, ok, TASKS, type Call, type Routes } from '@/test/warehouse-backend'

import { ServerLoadingSessionScreen } from '../server/ServerLoadingSessionScreen'
import { ServerWarehouseTripsScreen } from '../server/ServerWarehouseTripsScreen'
import { VEHICLE_PRESENCE } from '../session-routes'
import { VehiclePresenceScreen } from './VehiclePresenceScreen'

/*
 * "Xe ở kho" và khối xác nhận xe trong phiên xếp, nguồn `warehouse` là máy chủ: adapter backend thật (`httpPresenceApi`,
 * `httpWarehouseApi`) trên máy chủ giả. Bảng `mockRoutes` dùng chung cho cả file, mỗi test gán lại câu trả lời.
 */

const mockRoutes: Routes = {}
let mockBackend: { readonly client: ApiClient; readonly calls: Call[] } | undefined
const mockClient = () => {
  if (mockBackend === undefined) throw new Error('chưa dựng máy chủ giả')
  return mockBackend.client
}

jest.mock('@/data/config', () => {
  const actual = jest.requireActual<typeof import('@/data/config')>('@/data/config')
  return { ...actual, dataConfig: { ...actual.dataConfig, sources: { ...actual.dataConfig.sources, warehouse: 'http' } } }
})

jest.mock('../warehouse-http', () => {
  const actual = jest.requireActual<typeof import('../warehouse-http')>('../warehouse-http')
  return { httpWarehouseApi: () => actual.httpWarehouseApi({ client: () => mockClient() }) }
})

jest.mock('./presence-http', () => {
  const actual = jest.requireActual<typeof import('./presence-http')>('./presence-http')
  return { ...actual, httpPresenceApi: () => actual.httpPresenceApi({ client: () => mockClient() }) }
})

configure({ asyncUtilTimeout: 5000 })

const BASE = '/api/warehouse/vehicle-presence'

/**
 * Xe 9 của chuyến 51 đang xếp ở kho 3, chưa ghi nhận có mặt; xe 10 đã ở kho 3; xe 11 sẵn sàng, chưa ghi nhận; xe 12 đang chạy một chuyến
 * Đang vận chuyển.
 */
const VEHICLES = [
  {
    id: 9,
    name: 'Xe tải 3,5 tấn',
    license_plate: '51C-555.55',
    loading_trip_id: 51,
    loading_trip_code: 'TRIP-0051',
    status: 'IN_TRIP',
    presence_status: 'UNKNOWN',
  },
  {
    id: 10,
    name: null,
    license_plate: '51D-678.90',
    status: 'AVAILABLE',
    presence_status: 'AT_WAREHOUSE',
    current_warehouse_id: 3,
    current_warehouse_name: 'Kho Long Bình',
    observed_at: '2026-11-22T02:15:00Z',
    actor_name: 'Lê Văn Kho',
  },
  { id: 11, name: 'Xe 1,25 tấn', license_plate: '60A-111.11', status: 'AVAILABLE', presence_status: 'UNKNOWN' },
  { id: 12, name: null, license_plate: '51E-999.99', status: 'IN_TRIP', presence_status: 'IN_TRANSIT' },
]

const BUSY = 'Xe đang ở một chuyến Đang vận chuyển hoặc đang xếp hàng ở kho khác — chưa ghi nhận được ở đây.'

function serve(routes: Routes) {
  for (const key of Object.keys(mockRoutes)) delete mockRoutes[key]
  Object.assign(mockRoutes, routes)
}

const posts = () => mockBackend?.calls.filter((call) => call.method === 'POST') ?? []

beforeAll(() => {
  mockBackend = fakeDriverBackend(mockRoutes)
})

beforeEach(() => {
  clearStored()
  resetNativeMocks()
  mockBackend?.calls.splice(0)
})

describe('Màn Xe ở kho', () => {
  test('danh sách chuyến có lối vào "Xe ở kho"', async () => {
    serve({ 'GET /api/warehouse/tasks': () => ok(TASKS) })
    await renderWarehouseScreen(<ServerWarehouseTripsScreen />)
    await fireEvent.press(await screen.findByRole('button', { name: 'Xe ở kho' }))
    expect(router.push).toHaveBeenCalledWith(VEHICLE_PRESENCE)
  })

  test('một kho: tên kho ở dải trời, mỗi xe nói trạng thái có mặt; xe ở chuyến khác không ghi nhận được, kèm lý do', async () => {
    serve({ [`GET ${BASE}/warehouses`]: () => ok([{ id: 3, name: 'Kho Long Bình' }]), [`GET ${BASE}/3/vehicles`]: () => ok(VEHICLES) })
    await renderWarehouseScreen(<VehiclePresenceScreen />)

    expect(await screen.findByText('51C-555.55')).toBeOnTheScreen()
    expect(screen.getByText('Kho Long Bình')).toBeOnTheScreen()
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.getByText('Đang xếp hàng cho chuyến TRIP-0051')).toBeOnTheScreen()
    expect(screen.getAllByText('Chưa ghi nhận')).toHaveLength(2)
    expect(screen.getByText('Ở kho này')).toBeOnTheScreen()
    expect(screen.getByText(/^Ghi nhận lúc \d\d:\d\d 22\/11\/2026 · Lê Văn Kho$/)).toBeOnTheScreen()

    const buttons = screen.getAllByRole('button', { name: 'Ghi nhận có ở kho' })
    // Xe đã ở kho này không có nút; xe của chuyến đang xếp ở kho này ghi nhận được; xe ở chuyến Đang vận chuyển có nút mờ kèm lý do
    expect(buttons).toHaveLength(3)
    expect(buttons[0]).toBeEnabled()
    expect(buttons[1]).toBeEnabled()
    expect(buttons[2]).toBeDisabled()
    // Lý do hiện dưới nút; trình đọc màn hình nghe nó ở gợi ý của nút nên dòng chữ ẩn khỏi cây truy cập
    expect(screen.getByText(BUSY, { includeHiddenElements: true })).toBeOnTheScreen()
    expect(buttons[2]?.props.accessibilityHint).toBe(BUSY)
    expect(buttons[0]?.props.accessibilityHint).toBeUndefined()
  })

  test('lọc xe đang ở kho và tìm theo biển số gửi đúng tham số; không có xe thì nói rõ', async () => {
    serve({ [`GET ${BASE}/warehouses`]: () => ok([{ id: 3, name: 'Kho Long Bình' }]), [`GET ${BASE}/3/vehicles`]: () => ok([]) })
    await renderWarehouseScreen(<VehiclePresenceScreen />)
    expect(await screen.findByText('Công ty chưa có xe nào.')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('tab', { name: /^Đang ở kho này/ }))
    expect(await screen.findByText('Chưa có xe nào được ghi nhận ở kho này.')).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText('Tìm theo biển số hoặc tên xe'), '51c')
    expect(await screen.findByText('Không có xe nào khớp "51c".')).toBeOnTheScreen()
    expect(mockBackend?.calls.at(-1)?.query).toMatchObject({ query: '51c', atWarehouse: 'true' })
  })

  test('ghi nhận xe: tờ xác nhận, gửi Idempotency-Key; lỗi giữ tờ và gửi lại cùng khoá; xong thì báo kết quả', async () => {
    let attempts = 0
    serve({
      [`GET ${BASE}/warehouses`]: () => ok([{ id: 3, name: 'Kho Long Bình' }]),
      [`GET ${BASE}/3/vehicles`]: () => ok(VEHICLES),
      [`POST ${BASE}/3/check-in`]: () => {
        attempts += 1
        return attempts === 1 ? fail(409, 'VEHICLE_TRANSFER_CONFLICT') : ok({ vehicleId: 11, status: 'AT_WAREHOUSE' })
      },
    })
    await renderWarehouseScreen(<VehiclePresenceScreen />)
    await screen.findByText('60A-111.11')
    await fireEvent.press(screen.getAllByRole('button', { name: 'Ghi nhận có ở kho' })[1]!)
    expect(await screen.findByText('Chỉ ghi nhận khi xe 60A-111.11 đang có mặt thật ở Kho Long Bình.')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Ghi nhận' }))
    expect(await screen.findByText('Xe đang được điều chuyển giữa hai kho nên chưa ghi nhận được.')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Ghi nhận' }))
    expect(await screen.findByText('Đã ghi nhận xe 60A-111.11 có ở Kho Long Bình.')).toBeOnTheScreen()

    const sent = posts()
    expect(sent).toHaveLength(2)
    expect(sent[0]).toMatchObject({ path: `${BASE}/3/check-in`, body: { vehicleId: 11 } })
    const key = sent[0]?.headers['Idempotency-Key']
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(sent[1]?.headers['Idempotency-Key']).toBe(key)
  })

  test('xe của chuyến đang xếp ở kho này: ghi nhận gửi lệnh check-in như mọi xe (máy chủ coi là xác nhận xe ở kho xuất phát)', async () => {
    serve({
      [`GET ${BASE}/warehouses`]: () => ok([{ id: 3, name: 'Kho Long Bình' }]),
      [`GET ${BASE}/3/vehicles`]: () => ok([{ ...VEHICLES[0], presence_status: 'IN_TRANSIT' }]),
      [`POST ${BASE}/3/check-in`]: () => ok({ vehicleId: 9, status: 'AT_WAREHOUSE' }),
    })
    await renderWarehouseScreen(<VehiclePresenceScreen />)
    await fireEvent.press(await screen.findByRole('button', { name: 'Ghi nhận có ở kho' }))
    await fireEvent.press(await screen.findByRole('button', { name: 'Ghi nhận' }))
    expect(await screen.findByText('Đã ghi nhận xe 51C-555.55 có ở Kho Long Bình.')).toBeOnTheScreen()
    expect(posts()).toEqual([expect.objectContaining({ path: `${BASE}/3/check-in`, body: { vehicleId: 9 } })])
  })

  test('lịch sử của xe: mới nhất trước, trạng thái trước → sau', async () => {
    serve({
      [`GET ${BASE}/warehouses`]: () => ok([{ id: 3, name: 'Kho Long Bình' }]),
      [`GET ${BASE}/3/vehicles`]: () => ok(VEHICLES),
      [`GET ${BASE}/3/vehicles/10/events`]: () =>
        ok([{ id: 1, eventType: 'CHECK_IN', previousStatus: 'UNKNOWN', newStatus: 'AT_WAREHOUSE', recordedAt: '2026-11-22T02:15:00Z' }]),
    })
    await renderWarehouseScreen(<VehiclePresenceScreen />)
    await screen.findByText('51D-678.90')
    await fireEvent.press(screen.getAllByRole('button', { name: 'Lịch sử' })[1]!)
    expect(await screen.findByText('Ghi nhận vào kho')).toBeOnTheScreen()
    expect(screen.getByText('Chưa ghi nhận → Ở kho này')).toBeOnTheScreen()
  })

  test('nhiều kho: chọn kho đọc lại xe của kho đó; chưa được phân công kho nào thì nói rõ; lỗi tải có nút thử lại', async () => {
    serve({
      [`GET ${BASE}/warehouses`]: () => ok([{ id: 3, name: 'Kho Long Bình' }, { id: 4, name: 'Kho Biên Hoà' }]),
      [`GET ${BASE}/3/vehicles`]: () => ok(VEHICLES),
      [`GET ${BASE}/4/vehicles`]: () => ok([]),
    })
    const view = await renderWarehouseScreen(<VehiclePresenceScreen />)
    await screen.findByText('51C-555.55')
    await fireEvent.press(screen.getByRole('radio', { name: 'Kho Biên Hoà' }))
    expect(await screen.findByText('Công ty chưa có xe nào.')).toBeOnTheScreen()
    view.unmount()

    serve({ [`GET ${BASE}/warehouses`]: () => ok([]) })
    const empty = await renderWarehouseScreen(<VehiclePresenceScreen />)
    expect(await screen.findByText('Bạn chưa được phân công kho nào')).toBeOnTheScreen()
    empty.unmount()

    serve({ [`GET ${BASE}/warehouses`]: () => fail(500) })
    await renderWarehouseScreen(<VehiclePresenceScreen />)
    expect(await screen.findByRole('button', { name: /Thử lại/ })).toBeOnTheScreen()
  })
})

describe('Xác nhận xe có ở kho trong phiên xếp, máy chủ trả nơi xe đang ở', () => {
  const SESSION = '/api/warehouse/tasks/51'
  const CONFIRM = `${BASE}/3/loading-trips/51/confirm-presence`
  const WAREHOUSES = [{ id: 3, name: 'Kho Long Bình' }, { id: 4, name: 'Kho Biên Hoà' }]
  /** Phiên của chuyến 51, xe 9 xuất phát từ kho 3, xe đang ở `presence`. */
  const sessionWith = (presence: Record<string, unknown> | null) =>
    loadingDto(['CONFIRMED', 'PENDING'], { licensePlate: '51C-555.55', vehicleId: 9, originWarehouseId: 3, vehiclePresence: presence })

  test('xe ở kho xuất phát: một dòng xác nhận, không nút, không tìm xe theo biển số', async () => {
    serve({ [`GET ${SESSION}`]: () => ok(sessionWith({ status: 'AT_WAREHOUSE', warehouseId: 3 })), [`GET ${BASE}/warehouses`]: () => ok(WAREHOUSES) })
    await renderWarehouseScreen(<ServerLoadingSessionScreen tripId="51" />)
    expect(await screen.findByText('Xe 51C-555.55 đã được ghi nhận ở Kho Long Bình.')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Xác nhận xe có ở kho' })).toBeNull()
    expect(mockBackend?.calls.some((call) => call.path.includes('/vehicles'))).toBe(false)
  })

  test.each([
    ['chưa ghi nhận', { status: 'UNKNOWN', warehouseId: null }, /^Xe 51C-555.55 chưa được ghi nhận ở Kho Long Bình./],
    ['đang trên đường', { status: 'IN_TRANSIT', warehouseId: null }, /^Xe 51C-555.55 đang được ghi là "Đang trên đường", chưa ở Kho Long Bình./],
    ['ở kho khác', { status: 'AT_WAREHOUSE', warehouseId: 4 }, /^Xe 51C-555.55 đang được ghi là "Ở kho Kho Biên Hoà", chưa ở Kho Long Bình./],
  ])('xe %s: nút "Xác nhận xe có ở kho" gửi kho xuất phát, chuyến và xe của phiên; xong thì báo đã xác nhận', async (_name, presence, text) => {
    let present = false
    serve({
      [`GET ${SESSION}`]: () => ok(sessionWith(present ? { status: 'AT_WAREHOUSE', warehouseId: 3 } : presence)),
      [`GET ${BASE}/warehouses`]: () => ok(WAREHOUSES),
      [`POST ${CONFIRM}`]: () => {
        present = true
        return ok({ vehicleId: 9, status: 'AT_WAREHOUSE' })
      },
    })
    await renderWarehouseScreen(<ServerLoadingSessionScreen tripId="51" />)
    expect(await screen.findByText(text)).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận xe có ở kho' }))
    expect(await screen.findByText('Đã xác nhận xe 51C-555.55 có ở Kho Long Bình.')).toBeOnTheScreen()
    expect(posts()).toEqual([expect.objectContaining({ path: CONFIRM, body: { vehicleId: 9 } })])
    // Phiên được đọc lại sau khi xác nhận: nó mang nơi xe đang ở
    expect(mockBackend?.calls.filter((call) => call.method === 'GET' && call.path === SESSION).length).toBeGreaterThan(1)
  })

  test('máy chủ còn từ chối (xe đang điều chuyển): câu lỗi của máy chủ ngay trên nút, bấm lại được', async () => {
    serve({
      [`GET ${SESSION}`]: () => ok(sessionWith({ status: 'IN_TRANSIT', warehouseId: null })),
      [`GET ${BASE}/warehouses`]: () => ok(WAREHOUSES),
      [`POST ${CONFIRM}`]: () => fail(409, 'VEHICLE_TRANSFER_CONFLICT'),
    })
    await renderWarehouseScreen(<ServerLoadingSessionScreen tripId="51" />)
    await fireEvent.press(await screen.findByRole('button', { name: 'Xác nhận xe có ở kho' }))
    expect(await screen.findByText('Xe đang được điều chuyển giữa hai kho nên chưa ghi nhận được.')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Xác nhận xe có ở kho' })).toBeEnabled()
  })

  test('nhân viên không được phân công kho xuất phát: cảnh báo, không nút', async () => {
    serve({
      [`GET ${SESSION}`]: () => ok(sessionWith({ status: 'UNKNOWN', warehouseId: null })),
      [`GET ${BASE}/warehouses`]: () => ok([{ id: 4, name: 'Kho Biên Hoà' }]),
    })
    await renderWarehouseScreen(<ServerLoadingSessionScreen tripId="51" />)
    expect(await screen.findByText(/^Bạn không được phân công ở kho xuất phát của chuyến nên chưa xác nhận được xe 51C-555.55./)).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Xác nhận xe có ở kho' })).toBeNull()
  })
})

describe('Xác nhận xe có ở kho trong phiên xếp, máy chủ cũ (tìm xe theo biển số)', () => {
  const SESSION = '/api/warehouse/tasks/51'

  test('xe chưa ghi nhận: nút "Xác nhận xe có ở kho" gửi đúng kho, chuyến và xe; xong thì báo đã xác nhận', async () => {
    let present = false
    serve({
      [`GET ${SESSION}`]: () => ok(loadingDto(['CONFIRMED', 'PENDING'], { licensePlate: '51C-555.55' })),
      [`GET ${BASE}/warehouses`]: () => ok([{ id: 3, name: 'Kho Long Bình' }]),
      [`GET ${BASE}/3/vehicles`]: () =>
        ok([present ? { ...VEHICLES[0], presence_status: 'AT_WAREHOUSE', current_warehouse_id: 3, current_warehouse_name: 'Kho Long Bình' } : VEHICLES[0]]),
      [`POST ${BASE}/3/loading-trips/51/confirm-presence`]: () => {
        present = true
        return ok({ vehicleId: 9, status: 'AT_WAREHOUSE' })
      },
    })
    await renderWarehouseScreen(<ServerLoadingSessionScreen tripId="51" />)
    expect(await screen.findByText(/^Xe 51C-555.55 chưa được ghi nhận ở Kho Long Bình\./)).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận xe có ở kho' }))
    expect(await screen.findByText('Đã xác nhận xe 51C-555.55 có ở Kho Long Bình.')).toBeOnTheScreen()
    expect(posts()).toEqual([
      expect.objectContaining({ path: `${BASE}/3/loading-trips/51/confirm-presence`, body: { vehicleId: 9 }, headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }) }),
    ])
  })

  test('xe đã ở kho: một dòng xác nhận, không có nút; xe đang được ghi trạng thái khác: nhờ điều phối viên', async () => {
    serve({
      [`GET ${SESSION}`]: () => ok(loadingDto(['PENDING', 'PENDING'], { licensePlate: '51C-555.55' })),
      [`GET ${BASE}/warehouses`]: () => ok([{ id: 3, name: 'Kho Long Bình' }]),
      [`GET ${BASE}/3/vehicles`]: () => ok([{ ...VEHICLES[0], presence_status: 'AT_WAREHOUSE', current_warehouse_id: 3 }]),
    })
    const view = await renderWarehouseScreen(<ServerLoadingSessionScreen tripId="51" />)
    expect(await screen.findByText('Xe 51C-555.55 đã được ghi nhận ở Kho Long Bình.')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Xác nhận xe có ở kho' })).toBeNull()
    view.unmount()

    serve({
      [`GET ${SESSION}`]: () => ok(loadingDto(['PENDING', 'PENDING'], { licensePlate: '51C-555.55' })),
      [`GET ${BASE}/warehouses`]: () => ok([{ id: 3, name: 'Kho Long Bình' }]),
      [`GET ${BASE}/3/vehicles`]: () => ok([{ ...VEHICLES[0], presence_status: 'IN_TRANSIT' }]),
    })
    await renderWarehouseScreen(<ServerLoadingSessionScreen tripId="51" />)
    expect(await screen.findByText(/^Xe 51C-555.55 đang được ghi là "Đang trên đường"/)).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Xác nhận xe có ở kho' })).toBeNull()
  })

  test('phiên không có biển số, hoặc máy chủ cũ chưa có endpoint xe ở kho: không có khối nào, phiên chạy như trước', async () => {
    serve({ [`GET ${SESSION}`]: () => ok(loadingDto()) })
    const view = await renderWarehouseScreen(<ServerLoadingSessionScreen tripId="51" />)
    await screen.findByRole('button', { name: 'Đối chiếu kiện' })
    expect(mockBackend?.calls.some((call) => call.path.startsWith(BASE))).toBe(false)
    view.unmount()

    serve({ [`GET ${SESSION}`]: () => ok(loadingDto(['PENDING', 'PENDING'], { licensePlate: '51C-555.55' })) })
    await renderWarehouseScreen(<ServerLoadingSessionScreen tripId="51" />)
    await screen.findByRole('button', { name: 'Đối chiếu kiện' })
    await waitFor(() => expect(mockBackend?.calls.some((call) => call.path === `${BASE}/warehouses`)).toBe(true))
    expect(screen.queryByText('Xe ở kho xuất phát')).toBeNull()
  })
})
