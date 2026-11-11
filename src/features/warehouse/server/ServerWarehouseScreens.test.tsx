import { act, configure, fireEvent, screen, waitFor } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import type { RefreshControlProps } from 'react-native'

import type { ApiClient } from '@/data/http'
import { fakeDriverBackend } from '@/test/driver-backend'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored } from '@/test/render'
import { renderWarehouseScreen } from '@/test/warehouse-flow'
import { fail, loadingDto, ok, sessionDto, step, TASKS, type Call, type Routes } from '@/test/warehouse-backend'

import { loadingPath } from '../session-routes'
import { ServerLoadingSessionScreen } from './ServerLoadingSessionScreen'
import { ServerWarehouseTripsScreen } from './ServerWarehouseTripsScreen'

/*
 * Màn kho khi nguồn `warehouse` là máy chủ: adapter backend thật (`httpWarehouseApi`) trên máy chủ giả, không chạm kho mẫu. Bảng
 * `mockRoutes` dùng chung cho cả file, mỗi test gán lại câu trả lời; phiên đọc lại theo biến `mockSession` để test đổi phiên sau mỗi lần ghi.
 */

const mockRoutes: Routes = {}
let mockBackend: { readonly client: ApiClient; readonly calls: Call[] } | undefined

jest.mock('@/data/config', () => {
  const actual = jest.requireActual<typeof import('@/data/config')>('@/data/config')
  return { ...actual, dataConfig: { ...actual.dataConfig, sources: { ...actual.dataConfig.sources, warehouse: 'http' } } }
})

jest.mock('../warehouse-http', () => {
  const actual = jest.requireActual<typeof import('../warehouse-http')>('../warehouse-http')
  return {
    httpWarehouseApi: () =>
      actual.httpWarehouseApi({
        client: () => {
          if (mockBackend === undefined) throw new Error('chưa dựng máy chủ giả')
          return mockBackend.client
        },
      }),
  }
})

configure({ asyncUtilTimeout: 5000 })

const SESSION = '/api/warehouse/tasks/51'

/** Máy chủ trả `session()` cho mọi lượt đọc phiên chuyến 51 (đọc lúc gọi), cộng các lệnh ghi của test. */
function serve(session: () => unknown, extra: Routes = {}) {
  for (const key of Object.keys(mockRoutes)) delete mockRoutes[key]
  Object.assign(mockRoutes, { [`GET ${SESSION}`]: () => ok(session()), ...extra })
}

const posts = () => mockBackend?.calls.filter((call) => call.method === 'POST') ?? []

const renderSession = () => renderWarehouseScreen(<ServerLoadingSessionScreen tripId="51" />)

/** Mở tờ đối chiếu bằng nút chính của bước rồi sang tab gõ mã. */
async function openCodeEntry() {
  await fireEvent.press(screen.getByRole('button', { name: 'Đối chiếu kiện' }))
  await fireEvent.press(await screen.findByRole('tab', { name: 'Gõ mã' }))
}

async function verifyCode(code: string) {
  await fireEvent.changeText(screen.getByLabelText('Mã QR hoặc mã bên gửi'), code)
  await fireEvent.press(screen.getByRole('button', { name: 'Đối chiếu mã' }))
}

/** Jest không dàn trang nên danh sách ảo chỉ vẽ các ô của lần vẽ đầu: báo khung nhìn và chiều cao nội dung để nó vẽ tiếp. */
async function layOutList() {
  const list = screen.root?.queryAll((node) => node.type === 'RCTScrollView')[0]
  if (list === undefined) throw new Error('màn không có danh sách cuộn')
  await fireEvent(list, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } } })
  await fireEvent(list, 'contentSizeChange', 390, 2400)
}

/** Kéo màn xuống để đọc lại phiên: gọi `onRefresh` của `RefreshControl`, như khi kéo trên máy. */
async function pullToRefresh() {
  const list = screen.root?.queryAll((node) => node.type === 'RCTScrollView' && node.props.refreshControl != null)[0]
  const control: ReactElement<RefreshControlProps> | undefined = list?.props.refreshControl
  if (control === undefined) throw new Error('màn không kéo xuống để đọc lại được')
  await act(async () => control.props.onRefresh?.())
}

