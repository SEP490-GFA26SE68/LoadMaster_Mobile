import { api, ApiError, type ApiClient } from '@/data/http'
import { roundKg } from '@/domain/geometry'
import { vnDate } from '@/lib/mock-db'
import { decimalOf, isoFromBackend, required } from '@/lib/office-backend'
import { TRIP_STATUSES } from '@/types/trip'

import type { DashboardApi } from './dashboard-api'
import type { DashboardDto } from './dashboard-http-dto'
import { daysOf, type DateRange } from './dashboard-period'
import type { DashboardSummary, DashboardTripView, VehicleSummary } from './dashboard-summary'

/*
 * Nguồn backend của tab Tổng quan, như `dashboard-backend-api.ts` + `dashboard-dto.ts` của web: máy chủ tính số theo kỳ (ngày giờ Việt
 * Nam, khoảng đóng) cho công ty của phiên, nên đổi kỳ là đọc lại. Số máy chủ tính không mang MOCK RESULT. Máy chủ không trả dòng phụ, số
 * kiện, khối lượng đã giao của từng chuyến và chỉ trả các chuyến gần nhất (`tripDetails`, `allTrips` tắt).
 */

type RecentTripDto = NonNullable<DashboardDto['recentTrips']>[number]
type VehicleWeightDto = NonNullable<DashboardDto['weightByVehicle']>[number]

function tripOf(dto: RecentTripDto): DashboardTripView {
  const code = dto.tripCode?.trim() || String(dto.tripId)
  // Máy chủ chỉ đếm chuyến có giờ xuất phát trong kỳ: chuyến không có giờ đó là máy chủ đổi hợp đồng
  if (dto.departureTime === null) throw new ApiError('SERVER_ERROR')
  const departure = isoFromBackend(dto.departureTime)
  return {
    id: code,
    name: dto.tripName?.trim() || code,
    // Kỳ của máy chủ theo giờ xuất phát giờ Việt Nam: ngày chạy là ngày của giờ đó
    scheduledDate: vnDate(new Date(departure)),
    vehicleName: dto.vehicleName ?? '',
    driverName: dto.driverName,
    status: required(TRIP_STATUSES, dto.status),
    volumePercent: decimalOf(dto.fillPercent),
  }
}

function vehicleOf(dto: VehicleWeightDto): VehicleSummary {
  const vehicleId = String(dto.vehicleId)
  return {
    vehicleId,
    vehicleName: dto.vehicleName ?? vehicleId,
    tripCount: dto.tripCount,
    deliveredWeightKg: roundKg(decimalOf(dto.deliveredWeightKg) ?? 0),
    averageFillPercent: decimalOf(dto.averageFillPercent),
  }
}

/**
 * Số của máy chủ → `DashboardSummary`. Lấp đầy theo ngày: máy chủ chỉ trả ngày có phương án đã duyệt, mọi ngày của kỳ đều có phần tử và
 * ngày không có số để trống (như kho mẫu). Chuyến theo trạng thái chỉ giữ trạng thái có chuyến. `period` là kỳ máy chủ trả về.
 */
export function dashboardSummaryOf(dto: DashboardDto): DashboardSummary {
  const period: DateRange = { from: dto.from, to: dto.to }
  const fillOf = new Map((dto.fillByDay ?? []).map((day) => [day.date, day]))
  const byStatus = dto.tripsByStatus ?? {}
  return {
    period,
    tripCount: dto.tripCount,
    completedCount: dto.completedCount,
    fill: { averagePercent: decimalOf(dto.fill.averagePercent), planCount: dto.fill.planCount, isMockResult: false },
    deliveredWeightKg: roundKg(decimalOf(dto.deliveredWeightKg) ?? 0),
    delivery: {
      cleanPercent: decimalOf(dto.delivery.cleanPercent),
      cleanItems: dto.delivery.cleanItems,
      finishedItems: dto.delivery.finishedItems,
    },
    vehicles: {
      inUse: dto.vehicles.inService,
      total: dto.vehicles.total,
      byStatus: {
        available: dto.vehicles.available,
        in_use: dto.vehicles.inService,
        maintenance: dto.vehicles.maintenance,
        retired: dto.vehicles.retired,
      },
    },
    fillByDay: daysOf(period).map((date) => {
      const day = fillOf.get(date)
      return { date, averagePercent: decimalOf(day?.averagePercent), planCount: day?.planCount ?? 0 }
    }),
    tripsByStatus: TRIP_STATUSES.map((status) => ({ status, count: byStatus[status] ?? 0 })).filter((entry) => entry.count > 0),
    byVehicle: (dto.weightByVehicle ?? []).map(vehicleOf),
    trips: (dto.recentTrips ?? []).map(tripOf),
  }
}

/** Chuyến mở được khi màn chuyến cũng đọc máy chủ (mã chuyến của máy chủ). */
export function httpDashboardApi({ tripLinks, client = api }: { readonly tripLinks: boolean; readonly client?: () => ApiClient }): DashboardApi {
  return {
    capabilities: { backend: true, tripDetails: false, tripLinks, allTrips: false },
    async fetchDashboardSummary({ from, to }) {
      return dashboardSummaryOf(await client().get<DashboardDto>('/api/manager/dashboard', { query: { from, to } }))
    },
  }
}
