/** Tab Kho của nhân viên kho: danh sách chuyến cần xếp, nhóm theo giai đoạn (`WarehouseTripsScreen`). */
import type { Dictionary } from '../types'
import type { warehouseTrips as source } from '../vi/warehouseTrips'

export const warehouseTrips = {
  section: '{group} ({count})',
  openLabel: '{action} {tripId}',
} satisfies Dictionary<typeof source>
