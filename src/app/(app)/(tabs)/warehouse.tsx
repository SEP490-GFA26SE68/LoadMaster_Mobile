import { ServerWarehouseTripsScreen } from '@/features/warehouse/server/ServerWarehouseTripsScreen'
import { useWarehouseCapabilities } from '@/features/warehouse/useWarehouseQueries'
import { WarehouseTripsScreen } from '@/features/warehouse/WarehouseTripsScreen'

/** Tab Kho: nguồn `warehouse` là máy chủ thì danh sách chuyến của máy chủ, không thì của kho mẫu. */
export default function WarehouseRoute() {
  return useWarehouseCapabilities().backend ? <ServerWarehouseTripsScreen /> : <WarehouseTripsScreen />
}
