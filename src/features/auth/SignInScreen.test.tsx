import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'

import { resetMockDb } from '@/data/mock-db'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'
import { clearStored, renderApp } from '@/test/render'

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
