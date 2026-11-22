import { toNumber, toOptionalNumber, type NumericDto } from './payroll-http-dto'
import type { PayrollPeriodStatus } from './payroll-model'
import { isPayrollPeriodKey, type PayrollPeriodKey } from './payroll-period'
import type { WarehousePayrollStatement, WarehousePayrollTripLine } from './warehouse-payroll-model'

/** Khớp `WarehousePayrollTripLineResponse` của backend (`loadedDate` là `LocalDate`). */
export type WarehousePayrollTripLineDto = {
  readonly tripId: number | string
  readonly tripCode?: string | null
  readonly loadedDate?: string | null
  readonly loadedPackages?: NumericDto
  readonly loadedKg?: NumericDto
}

/** Khớp `WarehousePayrollStatementResponse` của backend (`@JsonInclude(NON_NULL)`: trường rỗng vắng hẳn). */
export type WarehousePayrollStatementDto = {
  readonly calculated: boolean
  readonly period?: string | null
  readonly status?: PayrollPeriodStatus | null
  readonly workerId?: number | string | null
  readonly workerName?: string | null
  readonly baseSalaryVnd?: NumericDto
  readonly loadedPackages?: NumericDto
  readonly loadedKg?: NumericDto
  readonly rateVndPerKg?: NumericDto
  readonly loadedAmountVnd?: NumericDto
  readonly kpiTargetKg?: NumericDto
  readonly kpiAchieved?: boolean | null
  readonly kpiBonusVnd?: NumericDto
  readonly totalSalaryVnd?: NumericDto
  readonly trips?: readonly WarehousePayrollTripLineDto[] | null
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function mapLine(dto: WarehousePayrollTripLineDto): WarehousePayrollTripLine {
  const tripId = String(dto.tripId)
  return {
    tripId,
    tripCode: dto.tripCode ?? tripId,
    loadedDate: typeof dto.loadedDate === 'string' && DATE_PATTERN.test(dto.loadedDate) ? dto.loadedDate : null,
    loadedPackages: toNumber(dto.loadedPackages),
    loadedKg: toNumber(dto.loadedKg),
  }
}

const idOf = (value: number | string | null | undefined) => (value === null || value === undefined ? null : String(value))

/** Phiếu lương kho của máy chủ → kiểu của app; kỳ máy chủ trả sai dạng thì giữ kỳ đã hỏi. */
export function mapWarehousePayroll(dto: WarehousePayrollStatementDto, requestedPeriod: PayrollPeriodKey): WarehousePayrollStatement {
  const period = typeof dto.period === 'string' && isPayrollPeriodKey(dto.period) ? dto.period : requestedPeriod
  if (!dto.calculated) {
    return {
      calculated: false,
      period,
      status: dto.status ?? null,
      workerId: idOf(dto.workerId),
      workerName: dto.workerName ?? null,
      baseSalaryVnd: toOptionalNumber(dto.baseSalaryVnd) ?? null,
    }
  }
  const kpiTargetKg = toOptionalNumber(dto.kpiTargetKg)
  const kpiBonusVnd = toOptionalNumber(dto.kpiBonusVnd)
  return {
    calculated: true,
    period,
    status: dto.status ?? 'LOCKED',
    workerId: idOf(dto.workerId) ?? '',
    workerName: dto.workerName ?? '',
    baseSalaryVnd: toNumber(dto.baseSalaryVnd),
    loadedPackages: toNumber(dto.loadedPackages),
    loadedKg: toNumber(dto.loadedKg),
    rateVndPerKg: toNumber(dto.rateVndPerKg),
    loadedAmountVnd: toNumber(dto.loadedAmountVnd),
    ...(kpiTargetKg === undefined ? {} : { kpiTargetKg }),
    ...(dto.kpiAchieved === null || dto.kpiAchieved === undefined ? {} : { kpiAchieved: dto.kpiAchieved }),
    ...(kpiBonusVnd === undefined ? {} : { kpiBonusVnd }),
    totalSalaryVnd: toNumber(dto.totalSalaryVnd),
    trips: (dto.trips ?? []).map(mapLine),
  }
}
