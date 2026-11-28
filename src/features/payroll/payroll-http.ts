import { api, type ApiClient } from '@/data/http'

import type { PayrollApi } from './payroll-api'
import { toNumber, toOptionalNumber, type PayrollStatementDto, type PayrollTripLineDto } from './payroll-http-dto'
import type { PayrollStatement, PayrollTripLine } from './payroll-model'
import { isPayrollPeriodKey, type PayrollPeriodKey } from './payroll-period'
import { mapWarehousePayroll, type WarehousePayrollStatementDto } from './warehouse-payroll-mapping'
import type { WarehousePayrollStatement } from './warehouse-payroll-model'

type HttpPayrollDeps = {
  readonly client?: () => ApiClient
}

function mapTripLine(dto: PayrollTripLineDto): PayrollTripLine {
  const hasActual = dto.actualKg !== undefined
  const handlingAmountVnd = toOptionalNumber(dto.handlingAmountVnd)
  const commissionAmountVnd = toOptionalNumber(dto.commissionAmountVnd)
  return {
    tripId: String(dto.tripId),
    tripCode: dto.tripCode,
    metricBasis: hasActual ? 'actual' : 'plan',
    allocatedKg: toNumber(dto.allocatedKg),
    kgAmountVnd: toNumber(dto.kgAmountVnd),
    ...(handlingAmountVnd === undefined ? {} : { handlingAmountVnd }),
    ...(commissionAmountVnd === undefined ? {} : { commissionAmountVnd }),
    totalAmountVnd: toNumber(dto.totalAmountVnd),
  }
}

export function mapPayrollStatement(dto: PayrollStatementDto, requestedPeriod: PayrollPeriodKey): PayrollStatement {
  const period = isPayrollPeriodKey(dto.period) ? dto.period : requestedPeriod
  if (!dto.calculated) {
    return {
      calculated: false,
      period,
      status: dto.status ?? null,
      driverId: dto.driverId === null || dto.driverId === undefined ? null : String(dto.driverId),
      driverName: dto.driverName ?? null,
    }
  }
  const kpiTargetKg = toOptionalNumber(dto.kpiTargetKg)
  const commissionPercent = toOptionalNumber(dto.commissionPercent)
  const penaltyVnd = toOptionalNumber(dto.penaltyVnd)
  const penaltyNote = dto.penaltyNote?.trim() ? dto.penaltyNote.trim() : undefined
  const kpiBonusVnd = toOptionalNumber(dto.kpiBonusVnd)
  const handlingAmountVnd = toOptionalNumber(dto.handlingAmountVnd)
  const commissionAmountVnd = toOptionalNumber(dto.commissionAmountVnd)
  return {
    calculated: true,
    period,
    status: dto.status ?? 'DRAFT',
    driverId: dto.driverId === null || dto.driverId === undefined ? '' : String(dto.driverId),
    driverName: dto.driverName ?? '',
    ...(dto.payModel ? { payModel: dto.payModel } : {}),
    baseSalaryVnd: toNumber(dto.baseSalaryVnd),
    totalKg: toNumber(dto.totalKg),
    rateVndPerKg: toNumber(dto.rateVndPerKg),
    ...(commissionPercent === undefined ? {} : { commissionPercent }),
    kgAmountVnd: toNumber(dto.kgAmountVnd),
    ...(kpiTargetKg === undefined ? {} : { kpiTargetKg }),
    ...(dto.kpiAchieved === null || dto.kpiAchieved === undefined ? {} : { kpiAchieved: dto.kpiAchieved }),
    ...(kpiBonusVnd === undefined ? {} : { kpiBonusVnd }),
    ...(penaltyVnd === undefined ? {} : { penaltyVnd }),
    ...(penaltyNote === undefined ? {} : { penaltyNote }),
    ...(handlingAmountVnd === undefined ? {} : { handlingAmountVnd }),
    ...(commissionAmountVnd === undefined ? {} : { commissionAmountVnd }),
    totalSalaryVnd: toNumber(dto.totalSalaryVnd),
    trips: (dto.trips ?? []).map(mapTripLine),
  }
}

/**
 * Nguồn backend của màn Phiếu lương.
 * Phase 1 gọi `GET /api/driver/payroll?period=YYYY-MM`; ở Feat 4 sẽ chuyển sang `/api/me/payroll`.
 */
export function httpPayrollApi({ client = api }: HttpPayrollDeps = {}): PayrollApi {
  return {
    async fetchMyPayroll(period: PayrollPeriodKey): Promise<PayrollStatement> {
      const dto = await client().get<PayrollStatementDto>(`/api/driver/payroll?period=${encodeURIComponent(period)}`)
      return mapPayrollStatement(dto, period)
    },
    async fetchMyWarehousePayroll(period: PayrollPeriodKey): Promise<WarehousePayrollStatement> {
      const dto = await client().get<WarehousePayrollStatementDto>(`/api/warehouse/payroll?period=${encodeURIComponent(period)}`)
      return mapWarehousePayroll(dto, period)
    },
  }
}
