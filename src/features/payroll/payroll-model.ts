import type { PayrollPeriodKey } from './payroll-period'

export type PayrollPeriodStatus = 'DRAFT' | 'LOCKED'

/** Nguồn sản lượng chuyến: Phase 1 dùng kế hoạch (`plan`), Feat 1 chuyển sang thực tế (`actual`). */
export type PayrollMetricBasis = 'plan' | 'actual'

/** Mô hình trả lương (sẵn sàng cho Feat 3: KM_KG / COMMISSION / MIXED). */
export type PayrollPayModel = 'KM_KG' | 'COMMISSION' | 'MIXED'

/** Dòng thu nhập theo từng chuyến đã giao trong kỳ lương. */
export type PayrollTripLine = {
  readonly tripId: string
  readonly tripCode: string
  readonly metricBasis: PayrollMetricBasis
  /** Khối lượng gốc của chuyến trước khi chia tỉ lệ (planKg hoặc actualKg). */
  readonly baseKg: number
  /** Quãng đường gốc của chuyến trước khi chia tỉ lệ (planKm hoặc actualKm). */
  readonly baseKm: number
  /** Tỉ lệ chia cho tài xế này (0..100, ví dụ 100 hoặc 50 khi chạy ghép). */
  readonly sharePercent: number
  readonly allocatedKg: number
  readonly allocatedKm: number
  readonly kgAmountVnd: number
  readonly kmAmountVnd: number
  /** Feat 2.2: phụ cấp tự bốc xếp theo chuyến (nếu có). */
  readonly handlingAmountVnd?: number
  /** Feat 3: hoa hồng doanh thu theo chuyến (nếu có). */
  readonly commissionAmountVnd?: number
  readonly totalAmountVnd: number
}

/** Kỳ chưa được quản lý tính lương hoặc tài xế chưa có bản ghi lương trong kỳ. */
export type UncalculatedPayrollStatement = {
  readonly calculated: false
  readonly period: PayrollPeriodKey
  readonly status: PayrollPeriodStatus | null
  readonly driverId: string | null
  readonly driverName: string | null
}

/** Phiếu lương đã có số liệu (Bản nháp hoặc Đã chốt). */
export type CalculatedPayrollStatement = {
  readonly calculated: true
  readonly period: PayrollPeriodKey
  readonly status: PayrollPeriodStatus
  readonly driverId: string
  readonly driverName: string
  readonly payModel?: PayrollPayModel
  readonly baseSalaryVnd: number
  readonly totalKg: number
  readonly rateVndPerKg: number
  readonly kgAmountVnd: number
  readonly totalKm: number
  readonly rateVndPerKm: number
  readonly kmAmountVnd: number
  /** Feat 1: thưởng KPI đạt mốc ngày/tháng/năm. */
  readonly kpiBonusVnd?: number
  /** Feat 2.2: tổng phụ cấp tự bốc xếp. */
  readonly handlingAmountVnd?: number
  /** Feat 3: tổng hoa hồng doanh thu. */
  readonly commissionAmountVnd?: number
  readonly totalSalaryVnd: number
  readonly trips: readonly PayrollTripLine[]
}

export type PayrollStatement = UncalculatedPayrollStatement | CalculatedPayrollStatement
