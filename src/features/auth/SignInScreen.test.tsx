import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'

import { ApiError } from '@/data/http'
import { resetMockDb } from '@/data/mock-db'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'
import { clearStored, renderApp } from '@/test/render'
import type { User } from '@/types/user'

import type { AuthAdapter, AuthSession } from './auth-adapter'
import { useAuth } from './AuthProvider'
import type { PasswordResetApi } from './password-reset-api'
import { SignInScreen } from './SignInScreen'

/** Thay cho bộ điều hướng: chưa đăng nhập thì hiện màn đăng nhập, đăng nhập rồi thì hiện tên và vai trò. */
function Gate({ reset }: { reset?: PasswordResetApi }) {
  const { status, user } = useAuth()
  if (status === 'restoring') return null
  if (user !== null) return <Text>{`đã vào: ${user.fullName} (${user.role})`}</Text>
  return reset === undefined ? <SignInScreen /> : <SignInScreen passwordReset={reset} />
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

  test('kho mẫu không đặt lại được mật khẩu: không có nút "Quên mật khẩu?"', async () => {
    await renderApp(<Gate />)
    expect(await screen.findByRole('button', { name: 'Đăng nhập' })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Quên mật khẩu?' })).toBeNull()
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
  const EMAIL = 'binh@longbinh.vn'

  /** Adapter đăng nhập giả: `signIn` thay cho lượt gọi Keycloak và `GET /api/users/me`. */
  function fakeAuth(signIn: (email: string, password: string) => Promise<AuthSession>) {
    return {
      signIn: jest.fn(signIn),
      restore: async () => null,
      signOut: async () => undefined,
      accessToken: async () => null,
      renewAccessToken: async () => null,
      backendUserId: () => null,
    } satisfies AuthAdapter
  }

  function fakeReset(overrides: Partial<PasswordResetApi> = {}) {
    return {
      supported: true,
      requestCode: jest.fn(async (_email: string) => undefined),
      verifyCode: jest.fn(async (_email: string, _otp: string) => 'RST-1'),
      resetPassword: jest.fn(async (_token: string, _password: string) => undefined),
      ...overrides,
    } satisfies PasswordResetApi
  }

  const entered = async () => ({ user, saved: 'phiên' })

  async function typeCredentials(email: string, password: string) {
    await fireEvent.changeText(await screen.findByLabelText('Email'), email)
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), password)
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }))
  }

  /** Đi bước 1 và bước 2 của Đặt lại mật khẩu bằng mã đúng. */
  async function reachPasswordStep() {
    await fireEvent.press(await screen.findByRole('button', { name: 'Gửi mã' }))
    await fireEvent.changeText(await screen.findByLabelText('Mã xác nhận'), '123456')
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mã' }))
    expect(await screen.findByText('Bước 3 / 3')).toBeOnTheScreen()
  }

  async function setNewPassword(password: string) {
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), password)
    await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'), password)
    await fireEvent.press(screen.getByRole('button', { name: 'Đặt mật khẩu' }))
  }

  beforeEach(() => {
    clearStored()
  })

  test('đăng nhập trong app: gửi email và mật khẩu đã gõ, vào app khi có phiên', async () => {
    const auth = fakeAuth(entered)
    await renderApp(<Gate reset={fakeReset()} />, { auth })
    await typeCredentials(EMAIL, 'mat-khau')
    expect(await screen.findByText('đã vào: Trần Văn Bình (driver)')).toBeOnTheScreen()
    expect(auth.signIn).toHaveBeenCalledWith(EMAIL, 'mat-khau')
  })

  test.each([
    [new ApiError('INVALID_CREDENTIALS', { status: 400 }), 'Email hoặc mật khẩu không đúng.'],
    [new ApiError('ACCOUNT_SUSPENDED', { status: 400 }), 'Tài khoản đã bị khoá.'],
    [new ApiError('PROFILE_NOT_FOUND', { status: 404 }), 'Tài khoản đăng nhập chưa gắn với người dùng nào của LoadMaster. Liên hệ quản trị công ty.'],
    [new ApiError('ROLE_UNKNOWN', { params: { role: 'ACCOUNTANT' } }), 'Tài khoản có vai trò "ACCOUNTANT" mà app chưa hỗ trợ. Liên hệ quản trị công ty.'],
    [new ApiError('NETWORK_ERROR'), 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'],
  ])('máy chủ không cho vào (%s): hiện câu theo mã, vẫn ở màn đăng nhập', async (error, message) => {
    await renderApp(<Gate reset={fakeReset()} />, { auth: fakeAuth(() => Promise.reject(error)) })
    await typeCredentials(EMAIL, 'mat-khau')
    expect(await screen.findByText(message)).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Quên mật khẩu?' })).toBeOnTheScreen()
  })

  test('tài khoản dùng mật khẩu tạm: câu báo kèm nút mở Đặt lại mật khẩu với email đã gõ', async () => {
    await renderApp(<Gate reset={fakeReset()} />, { auth: fakeAuth(() => Promise.reject(new ApiError('PASSWORD_CHANGE_REQUIRED', { status: 400 }))) })
    await typeCredentials(EMAIL, 'mat-khau-tam')
    expect(await screen.findByText('Tài khoản cần đặt mật khẩu mới trước khi đăng nhập.')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Quên mật khẩu?' })).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Đặt mật khẩu mới' }))
    expect(await screen.findByText('Bước 1 / 3')).toBeOnTheScreen()
    expect(screen.getByLabelText('Email').props.value).toBe(EMAIL)
  })

  test('quên mật khẩu: email → mã → mật khẩu mới, rồi về đăng nhập với email đã điền và câu báo đã đặt', async () => {
    const reset = fakeReset({
      verifyCode: jest.fn((_email: string, otp: string) =>
        otp === '123456' ? Promise.resolve('RST-1') : Promise.reject(new ApiError('RESET_CODE_INVALID', { status: 400 })),
      ),
    })
    await renderApp(<Gate reset={reset} />, { auth: fakeAuth(entered) })
    await fireEvent.changeText(await screen.findByLabelText('Email'), EMAIL)
    await fireEvent.press(screen.getByRole('button', { name: 'Quên mật khẩu?' }))

    // Bước 1: email điền sẵn từ form đăng nhập
    expect(await screen.findByText('Bước 1 / 3')).toBeOnTheScreen()
    expect(screen.getByLabelText('Email').props.value).toBe(EMAIL)
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi mã' }))
    expect(reset.requestCode).toHaveBeenCalledWith(EMAIL)

    // Bước 2: gửi lại mã phải chờ 60 giây, nút mờ kèm lý do
    expect(await screen.findByText('Bước 2 / 3')).toBeOnTheScreen()
    expect(screen.getByText(new RegExp(`Nếu ${EMAIL} có tài khoản`))).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Gửi lại mã' })).toBeDisabled()
    expect(screen.getByText(/^Gửi lại mã được sau \d+ giây\.$/)).toBeOnTheScreen()

    await fireEvent.changeText(screen.getByLabelText('Mã xác nhận'), '12')
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mã' }))
    expect(await screen.findByText('Mã gồm đúng 6 chữ số')).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText('Mã xác nhận'), '000000')
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mã' }))
    expect(await screen.findByText('Mã không đúng hoặc đã hết hạn. Kiểm tra lại mã, hoặc gửi mã mới.')).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText('Mã xác nhận'), '123456')
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mã' }))

    // Bước 3: mật khẩu mới nhập hai lần
    expect(await screen.findByText('Bước 3 / 3')).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'ngan')
    await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'), 'khac')
    await fireEvent.press(screen.getByRole('button', { name: 'Đặt mật khẩu' }))
    expect(await screen.findByText('Mật khẩu cần ít nhất 8 ký tự')).toBeOnTheScreen()
    expect(screen.getByText('Hai mật khẩu chưa giống nhau')).toBeOnTheScreen()
    await setNewPassword('mat-khau-moi')
    expect(reset.resetPassword).toHaveBeenCalledWith('RST-1', 'mat-khau-moi')

    expect(await screen.findByText('Đã đặt mật khẩu mới. Đăng nhập bằng mật khẩu vừa đặt.')).toBeOnTheScreen()
    expect(screen.getByLabelText('Email').props.value).toBe(EMAIL)
    expect(screen.getByLabelText('Mật khẩu').props.value).toBe('')
  })

  test('xin mã bị từ chối (vừa xin, xin quá nhiều lần): câu của bước, vẫn ở bước 1', async () => {
    const reset = fakeReset({ requestCode: jest.fn(() => Promise.reject(new ApiError('RESET_REQUEST_REFUSED', { status: 400 }))) })
    await renderApp(<Gate reset={reset} />, { auth: fakeAuth(entered) })
    await fireEvent.press(await screen.findByRole('button', { name: 'Quên mật khẩu?' }))
    await fireEvent.changeText(await screen.findByLabelText('Email'), EMAIL)
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi mã' }))
    expect(await screen.findByText('Chưa gửi được mã: bạn vừa yêu cầu mã hoặc đã yêu cầu quá nhiều lần. Đợi vài phút rồi thử lại.')).toBeOnTheScreen()
    expect(screen.getByText('Bước 1 / 3')).toBeOnTheScreen()
  })

  test('phiên đặt lại hết hạn ở bước cuối: về bước 1 kèm lý do, email giữ nguyên', async () => {
    const reset = fakeReset({ resetPassword: jest.fn(() => Promise.reject(new ApiError('RESET_SESSION_EXPIRED', { status: 400 }))) })
    await renderApp(<Gate reset={reset} />, { auth: fakeAuth(entered) })
    await fireEvent.changeText(await screen.findByLabelText('Email'), EMAIL)
    await fireEvent.press(screen.getByRole('button', { name: 'Quên mật khẩu?' }))
    await reachPasswordStep()
    await setNewPassword('mat-khau-moi')
    expect(await screen.findByText('Phiên đặt lại mật khẩu đã hết hạn. Bắt đầu lại từ bước nhập email.')).toBeOnTheScreen()
    expect(screen.getByText('Bước 1 / 3')).toBeOnTheScreen()
    expect(screen.getByLabelText('Email').props.value).toBe(EMAIL)
  })

  test('vừa đặt lại mà máy chủ vẫn đòi mật khẩu mới: báo cho quản trị, không mời làm lại vòng đó', async () => {
    const auth = fakeAuth(() => Promise.reject(new ApiError('PASSWORD_CHANGE_REQUIRED', { status: 400 })))
    await renderApp(<Gate reset={fakeReset()} />, { auth })
    await typeCredentials(EMAIL, 'mat-khau-tam')
    await fireEvent.press(await screen.findByRole('button', { name: 'Đặt mật khẩu mới' }))
    await reachPasswordStep()
    await setNewPassword('mat-khau-moi')

    await fireEvent.changeText(await screen.findByLabelText('Mật khẩu'), 'mat-khau-moi')
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByText(/Máy chủ vẫn đòi đặt mật khẩu mới dù bạn vừa đặt xong/)).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Đặt mật khẩu mới' })).toBeNull()
    expect(auth.signIn).toHaveBeenLastCalledWith(EMAIL, 'mat-khau-moi')
  })

  test('"Về đăng nhập" ở bước 1: về form, giữ email đang nhập', async () => {
    await renderApp(<Gate reset={fakeReset()} />, { auth: fakeAuth(entered) })
    await fireEvent.press(await screen.findByRole('button', { name: 'Quên mật khẩu?' }))
    await fireEvent.changeText(await screen.findByLabelText('Email'), EMAIL)
    await fireEvent.press(screen.getByRole('button', { name: 'Về đăng nhập' }))
    expect(await screen.findByRole('button', { name: 'Đăng nhập' })).toBeOnTheScreen()
    expect(screen.getByLabelText('Email').props.value).toBe(EMAIL)
    expect(screen.queryByText(/Đã đặt mật khẩu mới/)).toBeNull()
  })
})
