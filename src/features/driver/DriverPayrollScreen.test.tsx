import { screen } from '@testing-library/react-native'

import { clearStored, renderApp } from '@/test/render'

import { DriverPayrollScreen } from './DriverPayrollScreen'
import { useDriverPayrollQuery } from './useDriverQueries'

jest.mock('./useDriverQueries', () => ({
  useDriverPayrollQuery: jest.fn(),
}))

const locked = {
  kind: 'calculated' as const,
  period: '2026-11',
  status: 'LOCKED' as const,
  baseSalaryVnd: 15_000_000,
  totalKg: 1_000,
  kgRateVndPerKg: 40_000,
  commissionPercent: 15,
  kgAmountVnd: 6_000_000,
  handlingFeeVndPerKg: 150,
  handlingDriverPercent: 85,
  handlingAmountVnd: 127_500,
  totalSalaryVnd: 21_127_500,
  trips: [
    {
      tripId: '42',
      tripCode: 'TRIP-0042',
      planKg: 1_000,
      sharePercent: 100,
      allocatedKg: 1_000,
      kgAmountVnd: 6_000_000,
      handlingAmountVnd: 127_500,
      totalAmountVnd: 6_127_500,
    },
  ],
}

function mockQuery(data: unknown) {
  jest.mocked(useDriverPayrollQuery).mockReturnValue({
    data,
    error: null,
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  } as never)
}

describe('màn bảng lương tài xế', () => {
  beforeEach(() => {
    clearStored()
  })

  test('after the month is finalized it shows base salary, commission and handling added up per trip', async () => {
    mockQuery(locked)
    await renderApp(<DriverPayrollScreen />)

    expect(await screen.findByRole('header', { name: 'Bảng lương' })).toBeOnTheScreen()
    expect(screen.getByText('Lương cứng')).toBeOnTheScreen()
    expect(screen.getAllByText('Hoa hồng theo kg').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tiền bốc dỡ').length).toBeGreaterThan(0)
    expect(screen.queryByText('Tiền theo km')).toBeNull()
    expect(screen.getByText('TRIP-0042')).toBeOnTheScreen()
    expect(screen.getByText('100%')).toBeOnTheScreen()
  })

  test('before the month is finalized it only shows the base salary and says the rest comes after finalizing', async () => {
    mockQuery({ kind: 'baseOnly' as const, period: '2026-11', status: 'DRAFT' as const, baseSalaryVnd: 15_000_000 })
    await renderApp(<DriverPayrollScreen />)

    expect(await screen.findByText('Lương cứng')).toBeOnTheScreen()
    expect(screen.getByText('Chưa chốt lương')).toBeOnTheScreen()
    expect(screen.getByText(/sau khi công ty chốt lương/)).toBeOnTheScreen()
    expect(screen.queryByText('Hoa hồng theo kg')).toBeNull()
    expect(screen.queryByText('Tiền bốc dỡ')).toBeNull()
  })
})
