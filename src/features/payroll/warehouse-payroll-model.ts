import type { PayrollPeriodStatus } from './payroll-model'
import type { PayrollPeriodKey } from './payroll-period'

/** Việc xếp của nhân viên kho trên một chuyến trong kỳ (`WarehousePayrollTripLineResponse`). */
export type WarehousePayrollTripLine = {
  readonly tripId: string
  readonly tripCode: string
  /** Ngày xếp `YYYY-MM-DD` (giờ Việt Nam); `null` khi máy chủ không trả. */
  readonly loadedDate: string | null
  readonly loadedPackages: number
  readonly loadedKg: number
}

/**
 * Kỳ chưa có phiếu lương của nhân viên kho: kỳ chưa chốt (máy chủ chỉ cho xem lương cứng của tháng — kg đã xếp, tiền theo kg và KPI hiện sau
 * khi chốt), hoặc kỳ đã chốt mà người này không có bản ghi lương.
 */
export type UncalculatedWarehousePayroll = {
  readonly calculated: false
  readonly period: PayrollPeriodKey
  readonly status: PayrollPeriodStatus | null
  readonly workerId: string | null
  readonly workerName: string | null
  /** Lương cứng của tháng theo đơn giá đang hiệu lực; `null` khi máy chủ không trả (chưa có đơn giá lương kho, hoặc kỳ đã chốt không có bản ghi). */
  readonly baseSalaryVnd: number | null
}

/** Phiếu lương đã chốt của nhân viên kho. */
export type CalculatedWarehousePayroll = {
  readonly calculated: true
  readonly period: PayrollPeriodKey
  readonly status: PayrollPeriodStatus
  readonly workerId: string
  readonly workerName: string
  readonly baseSalaryVnd: number
  readonly loadedPackages: number
  readonly loadedKg: number
  readonly rateVndPerKg: number
  readonly loadedAmountVnd: number
  /** Chỉ tiêu kg tháng của đơn giá; vắng khi máy chủ không trả. */
  readonly kpiTargetKg?: number
  readonly kpiAchieved?: boolean
  readonly kpiBonusVnd?: number
  readonly totalSalaryVnd: number
  readonly trips: readonly WarehousePayrollTripLine[]
}

export type WarehousePayrollStatement = UncalculatedWarehousePayroll | CalculatedWarehousePayroll