beforeAll(() => {
  mockBackend = fakeDriverBackend(mockRoutes)
})

beforeEach(() => {
  clearStored()
  resetNativeMocks()
  mockBackend?.calls.splice(0)
})

describe('Danh sách chuyến của kho trên máy chủ', () => {
  test('nhóm theo trạng thái phiên, chuyến chờ tối ưu lại nói lý do; "Bắt đầu soạn hàng" gửi bước soạn rồi mở phiên', async () => {
    serve(() => sessionDto({ tripId: 52, tripCode: 'TRIP-0052' }), {
      'GET /api/warehouse/tasks': () => ok(TASKS),
      'POST /api/warehouse/tasks/52/start': () => ok(sessionDto({ tripId: 52, tripCode: 'TRIP-0052' })),
    })
    await renderWarehouseScreen(<ServerWarehouseTripsScreen />)

    expect(await screen.findByRole('header', { name: 'Đang xếp hàng (1)' })).toBeOnTheScreen()
    for (const group of ['Chờ xếp (1)', 'Xếp xong — chờ xuất phát (1)', 'Chờ điều phối tối ưu lại (1)']) {
      expect(screen.getByRole('header', { name: group })).toBeOnTheScreen()
    }
    await layOutList()
    expect(await screen.findByText(/^Kho báo kiện hỏng có kiện tựa lên\./)).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Bắt đầu soạn hàng TRIP-0052' }))
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(loadingPath('52')))
    expect(posts()).toEqual([expect.objectContaining({ path: '/api/warehouse/tasks/52/start', body: { staging: true } })])
  })
})

