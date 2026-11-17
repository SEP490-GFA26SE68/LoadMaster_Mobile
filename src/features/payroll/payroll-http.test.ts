import { createApiClient } from '@/data/http/api-client'

import { httpPayrollApi, mapPayrollStatement } from './payroll-http'

function mockClient(payload: unknown, onRequest?: (url: string) => void) {
  return createApiClient({
    baseUrl: 'http://api.test',
    accessToken: async () => 'token-driver',
    fetch: (async (input: RequestInfo | URL) => {
      onRequest?.(String(input))
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, code: null, message: 'OK', data: payload }),
      } as Response
    }) as unknown as typeof fetch,
  })
}

describe('httpPayrollApi', () => {
  test('gọi đúng endpoint GET /api/driver/payroll?period=YYYY-MM và map đầy đủ số liệu BigDecimal', async () => {
    const requested: string[] = []
    const api = httpPayrollApi({
      client: () =>
        mockClient(
          {
            period: '2026-11',
            calculated: true,
            status: 'LOCKED',
            driverId: 42,
            driverName: 'Nguyễn Văn Tài',
            baseSalaryVnd: '8000000.00',
            totalKg: '1500.50',
            rateVndPerKg: '600',
            kgAmountVnd: '900300',
            totalKm: '85.25',
            rateVndPerKm: '4500',
            kmAmountVnd: '383625',
            totalSalaryVnd: '9283925',
            trips: [
              {
                tripId: 101,
                tripCode: 'TRIP-101',
                planKg: '3001.00',
                planKm: '170.50',
                sharePercent: '50.00',
                allocatedKg: '1500.50',
                allocatedKm: '85.25',
                kgAmountVnd: '900300',
                kmAmountVnd: '383625',
                totalAmountVnd: '1283925',
              },
            ],
          },
          (url) => requested.push(url),
        ),
    })

    const statement = await api.fetchMyPayroll('2026-11')
    expect(requested).toEqual(['http://api.test/api/driver/payroll?period=2026-11'])
    expect(statement.calculated).toBe(true)
    if (!statement.calculated) throw new Error('expected calculated')
    expect(statement.status).toBe('LOCKED')
    expect(statement.driverId).toBe('42')
    expect(statement.baseSalaryVnd).toBe(8_000_000)
    expect(statement.totalSalaryVnd).toBe(9_283_925)
    expect(statement.trips).toEqual([
      {
        tripId: '101',
        tripCode: 'TRIP-101',
        metricBasis: 'plan',
        baseKg: 3001,
        baseKm: 170.5,
        sharePercent: 50,
        allocatedKg: 1500.5,
        allocatedKm: 85.25,
        kgAmountVnd: 900_300,
        kmAmountVnd: 383_625,
        totalAmountVnd: 1_283_925,
      },
    ])
  })

  test('map an toàn khi kỳ chưa được tính (calculated: false, các trường số null)', async () => {
    const api = httpPayrollApi({
      client: () =>
        mockClient({
          period: '2026-08',
          calculated: false,
          status: null,
          driverId: 42,
          driverName: 'Nguyễn Văn Tài',
          baseSalaryVnd: null,
          totalKg: null,
          rateVndPerKg: null,
          kgAmountVnd: null,
          totalKm: null,
          rateVndPerKm: null,
          kmAmountVnd: null,
          totalSalaryVnd: null,
          trips: [],
        }),
    })

    const statement = await api.fetchMyPayroll('2026-08')
    expect(statement).toEqual({
      calculated: false,
      period: '2026-08',
      status: null,
      driverId: '42',
      driverName: 'Nguyễn Văn Tài',
    })
  })

  test('tương thích sẵn với các trường mở rộng Feat 1–3 (actualKg, kpiBonusVnd, handlingAmountVnd, commissionAmountVnd)', () => {
    const mapped = mapPayrollStatement(
      {
        period: '2026-11',
        calculated: true,
        status: 'DRAFT',
        driverId: 42,
        driverName: 'Tài xế A',
        payModel: 'MIXED',
        baseSalaryVnd: 7_000_000,
        totalKg: 500,
        rateVndPerKg: 500,
        kgAmountVnd: 250_000,
        totalKm: 100,
        rateVndPerKm: 4_000,
        kmAmountVnd: 400_000,
        kpiBonusVnd: 500_000,
        handlingAmountVnd: 150_000,
        commissionAmountVnd: 300_000,
        totalSalaryVnd: 8_600_000,
        trips: [
          {
            tripId: 202,
            tripCode: 'TRIP-202',
            actualKg: 500,
            actualKm: 100,
            sharePercent: 100,
            allocatedKg: 500,
            allocatedKm: 100,
            kgAmountVnd: 250_000,
            kmAmountVnd: 400_000,
            handlingAmountVnd: 150_000,
            commissionAmountVnd: 300_000,
            totalAmountVnd: 1_100_000,
          },
        ],
      },
      '2026-11',
    )

    expect(mapped.calculated).toBe(true)
    if (!mapped.calculated) throw new Error('expected calculated')
    expect(mapped.payModel).toBe('MIXED')
    expect(mapped.kpiBonusVnd).toBe(500_000)
    expect(mapped.handlingAmountVnd).toBe(150_000)
    expect(mapped.commissionAmountVnd).toBe(300_000)
    expect(mapped.trips[0]?.metricBasis).toBe('actual')
    expect(mapped.trips[0]?.handlingAmountVnd).toBe(150_000)
    expect(mapped.trips[0]?.commissionAmountVnd).toBe(300_000)
  })
})
