import { failure, fakeDriverBackend, ok, type Routes } from '@/test/driver-backend'

import { httpDashboardApi } from './dashboard-http'

/* Nguồn backend của tab Tổng quan trên máy chủ giả: kỳ gửi lên máy chủ, số `null` giữ nguyên, ngày không có số để trống. */

const DASHBOARD = {
  from: '2026-10-14',
  to: '2026-10-16',
  tripCount: 5,
  completedCount: 2,
  cancelledCount: 1,
  tripsByStatus: { DRAFT: 0, PLANNED: 1, LOADING: 0, IN_TRANSIT: 1, DELIVERED: 2, CANCELLED: 1 },
  fill: { averagePercent: '72.5', planCount: 3 },
  deliveredWeightKg: 1234.567,
  delivery: { cleanPercent: null, cleanItems: 0, finishedItems: 0 },
  vehicles: { total: 9, inService: 2, available: 5, maintenance: 1, retired: 1 },
  fillByDay: [{ date: '2026-10-15', averagePercent: 80, planCount: 2 }],
  weightByVehicle: [{ vehicleId: 3, vehicleName: null, tripCount: 2, deliveredWeightKg: '800', averageFillPercent: null }],
  recentTrips: [
    {
      tripId: 41,
      tripCode: 'TRIP-0041',
      tripName: null,
      departureTime: '2026-10-15T23:30:00+07:00',
      status: 'IN_TRANSIT',
      vehicleName: 'Xe tải 5 tấn',
      driverName: null,
      fillPercent: 64.25,
    },
  ],
}

function dashboard(routes: Routes, tripLinks = true) {
  const { calls, client } = fakeDriverBackend(routes)
  return { calls, api: httpDashboardApi({ tripLinks, client: () => client }) }
}

describe('httpDashboardApi', () => {
  test('đọc số của kỳ đang chọn và đổi sang số liệu của màn', async () => {
    const { calls, api } = dashboard({ 'GET /api/manager/dashboard': () => ok(DASHBOARD) })
    const summary = await api.fetchDashboardSummary({ from: '2026-10-14', to: '2026-10-16' })
    expect(calls[0]?.query).toEqual({ from: '2026-10-14', to: '2026-10-16' })
    expect(summary).toEqual({
      period: { from: '2026-10-14', to: '2026-10-16' },
      tripCount: 5,
      completedCount: 2,
      fill: { averagePercent: 72.5, planCount: 3, isMockResult: false },
      deliveredWeightKg: 1234.57,
      delivery: { cleanPercent: null, cleanItems: 0, finishedItems: 0 },
      vehicles: { inUse: 2, total: 9, byStatus: { available: 5, in_use: 2, maintenance: 1, retired: 1 } },
      fillByDay: [
        { date: '2026-10-14', averagePercent: null, planCount: 0 },
        { date: '2026-10-15', averagePercent: 80, planCount: 2 },
        { date: '2026-10-16', averagePercent: null, planCount: 0 },
      ],
      tripsByStatus: [
        { status: 'PLANNED', count: 1 },
        { status: 'IN_TRANSIT', count: 1 },
        { status: 'DELIVERED', count: 2 },
        { status: 'CANCELLED', count: 1 },
      ],
      byVehicle: [{ vehicleId: '3', vehicleName: '3', tripCount: 2, deliveredWeightKg: 800, averageFillPercent: null }],
      // 23:30 giờ Việt Nam ngày 15/10: ngày chạy là ngày của giờ đó
      trips: [
        {
          id: 'TRIP-0041',
          name: 'TRIP-0041',
          scheduledDate: '2026-10-15',
          vehicleName: 'Xe tải 5 tấn',
          driverName: null,
          status: 'IN_TRANSIT',
          volumePercent: 64.25,
        },
      ],
    })
  })

  test('máy chủ không trả chi tiết từng chuyến và chỉ trả chuyến gần nhất; chuyến mở được khi màn chuyến cùng nguồn', () => {
    expect(dashboard({}).api.capabilities).toEqual({ backend: true, tripDetails: false, tripLinks: true, allTrips: false })
    expect(dashboard({}, false).api.capabilities.tripLinks).toBe(false)
  })

  test('trạng thái chuyến ngoài hợp đồng, chuyến không có giờ xuất phát là lỗi của máy chủ', async () => {
    const reply: { current: unknown } = { current: { ...DASHBOARD, recentTrips: [{ ...DASHBOARD.recentTrips[0], status: 'ARCHIVED' }] } }
    const { api } = dashboard({ 'GET /api/manager/dashboard': () => ok(reply.current) })
    const period = { from: '2026-10-14', to: '2026-10-16' }
    expect((await failure(() => api.fetchDashboardSummary(period))).code).toBe('SERVER_ERROR')
    reply.current = { ...DASHBOARD, recentTrips: [{ ...DASHBOARD.recentTrips[0], departureTime: null }] }
    expect((await failure(() => api.fetchDashboardSummary(period))).code).toBe('SERVER_ERROR')
  })
})
