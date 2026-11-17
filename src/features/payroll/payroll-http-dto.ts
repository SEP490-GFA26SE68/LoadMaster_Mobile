import type { PayrollPayModel, PayrollPeriodStatus } from './payroll-model'

export type NumericDto = number | string | null | undefined

/** Khớp `PayrollTripLineResponse` của `LoadMaster_BE` + các trường tùy chọn cho Feat 1–3. */
export type PayrollTripLineDto = {
  readonly tripId: number | string
  readonly tripCode: string
  readonly planKg?: NumericDto
  readonly planKm?: NumericDto
  readonly actualKg?: NumericDto
  readonly actualKm?: NumericDto
  readonly sharePercent?: NumericDto
  readonly allocatedKg?: NumericDto
  readonly allocatedKm?: NumericDto
  readonly kgAmountVnd?: NumericDto
  readonly kmAmountVnd?: NumericDto
  readonly handlingAmountVnd?: NumericDto
  readonly commissionAmountVnd?: NumericDto
  readonly totalAmountVnd?: NumericDto
}

/** Khớp `PayrollStatementResponse` của `LoadMaster_BE` + các trường tùy chọn cho Feat 1–3. */
export type PayrollStatementDto = {
  readonly period: string
  readonly calculated: boolean
  readonly status?: PayrollPeriodStatus | null
  readonly driverId?: number | string | null
  readonly driverName?: string | null
  readonly payModel?: PayrollPayModel | null
  readonly baseSalaryVnd?: NumericDto
  readonly totalKg?: NumericDto
  readonly rateVndPerKg?: NumericDto
  readonly kgAmountVnd?: NumericDto
  readonly totalKm?: NumericDto
  readonly rateVndPerKm?: NumericDto
  readonly kmAmountVnd?: NumericDto
  readonly kpiBonusVnd?: NumericDto
  readonly handlingAmountVnd?: NumericDto
  readonly commissionAmountVnd?: NumericDto
  readonly totalSalaryVnd?: NumericDto
  readonly trips?: readonly PayrollTripLineDto[] | null
}

/** Đổi BigDecimal JSON (số hoặc chuỗi số) sang `number`, fallback 0 khi rỗng hoặc không hợp lệ. */
export function toNumber(value: NumericDto, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

/** Đổi trường số tùy chọn (Phase 2); trả `undefined` khi backend chưa trả field này. */
export function toOptionalNumber(value: NumericDto): number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}
