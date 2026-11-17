import { fireEvent, screen } from '@testing-library/react-native'

import { resetMockDb } from '@/data/mock-db'
import { SEED_PASSWORD } from '@/lib/mock-db'
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

describe('Tài khoản: thông tin cá nhân và thông tin công ty', () => {
  test('hiển thị đầy đủ thông tin cá nhân và thông tin công ty (chỉ xem)', async () => {
    await signInAs('taixe@loadmaster.vn')
    await renderApp(<AccountScreen />)

    // Thông tin cá nhân (hiển thị ở cả phần identity hero và personal info card)
    expect(await screen.findByText('Thông tin cá nhân')).toBeOnTheScreen()
    expect(screen.getAllByText('Phạm Quốc Dũng').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('taixe@loadmaster.vn')).toBeOnTheScreen()
    expect(screen.getByText('0904 567 890')).toBeOnTheScreen()

    // Thông tin công ty
    expect(screen.getByText('Thông tin công ty')).toBeOnTheScreen()
    expect(screen.getByText('Công ty TNHH Vận tải Long Bình')).toBeOnTheScreen()
    expect(screen.getByText('LOG-001')).toBeOnTheScreen()
    expect(screen.getByText('3600123456')).toBeOnTheScreen()
    expect(screen.getByText('ketoan@longbinh.vn')).toBeOnTheScreen()
    expect(screen.getAllByText('Chỉ xem').length).toBeGreaterThan(0)
  })

  test('chỉnh sửa họ tên và số điện thoại thành công', async () => {
    await signInAs('taixe@loadmaster.vn')
    await renderApp(<AccountScreen />)

    // Mở form chỉnh sửa
    await fireEvent.press(await screen.findByRole('button', { name: 'Chỉnh sửa' }))

    // Nhập họ tên mới và số điện thoại mới
    await fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Phạm Quốc Dũng Mới')
    await fireEvent.changeText(screen.getByLabelText('Số điện thoại'), '0988 888 999')

    // Bấm lưu
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    // Kiểm tra kết quả
    expect(await screen.findByText('Đã cập nhật thông tin cá nhân.')).toBeOnTheScreen()
    expect(screen.getAllByText('Phạm Quốc Dũng Mới').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('0988 888 999')).toBeOnTheScreen()
  })

  test('đổi mật khẩu trực tiếp thành công', async () => {
    await signInAs('taixe@loadmaster.vn')
    await renderApp(<AccountScreen />)

    // Ban đầu mật khẩu ẩn dưới dạng dấu chấm, chỉ hiện form khi bấm "Thay đổi mật khẩu"
    expect(await screen.findByText('••••••••')).toBeOnTheScreen()
    await fireEvent.press(await screen.findByRole('button', { name: 'Thay đổi mật khẩu' }))

    // Điền mật khẩu hiện tại và mật khẩu mới
    await fireEvent.changeText(await screen.findByLabelText('Mật khẩu hiện tại'), SEED_PASSWORD)
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'MatKhauMoi123')
    await fireEvent.changeText(screen.getByLabelText('Xác nhận mật khẩu mới'), 'MatKhauMoi123')

    // Bấm cập nhật mật khẩu
    await fireEvent.press(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }))

    // Kiểm tra kết quả
    expect(await screen.findByText('Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới.')).toBeOnTheScreen()
    expect(screen.getByText('••••••••')).toBeOnTheScreen()
  })
})
