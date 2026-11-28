import { fireEvent, screen } from '@testing-library/react-native'

import { getMockDb, resetMockDb } from '@/data/mock-db'
import { createMockAuth } from '@/features/auth/auth-mock'
import { driverTripDetailPath } from '@/features/driver/TripCard'
import { createFormatter } from '@/lib/format'
import { createTranslator } from '@/lib/i18n'
import { DEMO_ACCOUNTS, SEED_PASSWORD } from '@/lib/mock-db'
import { resetNativeMocks, router } from '@/test/native-mocks'
import { clearStored, renderApp } from '@/test/render'

import { PayrollScreen } from './PayrollScreen'
import type { CalculatedPayrollStatement } from './payroll-model'
import { currentPayrollPeriod } from './payroll-period'
import * as payrollQueries from './usePayrollQueries'

const driver = DEMO_ACCOUNTS.find((account) => account.role === 'driver')
const t = createTranslator('vi')
const format = createFormatter('vi-VN')

function makeCalculatedStatement(overrides: Partial<CalculatedPayrollStatement> = {}): CalculatedPayrollStatement {
  return {
    calculated: true,
    period: currentPayrollPeriod(),
    status: 'LOCKED',
    driverId: '42',
    driverName: 'Tài xế A',
    baseSalaryVnd: 8_000_000,
    totalKg: 6_250,
    rateVndPerKg: 4_000,
    commissionPercent: 15,
    kgAmountVnd: 3_750_000,
    totalSalaryVnd: 11_750_000,
    trips: [],
    ...overrides,
  }
}

