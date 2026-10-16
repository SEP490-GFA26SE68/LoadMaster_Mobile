import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'

import { ApiError } from '@/data/http'
import { resetMockDb } from '@/data/mock-db'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'
import { clearStored, renderApp } from '@/test/render'
import type { User } from '@/types/user'

import { SIGN_IN_CANCELLED, type AuthSession, type RedirectAuth } from './auth-adapter'
import { useAuth } from './AuthProvider'
import { SignInScreen } from './SignInScreen'

/** Thay cho bộ điều hướng: chưa đăng nhập thì hiện màn đăng nhập, đăng nhập rồi thì hiện tên và vai trò. */
function Gate() {
  const { status, user } = useAuth()
  if (status === 'restoring') return null
  return user === null ? <SignInScreen /> : <Text>{`đã vào: ${user.fullName} (${user.role})`}</Text>
}

const driver = DEMO_ACCOUNTS.find((account) => account.role === 'driver')

describe('màn đăng nhập trên kho mẫu', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
  })

  test('bỏ trống: hiện câu lỗi của từng ô, không đăng nhập', async () => {
    await renderApp(<Gate />)
    await fireEvent.press(await screen.findByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByText('Nhập email')).toBeOnTheScreen()
    expect(screen.getByText('Nhập mật khẩu')).toBeOnTheScreen()
  })

  test('sai mật khẩu: hiện câu của kho, vẫn ở màn đăng nhập', async () => {
    await renderApp(<Gate />)
    await fireEvent.changeText(await screen.findByLabelText('Email'), driver?.email ?? '')
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'sai-mat-khau')
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByText('Email hoặc mật khẩu không đúng.')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeOnTheScreen()
  })

  test('chạm tài khoản dùng thử của tài xế rồi đăng nhập: vào app bằng đúng người đó', async () => {
    await renderApp(<Gate />)
    await fireEvent.press(await screen.findByRole('button', { name: `Tài xế, ${driver?.email}` }))
    await waitFor(() => expect(screen.getByLabelText('Email').props.value).toBe(driver?.email))
    expect(screen.getByLabelText('Mật khẩu').props.value).toBe(SEED_PASSWORD)
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByText(/^đã vào: .+ \(driver\)$/)).toBeOnTheScreen()
  })

  test('giao diện tiếng Anh: nhãn và câu lỗi đổi theo', async () => {
    await renderApp(<Gate />, { locale: 'en' })
    await fireEvent.press(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your email')).toBeOnTheScreen()
  })
})

describe('màn đăng nhập khi đăng nhập dùng Keycloak của backend', () => {
  const user: User = {
    id: '15',
    fullName: 'Trần Văn Bình',
    email: 'binh@longbinh.vn',
    phone: '',
    role: 'driver',
    status: 'active',
    lastActiveAt: null,
  }

  /** Adapter kiểu `redirect` giả: `signIn` thay cho trang đăng nhập của máy chủ. */
  function redirectAuth(signIn: () => Promise<AuthSession>): RedirectAuth {
    return {
      kind: 'redirect',
      signIn: jest.fn(signIn),
      restore: async () => null,
      signOut: async () => undefined,
      accessToken: async () => null,
      backendUserId: () => null,
    }
  }

  beforeEach(() => {
    clearStored()
  })

  test('không có form, không có tài khoản dùng thử; nút mở trang đăng nhập và chờ tới khi phiên vào app', async () => {
    let finish: (session: AuthSession) => void = () => undefined
    const auth = redirectAuth(() => new Promise((resolve) => (finish = resolve)))
    await renderApp(<Gate />, { auth })
    expect(await screen.findByText(/Trang đăng nhập của LoadMaster sẽ mở trong trình duyệt/)).toBeOnTheScreen()
    expect(screen.queryByLabelText('Email')).toBeNull()
    expect(screen.queryByText('Tài khoản dùng thử')).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(auth.signIn).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeBusy())
    finish({ user, saved: 'phiên' })
    expect(await screen.findByText('đã vào: Trần Văn Bình (driver)')).toBeOnTheScreen()
  })

  test('đóng trang đăng nhập: không báo lỗi, bấm lại được', async () => {
    let close: (error: unknown) => void = () => undefined
    await renderApp(<Gate />, { auth: redirectAuth(() => new Promise((_resolve, reject) => (close = reject))) })
    await fireEvent.press(await screen.findByRole('button', { name: 'Đăng nhập' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeBusy())
    close(new ApiError(SIGN_IN_CANCELLED))
    // Câu lỗi (nếu có) vẽ cùng lượt với nút hết bận
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng nhập' })).not.toBeBusy())
    expect(screen.queryByText(/Có lỗi xảy ra/)).toBeNull()
  })

  test('máy chủ không cho vào app: hiện câu theo mã, kèm vai trò', async () => {
    await renderApp(<Gate />, { auth: redirectAuth(() => Promise.reject(new ApiError('ROLE_UNKNOWN', { params: { role: 'ACCOUNTANT' } }))) })
    await fireEvent.press(await screen.findByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByText('Tài khoản có vai trò "ACCOUNTANT" mà app chưa hỗ trợ. Liên hệ quản trị công ty.')).toBeOnTheScreen()
  })
})
