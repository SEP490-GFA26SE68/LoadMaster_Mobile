import { act, cleanup, fireEvent, screen } from '@testing-library/react-native'
import { renderRouter } from 'expo-router/testing-library'

import { resetMockDb } from '@/data/mock-db'
import { connectAuth } from '@/data/http'
import { DEMO_ACCOUNTS } from '@/lib/mock-db'
import { clearStored, signInAs } from '@/test/render'
import type { Role, User } from '@/types/user'

import type { AuthAdapter, AuthSession } from './auth-adapter'

// Đi qua router thật và các route của `src/app`: màn khoá thay cả nhóm đã đăng nhập ở `app/(app)/_layout.tsx`.
jest.unmock('expo-router')

// Bắt nối phiên của `AuthProvider` để giả lượt gọi backend bị từ chối 403 giữa lúc dùng
jest.mock('@/data/http', () => {
  const actual = jest.requireActual<typeof import('@/data/http')>('@/data/http')
  return { ...actual, connectAuth: jest.fn(actual.connectAuth) }
})

/** Cờ máy chủ gắn lên người dùng mỗi lần mở lại phiên; `refreshed`: hồ sơ đọc lại giữa lúc dùng (vắng thì adapter không đọc lại được). */
let mockFlags: Partial<User> = {}
let mockRefreshed: Partial<User> | null = null

jest.mock('@/features/auth/auth-api', () => {
  const { createMockAuth: mockAuth } = jest.requireActual<typeof import('./auth-mock')>('./auth-mock')
  let adapter: AuthAdapter | undefined
  return {
    authAdapter: () => {
      if (adapter === undefined) {
        const base = mockAuth()
        let opened: AuthSession | null = null
        adapter = {
          ...base,
          async restore(saved: string) {
            const session = await base.restore(saved)
            opened = session === null ? null : { ...session, user: { ...session.user, ...mockFlags } }
            return opened
          },
          async refresh(): Promise<AuthSession | null> {
            if (mockRefreshed === null) throw new Error('mất mạng')
            return opened === null ? null : { ...opened, user: { ...opened.user, ...mockRefreshed } }
          },
        }
      }
      return adapter
    },
  }
})

function emailOf(role: Role): string {
  const account = DEMO_ACCOUNTS.find((item) => item.role === role)
  if (account === undefined) throw new Error(`Kho mẫu không có tài khoản dùng thử của vai trò ${role}`)
  return account.email
}

/** Báo cho `AuthProvider` như khi một lượt gọi backend vừa nhận 403 kèm `code`. */
async function serverRefuses(code: string) {
  const link = jest.mocked(connectAuth).mock.lastCall?.[0]
  await act(async () => {
    link?.onAccountLocked?.(code)
  })
}

beforeEach(() => {
  resetMockDb()
  clearStored()
  mockFlags = {}
  mockRefreshed = null
})

afterEach(async () => {
  await cleanup()
  jest.useRealTimers()
})

test('gói cước của công ty đã hết hạn: tài xế thấy màn khoá thay màn chính, đăng xuất về màn đăng nhập', async () => {
  await signInAs(emailOf('driver'))
  mockFlags = { subscriptionExpired: true }
  await renderRouter('src/app', { initialUrl: '/trips' })

  expect(await screen.findByRole('header', { name: 'Gói cước của doanh nghiệp đã hết hạn' })).toBeOnTheScreen()
  expect(screen.getByText('Liên hệ Quản trị công ty của doanh nghiệp để gia hạn hoặc đăng ký gói cước.')).toBeOnTheScreen()
  expect(screen.queryByRole('header', { name: 'Chuyến của tôi' })).toBeNull()

  await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }))
  expect(await screen.findByRole('button', { name: 'Đăng nhập' })).toBeOnTheScreen()
})

test('tài khoản bị gắn cờ: nhân viên kho thấy màn khoá nói quản trị công ty phải ký trên bản web', async () => {
  await signInAs(emailOf('warehouse'))
  mockFlags = { status: 'flagged' }
  await renderRouter('src/app', { initialUrl: '/warehouse' })

  expect(await screen.findByRole('header', { name: 'Tài khoản tạm thời bị khóa do chưa hoàn tất ký thỏa thuận dịch vụ trong 72 giờ' })).toBeOnTheScreen()
  expect(screen.getByText('Quản trị công ty cần ký thỏa thuận dịch vụ trên bản web LoadMaster để mở lại tài khoản.')).toBeOnTheScreen()
  expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeOnTheScreen()
})

test('quản trị công ty của công ty hết gói vẫn vào màn Tài khoản (máy chủ không khoá quản trị)', async () => {
  await signInAs(emailOf('companyAdmin'))
  mockFlags = { subscriptionExpired: true }
  await renderRouter('src/app', { initialUrl: '/' })
  expect(await screen.findByRole('header', { name: 'Tài khoản' })).toBeOnTheScreen()
})

describe('máy chủ từ chối giữa lúc dùng', () => {
  test('đọc lại hồ sơ: màn khoá theo hồ sơ mới của máy chủ', async () => {
    await signInAs(emailOf('driver'))
    await renderRouter('src/app', { initialUrl: '/trips' })
    expect(await screen.findByRole('header', { name: 'Chuyến của tôi' })).toBeOnTheScreen()

    // Hồ sơ đọc lại nói tài khoản bị gắn cờ: màn khoá theo hồ sơ, không theo mã của lượt gọi
    mockRefreshed = { status: 'flagged' }
    await serverRefuses('SUBSCRIPTION_EXPIRED')
    expect(await screen.findByRole('header', { name: 'Tài khoản bị khóa' })).toBeOnTheScreen()
  })

  test('không đọc lại được hồ sơ: tin mã máy chủ vừa trả', async () => {
    await signInAs(emailOf('driver'))
    await renderRouter('src/app', { initialUrl: '/trips' })
    expect(await screen.findByRole('header', { name: 'Chuyến của tôi' })).toBeOnTheScreen()

    await serverRefuses('SUBSCRIPTION_EXPIRED')
    expect(await screen.findByRole('header', { name: 'Gói cước hết hạn' })).toBeOnTheScreen()
  })
})
