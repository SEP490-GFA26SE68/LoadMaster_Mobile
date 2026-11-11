import type { ApiClient } from '@/data/http'
import { httpWarehouseApi } from '@/features/warehouse/warehouse-http'

import { fakeDriverBackend, type Routes } from './driver-backend'

/*
 * Máy chủ giả cho màn kho nối backend (cùng máy chủ giả của tài xế: trả theo `PHƯƠNG_THỨC đường-dẫn`, ghi lại mọi lượt gọi). Dữ liệu theo
 * dạng `WarehouseController` trả: chuyến 51 đang xếp (hai kiện, có bước soạn), 52 chờ soạn, 53 đã xếp xong, 54 chờ điều phối tối ưu lại.
 */

export { fail, failure, ok, type Call, type Routes } from './driver-backend'

/** Một chỗ xếp của phiên: kiện `7000 + sequence`, nằm trên sàn, chưa soạn, chưa xếp. */
export function step(placementId: number, sequence: number, extra: Record<string, unknown> = {}) {
  return {
    placementId,
    packageId: 7000 + sequence,
    packageName: `Tủ lạnh ${sequence}`,
    packageCode: `DMX-0${sequence}`,
    trackingBarcode: `LM-BAR-000${sequence}`,
    qrToken: `lm-qr-000${sequence}`,
    posX: 100 * sequence,
    posY: 0,
    posZ: 0,
    packedLength: 60,
    packedWidth: 50,
    packedHeight: 80,
    weightKg: 42.5,
    sequence,
    stopSequence: 1,
    stopName: 'Điện máy Xanh Biên Hoà',
    status: 'PENDING',
    staged: false,
    ...extra,
  }
}

/** Phiên của chuyến 51: có bước soạn, chưa soạn kiện nào. */
export function sessionDto(extra: Record<string, unknown> = {}) {
  return {
    tripId: 51,
    tripCode: 'TRIP-0051',
    vehicleInfo: '51C-555.55',
    innerLength: 600,
    innerWidth: 240,
    innerHeight: 240,
    status: 'IN_PROGRESS',
    stagingRequired: true,
    stagingComplete: false,
    pendingManualCount: 0,
    placements: [step(901, 1), step(902, 2)],
    ...extra,
  }
}

/** Phiên của chuyến 51 đã soạn đủ, sang bước xếp; `outcomes` là trạng thái của từng chỗ xếp theo thứ tự. */
export function loadingDto(statuses: readonly string[] = ['PENDING', 'PENDING'], extra: Record<string, unknown> = {}) {
  return sessionDto({
    stagingComplete: true,
    placements: [step(901, 1, { staged: true, status: statuses[0] }), step(902, 2, { staged: true, status: statuses[1] })],
    ...extra,
  })
}

export const TASKS = [
  { tripId: 52, tripCode: 'TRIP-0052', vehicleInfo: '51C-222.22', totalPackages: 8, departureTime: '2026-11-12T09:00:00', status: 'PLANNED' },
  {
    tripId: 51,
    tripCode: 'TRIP-0051',
    vehicleInfo: '51C-555.55',
    totalPackages: 2,
    departureTime: '2026-11-12T07:30:00',
    status: 'LOADING',
    executionStatus: 'IN_PROGRESS',
  },
  {
    tripId: 53,
    tripCode: 'TRIP-0053',
    vehicleInfo: '51C-333.33',
    totalPackages: 5,
    departureTime: '2026-11-12T06:00:00',
    status: 'LOADING',
    executionStatus: 'COMPLETED',
  },
  {
    tripId: 54,
    tripCode: 'TRIP-0054',
    vehicleInfo: '51C-444.44',
    totalPackages: 3,
    departureTime: null,
    status: 'PLANNED',
    awaitingReplan: true,
    replanReason: 'DAMAGED_PACKAGE',
  },
]

/** Nguồn backend của kho trên máy chủ giả. */
export function warehouseBackend(routes: Routes) {
  const { calls, client } = fakeDriverBackend(routes)
  const warehouse = httpWarehouseApi({ client: (): ApiClient => client })
  return { calls, warehouse }
}
