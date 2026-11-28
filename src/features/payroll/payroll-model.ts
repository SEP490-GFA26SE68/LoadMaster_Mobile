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
  /** Khối lượng hàng của chuyến (mỗi chuyến một tài xế, không còn chia tỉ lệ). */
  readonly allocatedKg: number
  /** Hoa hồng tài xế của chuyến: kg × cước/kg × % hoa hồng (lương không tính theo km). */
  readonly kgAmountVnd: number
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
  /** Cước thu khách theo kg của công ty (không phải tiền trả thẳng cho tài xế). */
  readonly rateVndPerKg: number
  /** % hoa hồng tài xế trên cước; backend gửi khi phiếu đã chốt. */
  readonly commissionPercent?: number
  /** Hoa hồng tháng: tổng kg × cước/kg × % hoa hồng. */
  readonly kgAmountVnd: number
  /** Chỉ tiêu sản lượng KPI tháng, nếu backend có cấu hình. */
  readonly kpiTargetKg?: number
  /** Kết quả đạt chỉ tiêu do backend tính, nếu backend có cấu hình. */
  readonly kpiAchieved?: boolean
  /** Feat 1: thưởng KPI đạt mốc ngày/tháng/năm. */
  readonly kpiBonusVnd?: number
  /** Tiền phạt quản lý công ty nhập tay cho tài xế trong tháng (đã trừ vào tổng); backend chỉ gửi khi đã chốt. */
  readonly penaltyVnd?: number
  /** Lý do phạt quản lý ghi. */
  readonly penaltyNote?: string
  /** Feat 2.2: tổng phụ cấp tự bốc xếp. */
  readonly handlingAmountVnd?: number
  /** Feat 3: tổng hoa hồng doanh thu. */
  readonly commissionAmountVnd?: number
  readonly totalSalaryVnd: number
  readonly trips: readonly PayrollTripLine[]
}

export type PayrollStatement = UncalculatedPayrollStatement | CalculatedPayrollStatement
