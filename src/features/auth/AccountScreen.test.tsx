import { fireEvent, screen } from '@testing-library/react-native'

import { resetMockDb } from '@/data/mock-db'
import { clearStored, renderApp, signInAs } from '@/test/render'

import { AccountScreen } from './AccountScreen'
import type { PasswordResetApi } from './password-reset-api'

function fakeReset(supported = true) {
  return {
    supported,
    requestCode: jest.fn(async (_email: string) => undefined),
    verifyCode: jest.fn(async (_email: string, _otp: string) => 'RST-1'),
    resetPassword: jest.fn(async (_token: string, _password: string) => undefined),
  } satisfies PasswordResetApi
}

beforeEach(() => {
  resetMockDb()
  clearStored()
})

describe('Tài khoản: đổi mật khẩu', () => {
  test('dùng ba bước Đặt lại mật khẩu, email đăng nhập điền sẵn; xong thì về tài khoản, vẫn đăng nhập', async () => {
    const user = await signInAs('taixe@loadmaster.vn')
    const reset = fakeReset()
    await renderApp(<AccountScreen passwordReset={reset} />)
    await fireEvent.press(await screen.findByRole('button', { name: 'Đổi mật khẩu' }))

    expect(screen.getByLabelText('Email')).toHaveDisplayValue(user.email)
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi mã' }))
    expect(reset.requestCode).toHaveBeenCalledWith(user.email)
    await fireEvent.changeText(await screen.findByLabelText('Mã xác nhận'), '123456')
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mã' }))
    await fireEvent.changeText(await screen.findByLabelText('Mật khẩu mới'), 'MatKhauMoi1')
    await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'), 'MatKhauMoi1')
    await fireEvent.press(screen.getByRole('button', { name: 'Đặt mật khẩu' }))

    expect(await screen.findByText('Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới.')).toBeOnTheScreen()
    expect(reset.resetPassword).toHaveBeenCalledWith('RST-1', 'MatKhauMoi1')
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeOnTheScreen()
  })

  test('thoát giữa chừng: nút "Về tài khoản" thay "Về đăng nhập"', async () => {
    await signInAs('taixe@loadmaster.vn')
    await renderApp(<AccountScreen passwordReset={fakeReset()} />)
    await fireEvent.press(await screen.findByRole('button', { name: 'Đổi mật khẩu' }))
    expect(screen.queryByRole('button', { name: 'Về đăng nhập' })).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Về tài khoản' }))
    expect(await screen.findByRole('button', { name: 'Đổi mật khẩu' })).toBeOnTheScreen()
  })

  test('nguồn đăng nhập không gửi được mã (kho mẫu): không có nút', async () => {
    await signInAs('taixe@loadmaster.vn')
    await renderApp(<AccountScreen passwordReset={fakeReset(false)} />)
    expect(await screen.findByRole('button', { name: 'Đăng xuất' })).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: 'Đổi mật khẩu' })).toBeNull()
  })
})
