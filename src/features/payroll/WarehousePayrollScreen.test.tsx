import { fireEvent, screen } from '@testing-library/react-native'

import { ApiError } from '@/data/http'
import { getMockDb, resetMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored, renderApp } from '@/test/render'

import * as payrollQueries from './usePayrollQueries'
import { WarehousePayrollScreen } from './WarehousePayrollScreen'

const worker = DEMO_ACCOUNTS.find((account) => account.role === 'warehouse')

async function open() {
  await getMockDb().authenticate(worker?.email ?? '', SEED_PASSWORD)
  await renderApp(<WarehousePayrollScreen />, { auth: createMockAuth() })
  expect(await screen.findByRole('header', { name: 'Phiếu lương' })).toBeOnTheScreen()
}

describe('màn Phiếu lương của nhân viên kho', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('tháng này chưa chốt: thẻ Chưa tính nói khi nào có phiếu và hiện lương cứng của tháng, không có số kg', async () => {
    await open()
    expect(await screen.findByText('Chưa tính')).toBeOnTheScreen()
    expect(screen.getByText(/hiện khi quản lý chốt kỳ/)).toBeOnTheScreen()
    expect(screen.getByText(/^Lương cứng tháng: 7\.000\.000/)).toBeOnTheScreen()
    expect(screen.queryByText('Chi tiết thu nhập')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tháng này' })).toBeNull()
  })

  test('tháng trước đã chốt: tổng lương, tiền theo khối lượng xếp, KPI đạt, 5 chuyến đầu rồi Xem thêm; chuyến không mở được', async () => {
    await open()
    await screen.findByText('Chưa tính')
    await fireEvent.press(screen.getByRole('button', { name: 'Xem tháng trước' }))

    expect(await screen.findByText('Đã chốt')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Tháng này' })).toBeOnTheScreen()
    expect(screen.getByText('Tiền theo khối lượng xếp')).toBeOnTheScreen()
    expect(screen.getByText('Đạt chỉ tiêu')).toBeOnTheScreen()
    expect(screen.getByText('Thưởng KPI')).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: 'Chi tiết theo chuyến (6)' })).toBeOnTheScreen()
    expect(screen.getByText('TRIP-2610-15')).toBeOnTheScreen()
    expect(screen.getByText('132 kiện')).toBeOnTheScreen()
    expect(screen.queryByText('TRIP-2610-16')).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Xem thêm 1 chuyến' }))
    expect(await screen.findByText('TRIP-2610-16')).toBeOnTheScreen()
    await fireEvent.press(screen.getByText('TRIP-2610-16'))
    expect(router.push).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByRole('button', { name: 'Tháng này' }))
    expect(await screen.findByText('Chưa tính')).toBeOnTheScreen()
  })

  test('kỳ đã chốt không có chuyến và kỳ chưa có lương hiện đúng câu của nhân viên kho', async () => {
    await open()
    await screen.findByText('Chưa tính')
    await fireEvent.press(screen.getByRole('button', { name: 'Tháng trước' }))
    await screen.findByText('Đã chốt')
    await fireEvent.press(screen.getByRole('button', { name: 'Tháng trước' }))
    expect(await screen.findByText('Không có chuyến nào bạn xếp trong kỳ này.')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Tháng trước' }))
    expect(await screen.findByText('Quản lý chưa tính lương kho cho kỳ này.')).toBeOnTheScreen()
  })

  test('máy chủ lỗi: câu lỗi theo mã kèm nút Thử lại', async () => {
    const refetch = jest.fn()
    jest.spyOn(payrollQueries, 'useMyWarehousePayroll').mockReturnValue({
      data: undefined,
      error: new ApiError('PAYROLL_INVALID_PERIOD', { status: 400 }),
      isPending: false,
      isError: true,
      isRefetching: false,
      refetch,
    } as unknown as ReturnType<typeof payrollQueries.useMyWarehousePayroll>)
    await open()
    expect(screen.getByText('Kỳ lương không hợp lệ. Chọn lại tháng cần xem.')).toBeOnTheScreen()
    const retry = screen.getByRole('button', { name: 'Thử lại' })
    await fireEvent.press(retry)
    expect(refetch).toHaveBeenCalled()
  })
})
