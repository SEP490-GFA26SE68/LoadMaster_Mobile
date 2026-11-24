import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native'

import type { ApiClient } from '@/data/http'
import type { AuthAdapter } from '@/features/auth/auth-adapter'
import { createMockAuth } from '@/features/auth/auth-mock'
import { fail, fakeDriverBackend, ok, type Call, type Routes } from '@/test/driver-backend'
import { DRIVER_EMAIL } from '@/test/driver-flow'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored, renderApp, signInAs } from '@/test/render'
import type { User } from '@/types/user'

import { AssistantButton } from './AssistantButton'
import { resetAssistantSessionForTest } from './assistant-session'
import { AssistantScreen } from './AssistantScreen'

/*
 * Trợ lý khi nguồn `assistant` là máy chủ (đăng nhập bằng Keycloak): adapter backend thật (`httpAssistantApi`) trên máy chủ giả. Người
 * đăng nhập là tài khoản của kho mẫu, cờ khoá gắn thêm qua adapter đăng nhập của test.
 */

const mockRoutes: Routes = {}
let mockBackend: { readonly client: ApiClient; readonly calls: Call[] } | undefined

jest.mock('@/data/config', () => {
  const actual = jest.requireActual<typeof import('@/data/config')>('@/data/config')
  return { ...actual, dataConfig: { ...actual.dataConfig, sources: { ...actual.dataConfig.sources, assistant: 'http' } } }
})

jest.mock('./assistant-http', () => {
  const actual = jest.requireActual<typeof import('./assistant-http')>('./assistant-http')
  return {
    ...actual,
    httpAssistantApi: () =>
      actual.httpAssistantApi({
        client: () => {
          if (mockBackend === undefined) throw new Error('chưa dựng máy chủ giả')
          return mockBackend.client
        },
      }),
  }
})

configure({ asyncUtilTimeout: 5000 })

const PATH = 'POST /api/assistant/messages'
const PAGE = { path: '/tai-xe', title: 'Chuyến của tôi' }

function serve(routes: Routes) {
  for (const key of Object.keys(mockRoutes)) delete mockRoutes[key]
  Object.assign(mockRoutes, routes)
}

/** Đăng nhập kho mẫu, hồ sơ mang thêm cờ của máy chủ (`flags`). */
function authWith(flags: Partial<User> = {}): AuthAdapter {
  const base = createMockAuth()
  return {
    ...base,
    async restore(saved) {
      const session = await base.restore(saved)
      return session === null ? null : { ...session, user: { ...session.user, ...flags } }
    },
  }
}

const bodies = () => (mockBackend?.calls ?? []).filter((call) => call.path === '/api/assistant/messages').map((call) => call.body)

beforeAll(() => {
  mockBackend = fakeDriverBackend(mockRoutes)
})

beforeEach(() => {
  clearStored()
  resetNativeMocks()
  resetAssistantSessionForTest()
  mockBackend?.calls.splice(0)
  jest.clearAllMocks()
})

describe('nút trợ lý trên dải trời', () => {
  test('tài xế đăng nhập bằng máy chủ: nút "Trợ lý AI" mở màn trò chuyện kèm màn đang mở', async () => {
    await signInAs(DRIVER_EMAIL)
    await renderApp(<AssistantButton page="/tai-xe" title="Chuyến của tôi" />, { auth: authWith() })
    await fireEvent.press(await screen.findByRole('button', { name: 'Trợ lý AI' }))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/assistant', params: { page: '/tai-xe', title: 'Chuyến của tôi' } })
  })

  test.each([
    ['bị gắn cờ', { status: 'flagged' } as const],
    ['công ty hết gói', { subscriptionExpired: true }],
  ])('tài khoản %s: không có nút', async (_name, flags) => {
    await signInAs(DRIVER_EMAIL)
    await renderApp(<AssistantButton page="/tai-xe" title="Chuyến của tôi" />, { auth: authWith(flags) })
    await waitFor(() => expect(screen.queryByText('…')).toBeNull())
    expect(screen.queryByRole('button', { name: 'Trợ lý AI' })).toBeNull()
  })

  test('điều phối viên (không có màn cảm ứng): không có nút', async () => {
    await signInAs('dieuphoi@loadmaster.vn')
    await renderApp(<AssistantButton page="/chuyen" title="Chuyến hàng" />, { auth: authWith() })
    expect(screen.queryByRole('button', { name: 'Trợ lý AI' })).toBeNull()
  })
})