function mockPayrollStatement(statement: CalculatedPayrollStatement) {
  jest.spyOn(payrollQueries, 'useMyPayroll').mockReturnValue({
    data: statement,
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof payrollQueries.useMyPayroll>)
}

describe('màn Phiếu lương', () => {
  beforeEach(() => {
    resetMockDb()
    clearStored()
    resetNativeMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('tháng hiện tại hiển thị trạng thái Bản nháp, cảnh báo tạm tính và các chuyến của tài xế', async () => {
    await getMockDb().authenticate(driver?.email ?? '', SEED_PASSWORD)

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })
    expect(await screen.findByRole('header', { name: 'Phiếu lương' })).toBeOnTheScreen()
    expect(await screen.findByText('Bản nháp')).toBeOnTheScreen()
    expect(screen.getByText(/số liệu có thể thay đổi/i)).toBeOnTheScreen()
    expect(screen.getByText('TRIP-2611-01')).toBeOnTheScreen()
  })

  test('mỗi chuyến chỉ một tài xế: không còn nhãn chia % hay khối lượng phân bổ', async () => {
    await getMockDb().authenticate(driver?.email ?? '', SEED_PASSWORD)

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })
    await screen.findByText('TRIP-2611-02')

    expect(screen.queryByText(/^Chia \d/)).toBeNull()
    expect(screen.queryByText(/phân bổ/i)).toBeNull()
    expect(screen.queryByText(/ \/ /)).toBeNull()
  })

  test('lùi sang tháng trước hiện Đã chốt, nút Xem thêm cho 6 chuyến, và nút quay về Tháng này', async () => {
    await getMockDb().authenticate(driver?.email ?? '', SEED_PASSWORD)

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })
    await screen.findByText('Bản nháp')

    await fireEvent.press(screen.getByRole('button', { name: 'Tháng trước' }))

    expect(await screen.findByText('Đã chốt')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Tháng này' })).toBeOnTheScreen()
    expect(screen.getByText('TRIP-2610-05')).toBeOnTheScreen()
    expect(screen.queryByText('TRIP-2610-06')).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Xem thêm 1 chuyến' }))
    expect(await screen.findByText('TRIP-2610-06')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: 'Thu gọn' }))
    expect(screen.queryByText('TRIP-2610-06')).toBeNull()
  })

  test('lùi qua tháng không có chuyến và tháng chưa tính lương hiển thị đúng trạng thái thân thiện', async () => {
    await getMockDb().authenticate(driver?.email ?? '', SEED_PASSWORD)

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })
    await screen.findByText('Bản nháp')

    // Tháng -1 (LOCKED có 6 chuyến) → Tháng -2 (LOCKED không có chuyến)
    await fireEvent.press(screen.getByRole('button', { name: 'Tháng trước' }))
    await screen.findByText('Đã chốt')
    await fireEvent.press(screen.getByRole('button', { name: 'Tháng trước' }))
    expect(await screen.findByText('Không có chuyến hàng hoàn tất trong kỳ này.')).toBeOnTheScreen()

    // Tháng -3 (chưa tính lương)
    await fireEvent.press(screen.getByRole('button', { name: 'Tháng trước' }))
    expect(await screen.findByText('Chưa tính')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Xem tháng trước' })).toBeOnTheScreen()
  })

  test('chạm vào một chuyến điều hướng sang màn chi tiết chuyến /driver-trip/{id}', async () => {
    await getMockDb().authenticate(driver?.email ?? '', SEED_PASSWORD)

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })
    const tripButton = await screen.findByRole('button', { name: 'Xem chi tiết chuyến TRIP-2611-01' })
    await fireEvent.press(tripButton)

    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith(driverTripDetailPath(expect.any(String)))
  })

  test('chưa đăng nhập ở kho mẫu hiện màn lỗi kèm nút Thử lại', async () => {
    await renderApp(<PayrollScreen />, { auth: createMockAuth() })
    expect(await screen.findByText('Phiên đăng nhập đã hết, hãy đăng nhập lại.')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen()
  })

  test('phiếu đã chốt đạt KPI hiện chỉ tiêu, khối lượng đã chở, kết quả và tiền thưởng', async () => {
    mockPayrollStatement(
      makeCalculatedStatement({
        kpiTargetKg: 5_000,
        kpiAchieved: true,
        kpiBonusVnd: 500_000,
      }),
    )

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })

    expect(await screen.findByText(t('payroll.breakdown.kpiMonth'))).toBeOnTheScreen()
    expect(
      screen.getByText(
        t('payroll.breakdown.kpiProgress', {
          targetKg: format.weight(5_000),
          totalKg: format.weight(6_250),
        }),
      ),
    ).toBeOnTheScreen()
    expect(screen.getByText(t('payroll.breakdown.kpiAchieved'))).toBeOnTheScreen()
    expect(screen.getByText(t('payroll.breakdown.kpiBonus'))).toBeOnTheScreen()
    expect(screen.getByText(format.currency(500_000))).toBeOnTheScreen()
  })

  test('phiếu chưa đạt KPI hiện kết quả trung tính và không hiện dòng thưởng', async () => {
    mockPayrollStatement(
      makeCalculatedStatement({
        totalKg: 3_750,
        kpiTargetKg: 5_000,
        kpiAchieved: false,
        kpiBonusVnd: 0,
      }),
    )

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })

    expect(await screen.findByText(t('payroll.breakdown.kpiNotAchieved'))).toBeOnTheScreen()
    expect(screen.queryByText(t('payroll.breakdown.kpiBonus'))).toBeNull()
  })

  test('đã bỏ tính lương theo km: phiếu không còn hiện quãng đường hay số km ở đâu', async () => {
    mockPayrollStatement(
      makeCalculatedStatement({
        trips: [
          {
            tripId: '7',
            tripCode: 'TRIP-KG-01',
            metricBasis: 'plan',
            allocatedKg: 372.5,
            kgAmountVnd: 27_937,
            totalAmountVnd: 27_937,
          },
        ],
      }),
    )

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })

    expect(await screen.findByText('TRIP-KG-01')).toBeOnTheScreen()
    expect(screen.getByText(t('payroll.breakdown.kgAmount'))).toBeOnTheScreen()
    expect(screen.queryByText(/quãng đường/i)).toBeNull()
    expect(screen.queryByText(/\bkm\b/)).toBeNull()
  })

  test('phiếu đã chốt có tiền phạt hiện dòng trừ kèm lý do quản lý ghi', async () => {
    mockPayrollStatement(
      makeCalculatedStatement({ penaltyVnd: 50_000, penaltyNote: 'Giao trễ chuyến TRIP-KG-01', totalSalaryVnd: 11_700_000 }),
    )

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })

    expect(await screen.findByText('Tiền phạt')).toBeOnTheScreen()
    expect(screen.getByText(`−${format.currency(50_000)}`)).toBeOnTheScreen()
    expect(screen.getByText('Giao trễ chuyến TRIP-KG-01')).toBeOnTheScreen()
  })

  test('phiếu không có tiền phạt thì không có dòng phạt', async () => {
    mockPayrollStatement(makeCalculatedStatement({ penaltyVnd: 0 }))

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })

    expect(await screen.findByText(t('payroll.breakdown.title'))).toBeOnTheScreen()
    expect(screen.queryByText('Tiền phạt')).toBeNull()
  })

  test('công thức tiền theo khối lượng ghi đủ kg × cước × % hoa hồng', async () => {
    mockPayrollStatement(makeCalculatedStatement())

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })

    // 6.250 kg × 4.000 đ/kg × 15% = 3.750.000 đ — đúng số tiền của dòng.
    expect(
      await screen.findByText(`${format.weight(6_250)} × ${format.currency(4_000)}/kg × 15%`),
    ).toBeOnTheScreen()
    expect(screen.getByText(format.currency(3_750_000))).toBeOnTheScreen()
  })

  test('phiếu thiếu % hoa hồng thì không hiện công thức, tránh ghi sai', async () => {
    mockPayrollStatement(makeCalculatedStatement({ commissionPercent: undefined }))

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })

    expect(await screen.findByText(t('payroll.breakdown.kgAmount'))).toBeOnTheScreen()
    expect(screen.queryByText(/\/kg/)).toBeNull()
  })

  test('phiếu không có chỉ tiêu KPI không hiện nội dung nào về KPI', async () => {
    mockPayrollStatement(makeCalculatedStatement())

    await renderApp(<PayrollScreen />, { auth: createMockAuth() })

    expect(await screen.findByText(t('payroll.breakdown.title'))).toBeOnTheScreen()
    expect(screen.queryByText(t('payroll.breakdown.kpiMonth'))).toBeNull()
    expect(
      screen.queryByText(
        t('payroll.breakdown.kpiProgress', {
          targetKg: format.weight(5_000),
          totalKg: format.weight(6_250),
        }),
      ),
    ).toBeNull()
    expect(screen.queryByText(t('payroll.breakdown.kpiAchieved'))).toBeNull()
    expect(screen.queryByText(t('payroll.breakdown.kpiNotAchieved'))).toBeNull()
    expect(screen.queryByText(t('payroll.breakdown.kpiBonus'))).toBeNull()
  })
})
