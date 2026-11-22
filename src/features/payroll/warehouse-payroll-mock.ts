import { getMockDb } from '@/data/mock-db'
import { MockDbError } from '@/lib/mock-db'

import { currentPayrollPeriod, shiftPayrollPeriod, type PayrollPeriodKey } from './payroll-period'
import type { WarehousePayrollStatement, WarehousePayrollTripLine } from './warehouse-payroll-model'

const BASE_SALARY_VND = 7_000_000
const RATE_VND_PER_KG = 50
const KPI_TARGET_KG = 20_000
const KPI_BONUS_VND = 500_000

type LineSeed = { readonly code: string; readonly day: number; readonly packages: number; readonly kg: number }

const LOCKED_SEEDS: readonly LineSeed[] = [
  { code: 'TRIP-2610-11', day: 2, packages: 64, kg: 3_420 },
  { code: 'TRIP-2610-12', day: 5, packages: 120, kg: 5_180.5 },
  { code: 'TRIP-2610-13', day: 9, packages: 48, kg: 2_260 },
  { code: 'TRIP-2610-14', day: 14, packages: 90, kg: 4_105 },
  { code: 'TRIP-2610-15', day: 21, packages: 132, kg: 6_340 },
  { code: 'TRIP-2610-16', day: 27, packages: 36, kg: 1_490 },
]

function lines(period: PayrollPeriodKey, seeds: readonly LineSeed[]): WarehousePayrollTripLine[] {
  return seeds.map((seed) => ({
    tripId: seed.code,
    tripCode: seed.code,
    loadedDate: `${period}-${String(seed.day).padStart(2, '0')}`,
    loadedPackages: seed.packages,
    loadedKg: seed.kg,
  }))
}

/**
 * Kho mẫu của phiếu lương kho, theo đúng luật của máy chủ (kỳ chưa chốt chỉ cho xem lương cứng):
 * - Tháng này: kỳ Bản nháp, chưa có phiếu — chỉ có lương cứng
 * - Tháng trước: Đã chốt, 6 chuyến, đạt chỉ tiêu
 * - 2 tháng trước: Đã chốt, không chuyến nào (chỉ lương cứng)
 * - Tháng khác: chưa có kỳ lương nào — vẫn có lương cứng của đơn giá
 */
export async function mockWarehousePayroll(period: PayrollPeriodKey): Promise<WarehousePayrollStatement> {
  const viewer = getMockDb().sessionUser()
  if (!viewer) throw new MockDbError('NOT_SIGNED_IN', {})
  const current = currentPayrollPeriod()
  const locked = (trips: readonly WarehousePayrollTripLine[]): WarehousePayrollStatement => {
    const loadedKg = Math.round(trips.reduce((sum, line) => sum + line.loadedKg, 0) * 100) / 100
    const loadedAmountVnd = Math.round(loadedKg * RATE_VND_PER_KG)
    const kpiAchieved = loadedKg >= KPI_TARGET_KG
    const kpiBonusVnd = kpiAchieved ? KPI_BONUS_VND : 0
    return {
      calculated: true,
      period,
      status: 'LOCKED',
      workerId: viewer.id,
      workerName: viewer.fullName,
      baseSalaryVnd: BASE_SALARY_VND,
      loadedPackages: trips.reduce((sum, line) => sum + line.loadedPackages, 0),
      loadedKg,
      rateVndPerKg: RATE_VND_PER_KG,
      loadedAmountVnd,
      kpiTargetKg: KPI_TARGET_KG,
      kpiAchieved,
      kpiBonusVnd,
      totalSalaryVnd: BASE_SALARY_VND + loadedAmountVnd + kpiBonusVnd,
      trips,
    }
  }
  if (period === shiftPayrollPeriod(current, -1)) return locked(lines(period, LOCKED_SEEDS))
  if (period === shiftPayrollPeriod(current, -2)) return locked([])
  return {
    calculated: false,
    period,
    status: period === current ? 'DRAFT' : null,
    workerId: viewer.id,
    workerName: viewer.fullName,
    baseSalaryVnd: BASE_SALARY_VND,
  }
}
