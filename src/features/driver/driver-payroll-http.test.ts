import { backend, failure, ok } from '@/test/driver-backend'

const statement = {
  calculated: true,
  period: '2026-11',
  status: 'LOCKED',
  baseSalaryVnd: 15_000_000,
  totalKg: 1_000,
  rateVndPerKg: 40_000,
  kgAmountVnd: 6_000_000,
  commissionPercent: 15,
  handlingFeeVndPerKg: 150,
  handlingDriverPercent: 85,
  handlingAmountVnd: 127_500,
  totalSalaryVnd: 21_127_500,
  trips: [
    {
      tripId: 42,
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

describe('httpDriverApi payroll', () => {
  test('loads the signed-in driver statement for the requested month and maps the trip breakdown', async () => {
    const { driver, calls } = backend({ 'GET /api/driver/payroll': () => ok(statement) })

    await expect(driver.fetchPayroll('2026-11')).resolves.toEqual({
      kind: 'calculated',
      period: '2026-11',
      status: 'LOCKED',
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
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/driver/payroll', query: { period: '2026-11' } })
    expect(driver.capabilities.payroll).toBe(true)
  })

  test('does not fetch all drivers payroll when there is no signed-in driver', async () => {
    const { driver, calls } = backend({}, { id: null })

    await expect(failure(() => driver.fetchPayroll('2026-11'))).resolves.toMatchObject({ code: 'UNAUTHENTICATED' })
    expect(calls).toHaveLength(0)
  })

  test('before the month is finalized the driver only gets the base salary', async () => {
    const { driver } = backend({
      'GET /api/driver/payroll': () =>
        ok({ calculated: false, period: '2026-11', status: 'DRAFT', baseSalaryVnd: 15_000_000, trips: [] }),
    })

    await expect(driver.fetchPayroll('2026-11')).resolves.toEqual({
      kind: 'baseOnly',
      period: '2026-11',
      status: 'DRAFT',
      baseSalaryVnd: 15_000_000,
    })
  })

  test('represents a month without a pay rate without inventing amounts', async () => {
    const { driver } = backend({
      'GET /api/driver/payroll': () =>
        ok({ calculated: false, period: '2026-11', status: null, trips: [] }),
    })

    await expect(driver.fetchPayroll('2026-11')).resolves.toEqual({ kind: 'notCalculated', period: '2026-11' })
  })
})
