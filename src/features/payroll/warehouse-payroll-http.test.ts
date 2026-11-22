import { fail, fakeDriverBackend, ok, type Routes } from '@/test/driver-backend'

import { httpPayrollApi } from './payroll-http'

const PATH = '/api/warehouse/payroll'

function payroll(routes: Routes) {
  const { calls, client } = fakeDriverBackend(routes)
  return { calls, api: httpPayrollApi({ client: () => client }) }
}

describe('httpPayrollApi.fetchMyWarehousePayroll', () => {
  test('gọi GET /api/warehouse/payroll?period=YYYY-MM; kỳ đã chốt đổi BigDecimal (số hoặc chuỗi) và dòng chuyến sang kiểu của app', async () => {
    const { api, calls } = payroll({
      [`GET ${PATH}`]: () =>
        ok({
          calculated: true,
          period: '2026-10',
          status: 'LOCKED',
          workerId: 15,
          workerName: 'Lê Văn Kho',
          baseSalaryVnd: '7000000.00',
          loadedPackages: 184,
          loadedKg: '8600.50',
          rateVndPerKg: 50,
          loadedAmountVnd: '430025',
          kpiTargetKg: '8000',
          kpiAchieved: true,
          kpiBonusVnd: 500000,
          totalSalaryVnd: '7930025',
          trips: [
            { tripId: 51, tripCode: 'TRIP-0051', loadedDate: '2026-10-03', loadedPackages: 64, loadedKg: '3420.00' },
            { tripId: 52, tripCode: null, loadedDate: 'không phải ngày', loadedPackages: 120, loadedKg: 5180.5 },
          ],
        }),
    })
    const statement = await api.fetchMyWarehousePayroll('2026-10')
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ method: 'GET', path: PATH, query: { period: '2026-10' } })
    expect(statement).toEqual({
      calculated: true,
      period: '2026-10',
      status: 'LOCKED',
      workerId: '15',
      workerName: 'Lê Văn Kho',
      baseSalaryVnd: 7_000_000,
      loadedPackages: 184,
      loadedKg: 8_600.5,
      rateVndPerKg: 50,
      loadedAmountVnd: 430_025,
      kpiTargetKg: 8_000,
      kpiAchieved: true,
      kpiBonusVnd: 500_000,
      totalSalaryVnd: 7_930_025,
      trips: [
        { tripId: '51', tripCode: 'TRIP-0051', loadedDate: '2026-10-03', loadedPackages: 64, loadedKg: 3_420 },
        { tripId: '52', tripCode: '52', loadedDate: null, loadedPackages: 120, loadedKg: 5_180.5 },
      ],
    })
  })

  test('kỳ chưa chốt: máy chủ chỉ trả lương cứng (trường khác vắng vì NON_NULL)', async () => {
    const { api } = payroll({
      [`GET ${PATH}`]: () => ok({ calculated: false, period: '2026-11', status: 'DRAFT', workerId: 15, workerName: 'Lê Văn Kho', baseSalaryVnd: '7000000', trips: [] }),
    })
    expect(await api.fetchMyWarehousePayroll('2026-11')).toEqual({
      calculated: false,
      period: '2026-11',
      status: 'DRAFT',
      workerId: '15',
      workerName: 'Lê Văn Kho',
      baseSalaryVnd: 7_000_000,
    })
  })

  test('chưa có kỳ lương và chưa có đơn giá: không trạng thái, không lương cứng; kỳ máy chủ trả sai dạng thì giữ kỳ đã hỏi', async () => {
    const { api } = payroll({ [`GET ${PATH}`]: () => ok({ calculated: false, period: '11/2026', workerId: 15, workerName: 'Lê Văn Kho' }) })
    expect(await api.fetchMyWarehousePayroll('2026-11')).toEqual({
      calculated: false,
      period: '2026-11',
      status: null,
      workerId: '15',
      workerName: 'Lê Văn Kho',
      baseSalaryVnd: null,
    })
  })

  test('kỳ sai dạng bị máy chủ từ chối: lỗi giữ mã của máy chủ', async () => {
    const { api } = payroll({ [`GET ${PATH}`]: () => fail(400, 'PAYROLL_INVALID_PERIOD') })
    await expect(api.fetchMyWarehousePayroll('2026-11')).rejects.toMatchObject({ code: 'PAYROLL_INVALID_PERIOD', status: 400 })
  })
})
