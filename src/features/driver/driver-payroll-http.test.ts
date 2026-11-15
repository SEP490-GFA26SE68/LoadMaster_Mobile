import { backend, failure, ok } from '@/test/driver-backend'

const statement = {
  calculated: true,
  period: '2026-11',
  status: 'DRAFT',
  baseSalaryVnd: 8_000_000,
  totalKg: 1_000,
  rateVndPerKg: 100,
  kgAmountVnd: 100_000,
  totalKm: 120,
  rateVndPerKm: 2_000,
  kmAmountVnd: 240_000,
  totalSalaryVnd: 8_340_000,
  trips: [
    {
      tripId: 42,
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

describe('httpDriverApi payroll', () => {
  test('loads the signed-in driver statement for the requested month and maps the trip breakdown', async () => {
    const { driver, calls } = backend({ 'GET /api/driver/payroll': () => ok(statement) })

    await expect(driver.fetchPayroll('2026-11')).resolves.toEqual({
      kind: 'calculated',
      period: '2026-11',
      status: 'DRAFT',
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

  test('represents a month without a calculated payroll without inventing amounts', async () => {
    const { driver } = backend({
      'GET /api/driver/payroll': () =>
        ok({ calculated: false, period: '2026-11', status: null, trips: [] }),
    })

    await expect(driver.fetchPayroll('2026-11')).resolves.toEqual({ kind: 'notCalculated', period: '2026-11' })
  })
})
