/*
 * DTO của `GET /api/manager/dashboard` (`ManagerDashboardResponse`), như `dashboard-dto.ts` của web. Chỉ adapter `http` của tab Tổng quan
 * import file này. Số không có nguồn máy chủ trả `null` (không phải 0); tỷ lệ là % (0–100), khối lượng kg.
 */

/** `BigDecimal`: số, hoặc chuỗi khi máy chủ ghi bằng chuỗi. */
type Decimal = number | string

export type DashboardDto = {
  readonly from: string
  readonly to: string
  readonly tripCount: number
  readonly completedCount: number
  readonly cancelledCount?: number | null
  readonly tripsByStatus?: Readonly<Record<string, number>> | null
  readonly fill: { readonly averagePercent: Decimal | null; readonly planCount: number }
  readonly deliveredWeightKg: Decimal | null
  readonly delivery: { readonly cleanPercent: Decimal | null; readonly cleanItems: number; readonly finishedItems: number }
  readonly vehicles: {
    readonly total: number
    readonly inService: number
    readonly available: number
    readonly maintenance: number
    readonly retired: number
  }
  readonly fillByDay?: readonly { readonly date: string; readonly averagePercent: Decimal | null; readonly planCount: number }[] | null
  readonly weightByVehicle?:
    | readonly {
        readonly vehicleId: number
        readonly vehicleName: string | null
        readonly tripCount: number
        readonly deliveredWeightKg: Decimal | null
        readonly averageFillPercent: Decimal | null
      }[]
    | null
  readonly recentTrips?:
    | readonly {
        readonly tripId: number
        readonly tripCode: string | null
        readonly tripName: string | null
        readonly departureTime: string | null
        readonly status: string | null
        readonly vehicleName: string | null
        readonly driverName: string | null
        readonly fillPercent: Decimal | null
      }[]
    | null
}
