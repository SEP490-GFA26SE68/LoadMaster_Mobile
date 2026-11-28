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
            rateVndPerKg: '4000',
            kgAmountVnd: '900300',
            commissionPercent: '15.00',
            totalSalaryVnd: '8900300',
            trips: [
              {
                tripId: 101,
                tripCode: 'TRIP-101',
                planKg: '3001.00',
                sharePercent: '100.00',
                allocatedKg: '1500.50',
                kgAmountVnd: '900300',
                totalAmountVnd: '900300',
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
    expect(statement.totalSalaryVnd).toBe(8_900_300)
    expect(statement.rateVndPerKg).toBe(4_000)
    expect(statement.commissionPercent).toBe(15)
    expect(statement.kpiTargetKg).toBeUndefined()
    expect(statement.kpiAchieved).toBeUndefined()
    expect(statement.trips).toEqual([
      {
        tripId: '101',
        tripCode: 'TRIP-101',
        metricBasis: 'plan',
        allocatedKg: 1500.5,
        kgAmountVnd: 900_300,
        totalAmountVnd: 900_300,
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
        kpiTargetKg: '500',
        kpiAchieved: true,
        rateVndPerKg: 500,
        kgAmountVnd: 250_000,
        kpiBonusVnd: 500_000,
        penaltyVnd: '50000',
        penaltyNote: 'Giao trễ',
        handlingAmountVnd: 150_000,
        commissionAmountVnd: 300_000,
        totalSalaryVnd: 8_200_000,
        trips: [
          {
            tripId: 202,
            tripCode: 'TRIP-202',
            actualKg: 500,
            sharePercent: 100,
            allocatedKg: 500,
            kgAmountVnd: 250_000,
            handlingAmountVnd: 150_000,
            commissionAmountVnd: 300_000,
            totalAmountVnd: 700_000,
          },
        ],
      },
      '2026-11',
    )

    expect(mapped.calculated).toBe(true)
    if (!mapped.calculated) throw new Error('expected calculated')
    expect(mapped.payModel).toBe('MIXED')
    expect(mapped.kpiTargetKg).toBe(500)
    expect(mapped.kpiAchieved).toBe(true)
    expect(mapped.kpiBonusVnd).toBe(500_000)
    expect(mapped.penaltyVnd).toBe(50_000)
    expect(mapped.penaltyNote).toBe('Giao trễ')
    expect(mapped.handlingAmountVnd).toBe(150_000)
    expect(mapped.commissionAmountVnd).toBe(300_000)
    expect(mapped.trips[0]?.metricBasis).toBe('actual')
    expect(mapped.trips[0]?.handlingAmountVnd).toBe(150_000)
    expect(mapped.trips[0]?.commissionAmountVnd).toBe(300_000)
  })
})
