/**
 * Hàm → endpoint backend; mỗi nguồn là một adapter (`fleet-mock.ts` kho mẫu, `fleet-http.ts` backend).
 *   fetchFleetTrips    GET /api/trips
 * Lập chuyến, sửa chuyến ở bản web — app chỉ đọc danh sách.
 */
import { createAdapter } from '@/data/adapter'

import type { FleetTrip } from './fleet-model'
import { httpFleetApi } from './fleet-http'
import { mockFleetApi } from './fleet-mock'

export type FleetApi = {
  fetchFleetTrips(): Promise<readonly FleetTrip[]>
}

const adapter = createAdapter<FleetApi>('fleet', { mock: mockFleetApi, http: () => httpFleetApi() })

// GET /api/trips
export function fetchFleetTrips(): Promise<readonly FleetTrip[]> {
  return adapter().fetchFleetTrips()
}