describe('màn trò chuyện', () => {
  test('câu hỏi gợi ý của tài xế đi tới máy chủ; câu trả lời, nút mở màn của app hiện ra, liên kết không có màn bị bỏ', async () => {
    serve({
      [PATH]: () =>
        ok({
          conversationId: 'c-1',
          reply: 'Bạn có **một** chuyến hôm nay:\n- TRIP-0041, điểm kế tiếp Biên Hoà',
          uiActions: [{ type: 'focusPackage' }],
          links: [
            { label: 'Chuyến của tôi', to: '/tai-xe' },
            { label: 'Bảng giá', to: '/bang-gia' },
          ],
          handoff: { offered: false, ticketCode: null },
        }),
    })
    await signInAs(DRIVER_EMAIL)
    await renderApp(<AssistantScreen page={PAGE} />, { auth: authWith() })

    expect(await screen.findByText('Chào bạn, mình là Lumo.')).toBeOnTheScreen()
    expect(screen.getByText(/Lumo là trợ lý AI/)).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Hôm nay tôi chạy chuyến nào, điểm giao kế tiếp ở đâu?' }))

    expect(await screen.findByText('TRIP-0041, điểm kế tiếp Biên Hoà')).toBeOnTheScreen()
    expect(screen.getByText('Bạn có một chuyến hôm nay:')).toBeOnTheScreen()
    expect(bodies()).toEqual([{ message: 'Hôm nay tôi chạy chuyến nào, điểm giao kế tiếp ở đâu?', locale: 'vi', page: PAGE }])
    expect(screen.queryByRole('button', { name: 'Bảng giá' })).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Chuyến của tôi' }))
    expect(router.push).toHaveBeenCalledWith('/trips')

    // Câu kế tiếp nói tiếp cùng hội thoại
    await fireEvent.changeText(screen.getByLabelText('Câu hỏi của bạn'), 'Còn điểm nào nữa?')
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi câu hỏi' }))
    await waitFor(() => expect(bodies()).toHaveLength(2))
    expect(bodies()[1]).toEqual({ conversationId: 'c-1', message: 'Còn điểm nào nữa?', locale: 'vi', page: PAGE })
  })

  test('máy chủ tạo yêu cầu hỗ trợ: hiện mã yêu cầu', async () => {
    serve({ [PATH]: () => ok({ conversationId: 'c-2', reply: 'Mình đã chuyển cho đội hỗ trợ.', handoff: { offered: false, ticketCode: 'TKT-042' } }) })
    await signInAs(DRIVER_EMAIL)
    await renderApp(<AssistantScreen page={PAGE} />, { auth: authWith() })
    await fireEvent.changeText(await screen.findByLabelText('Câu hỏi của bạn'), 'Chuyển cho đội hỗ trợ giúp tôi')
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi câu hỏi' }))
    expect(await screen.findByText(/Đã tạo yêu cầu hỗ trợ TKT-042/)).toBeOnTheScreen()
  })

  test('máy chủ từ chối: lỗi thành câu, ô gõ vẫn dùng được', async () => {
    serve({ [PATH]: () => fail(429, 'ASSISTANT_RATE_LIMITED') })
    await signInAs(DRIVER_EMAIL)
    await renderApp(<AssistantScreen page={PAGE} />, { auth: authWith() })
    await fireEvent.changeText(await screen.findByLabelText('Câu hỏi của bạn'), 'Phiếu lương của tôi?')
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi câu hỏi' }))
    expect(await screen.findByText('Bạn đã hỏi trợ lý quá nhiều lần trong một giờ. Thử lại sau.')).toBeOnTheScreen()
    expect(screen.getByLabelText('Câu hỏi của bạn')).toBeOnTheScreen()
  })
})
