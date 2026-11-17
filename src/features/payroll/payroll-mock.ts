import { getMockDb } from '@/data/mock-db'
import { isVisibleTo } from '@/features/driver/my-trips'
import { MockDbError } from '@/lib/mock-db'

import type { PayrollApi } from './payroll-api'
import type { PayrollStatement, PayrollTripLine } from './payroll-model'
import { currentPayrollPeriod, shiftPayrollPeriod, type PayrollPeriodKey } from './payroll-period'

const BASE_SALARY_VND = 8_000_000
const RATE_VND_PER_KG = 600
const RATE_VND_PER_KM = 4_500

type TripSeed = {
  readonly code: string
  readonly baseKg: number
  readonly baseKm: number
  readonly sharePercent: number
}

const DRAFT_SEEDS: readonly TripSeed[] = [
  { code: 'TRIP-2611-01', baseKg: 1250, baseKm: 48.5, sharePercent: 100 },
  { code: 'TRIP-2611-02', baseKg: 1840, baseKm: 92, sharePercent: 50 },
  { code: 'TRIP-2611-03', baseKg: 980, baseKm: 36.2, sharePercent: 100 },
]

const LOCKED_SEEDS: readonly TripSeed[] = [
  { code: 'TRIP-2610-01', baseKg: 1420, baseKm: 54, sharePercent: 100 },
  { code: 'TRIP-2610-02', baseKg: 1100, baseKm: 41.5, sharePercent: 100 },
  { code: 'TRIP-2610-03', baseKg: 2100, baseKm: 118, sharePercent: 50 },
  { code: 'TRIP-2610-04', baseKg: 890, baseKm: 33.4, sharePercent: 100 },
  { code: 'TRIP-2610-05', baseKg: 1650, baseKm: 74.2, sharePercent: 100 },
  { code: 'TRIP-2610-06', baseKg: 1320, baseKm: 62.8, sharePercent: 100 },
]

function buildLines(seeds: readonly TripSeed[], knownTripIds: readonly string[]): PayrollTripLine[] {
  return seeds.map((seed, index) => {
    const ratio = seed.sharePercent / 100
    const allocatedKg = Math.round(seed.baseKg * ratio * 100) / 100
    const allocatedKm = Math.round(seed.baseKm * ratio * 100) / 100
    const kgAmountVnd = Math.round(allocatedKg * RATE_VND_PER_KG)
    const kmAmountVnd = Math.round(allocatedKm * RATE_VND_PER_KM)
    return {
      tripId: knownTripIds[index] ?? seed.code,
      tripCode: seed.code,
      metricBasis: 'plan',
      baseKg: seed.baseKg,
      baseKm: seed.baseKm,
      sharePercent: seed.sharePercent,
      allocatedKg,
      allocatedKm,
      kgAmountVnd,
      kmAmountVnd,
      totalAmountVnd: kgAmountVnd + kmAmountVnd,
    }
  })
}

function summarize(
  period: PayrollPeriodKey,
  status: 'DRAFT' | 'LOCKED',
  driverId: string,
  driverName: string,
  trips: readonly PayrollTripLine[],
): PayrollStatement {
  const totalKg = Math.round(trips.reduce((sum, trip) => sum + trip.allocatedKg, 0) * 100) / 100
  const totalKm = Math.round(trips.reduce((sum, trip) => sum + trip.allocatedKm, 0) * 100) / 100
  const kgAmountVnd = trips.reduce((sum, trip) => sum + trip.kgAmountVnd, 0)
  const kmAmountVnd = trips.reduce((sum, trip) => sum + trip.kmAmountVnd, 0)
  return {
    calculated: true,
    period,
    status,
    driverId,
    driverName,
    baseSalaryVnd: BASE_SALARY_VND,
    totalKg,
    rateVndPerKg: RATE_VND_PER_KG,
    kgAmountVnd,
    totalKm,
    rateVndPerKm: RATE_VND_PER_KM,
    kmAmountVnd,
    totalSalaryVnd: BASE_SALARY_VND + kgAmountVnd + kmAmountVnd,
    trips,
  }
}

/**
 * Kho mẫu của màn Phiếu lương:
 * - Tháng hiện tại: DRAFT (3 chuyến, gồm 1 chuyến chia ghép 50%)
 * - Tháng trước: LOCKED (6 chuyến, kiểm thử nút Xem thêm)
 * - 2 tháng trước: LOCKED không có chuyến (chỉ có lương cứng)
 * - Các tháng khác: chưa tính lương (`calculated: false`)
 */
export function mockPayrollApi(): PayrollApi {
  return {
    async fetchMyPayroll(period: PayrollPeriodKey): Promise<PayrollStatement> {
      const db = getMockDb()
      const viewer = db.sessionUser()
      if (!viewer) throw new MockDbError('NOT_SIGNED_IN', {})

      const trips = await db.listTrips()
      const knownTripIds = trips.filter((trip) => isVisibleTo(trip, viewer)).map((trip) => trip.id)
      const current = currentPayrollPeriod()
      const previous = shiftPayrollPeriod(current, -1)
      const twoMonthsAgo = shiftPayrollPeriod(current, -2)

      if (period === current) {
        return summarize(period, 'DRAFT', viewer.id, viewer.fullName, buildLines(DRAFT_SEEDS, knownTripIds))
      }
      if (period === previous) {
        return summarize(period, 'LOCKED', viewer.id, viewer.fullName, buildLines(LOCKED_SEEDS, knownTripIds))
      }
      if (period === twoMonthsAgo) {
        return summarize(period, 'LOCKED', viewer.id, viewer.fullName, [])
      }
      return {
        calculated: false,
        period,
        status: null,
        driverId: viewer.id,
        driverName: viewer.fullName,
      }
    },
  }
}