describe('Phiên soạn → xếp trên máy chủ', () => {
  test('soạn hàng: mã lạ không gửi gì; gõ mã QR chữ hoa vẫn khớp kiện, máy chủ ghi đã soạn bằng mã gõ và danh sách đọc lại', async () => {
    let staged = false
    serve(() => sessionDto({ placements: [step(901, 1, { staged }), step(902, 2)] }), {
      'POST /api/warehouse/tasks/51/staging/packages/7001/confirm': () => {
        staged = true
        return ok({ alreadyStaged: false })
      },
    })
    await renderSession()
    expect(await screen.findByRole('header', { name: 'Kiện chưa soạn (2)' })).toBeOnTheScreen()

    await openCodeEntry()
    await verifyCode('PK-404')
    expect(await screen.findByText('Mã PK-404 không phải kiện của chuyến này. Chưa ghi gì.')).toBeOnTheScreen()
    expect(posts()).toHaveLength(0)

    await verifyCode('LM-QR-0001')
    expect(await screen.findByText('Đã soạn DMX-01 · Tủ lạnh 1.')).toBeOnTheScreen()
    expect(await screen.findByRole('header', { name: 'Kiện chưa soạn (1)' })).toBeOnTheScreen()
    expect(posts()).toEqual([expect.objectContaining({ body: { method: 'CODE' } })])
  })

  test('xếp: mã của kiện khác không gửi gì; đúng kiện thì máy chủ ghi đã xếp và màn sang bước kế tiếp', async () => {
    let statuses = ['PENDING', 'PENDING']
    serve(() => loadingDto(statuses), {
      'POST /api/warehouse/placements/901/confirm': () => {
        statuses = ['CONFIRMED', 'PENDING']
        return ok(null)
      },
    })
    await renderSession()
    expect(await screen.findByText('Kiện cần xếp — bước 1 / 2')).toBeOnTheScreen()

    await openCodeEntry()
    await verifyCode('DMX-02')
    expect(await screen.findByText('Mã DMX-02 không phải kiện của bước này (Tủ lạnh 1). Chưa ghi gì — xếp theo đúng thứ tự.')).toBeOnTheScreen()
    expect(posts()).toHaveLength(0)

    await verifyCode('dmx-01')
    expect(await screen.findByText('Đã xếp Tủ lạnh 1.')).toBeOnTheScreen()
    expect(await screen.findByText('Kiện cần xếp — bước 2 / 2')).toBeOnTheScreen()
  })

  test('kiện hỏng có kiện tựa lên: chuyến về lập kế hoạch, màn nói đúng lý do thay cho lỗi đọc phiên', async () => {
    let replanned = false
    serve(() => loadingDto(), {
      'POST /api/warehouse/placements/901/damaged': () => {
        replanned = true
        return ok({ outcome: 'REPLANNED', restingCount: 1 })
      },
    })
    mockRoutes[`GET ${SESSION}`] = () => (replanned ? fail(409, 'TRIP_NOT_LOADING') : ok(loadingDto()))
    await renderSession()

    await fireEvent.press(await screen.findByRole('button', { name: 'Kiện hỏng' }))
    await fireEvent.press(await screen.findByRole('button', { name: 'Ghi kiện hỏng' }))
    expect(await screen.findByText('Kiện hỏng DMX-01: chuyến về Đã lập kế hoạch')).toBeOnTheScreen()
    expect(screen.getByText('Phải dỡ ra và xếp lại theo phương án mới. Chờ điều phối viên tối ưu lại và duyệt.')).toBeOnTheScreen()
  })

  test('mọi kiện đã có kết quả: còn xác nhận tay chờ thì nút hoàn tất mờ; hết chờ thì hoàn tất sang màn Xếp xong', async () => {
    let pending = 1
    let completed = false
    serve(() => loadingDto(['CONFIRMED', 'CONFIRMED'], { pendingManualCount: pending, status: completed ? 'COMPLETED' : 'IN_PROGRESS' }), {
      'POST /api/warehouse/tasks/51/complete': () => {
        completed = true
        return ok(null)
      },
    })
    await renderSession()
    expect(await screen.findByRole('button', { name: 'Hoàn tất xếp hàng' })).toBeDisabled()
    expect(screen.getByText('Còn 1 xác nhận tay chờ điều phối viên duyệt — chưa hoàn tất xếp được.')).toBeOnTheScreen()

    pending = 0
    await pullToRefresh()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Hoàn tất xếp hàng' })).toBeEnabled())
    await fireEvent.press(screen.getByRole('button', { name: 'Hoàn tất xếp hàng' }))
    expect(await screen.findByRole('header', { name: 'Đã xếp xong chuyến TRIP-0051' })).toBeOnTheScreen()
  })

  test('xếp xong: ghi số seal lên máy chủ, rồi "Về danh sách chuyến" là nút chính', async () => {
    let seal: string | null = null
    serve(() => loadingDto(['CONFIRMED', 'DAMAGED'], { status: 'COMPLETED', sealNumber: seal }), {
      'POST /api/warehouse/tasks/51/seal': (call) => {
        seal = (call.body as { sealNumber: string }).sealNumber
        return ok(null)
      },
    })
    await renderSession()
    expect(await screen.findByText(/Đã bỏ lại 1 kiện hỏng ở kho\.$/)).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Ghi số seal' }))
    await fireEvent.changeText(await screen.findByLabelText('Số seal'), ' SL-77 ')
    await fireEvent.press(screen.getByRole('button', { name: 'Ghi số seal' }))
    expect(await screen.findByText('Số seal SL-77')).toBeOnTheScreen()
    expect(posts()).toEqual([expect.objectContaining({ body: { sealNumber: 'SL-77' } })])
    expect(screen.queryByRole('button', { name: 'Ghi số seal' })).toBeNull()
  })

  test('chuyến không còn ở Đang xếp hàng: nói không mở được phiên, không có nút thử lại', async () => {
    serve(() => null)
    mockRoutes[`GET ${SESSION}`] = () => fail(409, 'TRIP_NOT_LOADING')
    await renderSession()
    expect(await screen.findByText('Không mở được phiên xếp')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull()
  })
})
