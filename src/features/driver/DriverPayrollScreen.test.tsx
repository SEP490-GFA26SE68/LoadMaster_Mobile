import { screen } from '@testing-library/react-native'

import { clearStored, renderApp } from '@/test/render'

import { DriverPayrollScreen } from './DriverPayrollScreen'
import { useDriverPayrollQuery } from './useDriverQueries'

jest.mock('./useDriverQueries', () => ({
  useDriverPayrollQuery: jest.fn(),
}))

const statement = {
  kind: 'calculated' as const,
  period: '2026-11',
  status: 'DRAFT' as const,
  baseSalaryVnd: 8_000_000,
  totalKg: 1_000,
  kgRateVndPerKg: 100,
  kgAmountVnd: 100_000,
  totalKm: 120,
  kmRateVndPerKm: 2_000,
  kmAmountVnd: 240_000,
  totalSalaryVnd: 8_340_000,
  trips: [
    {
      tripId: '42',
      tripCode: 'TRIP-0042',
      planKg: 1_000,
      planKm: 120,
      sharePercent: 100,
      allocatedKg: 1_000,
      allocatedKm: 120,
      kgAmountVnd: 100_000,
      kmAmountVnd: 240_000,
      totalAmountVnd: 340_000,
    },
  ],
}

describe('màn bảng lương tài xế', () => {
  beforeEach(() => {
    clearStored()
    jest.mocked(useDriverPayrollQuery).mockReturnValue({
      data: statement,
      error: null,
      isPending: false,
      isError: false,
      isRefetching: false,
      refetch: jest.fn(),
    } as never)
  })

  test('shows the monthly total and the inputs for each trip', async () => {
    await renderApp(<DriverPayrollScreen />)

    expect(await screen.findByRole('header', { name: 'Bảng lương' })).toBeOnTheScreen()
    expect(screen.getByText('Lương cứng')).toBeOnTheScreen()
    expect(screen.getAllByText('Tiền theo kg').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tiền theo km').length).toBeGreaterThan(0)
    expect(screen.getByText('TRIP-0042')).toBeOnTheScreen()
    expect(screen.getByText('100%')).toBeOnTheScreen()
  })
})
