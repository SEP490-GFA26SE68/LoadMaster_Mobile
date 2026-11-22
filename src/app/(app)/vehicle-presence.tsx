import { Redirect } from 'expo-router'

import { OfflineGate } from '@/components/OfflineGate'
import { VehiclePresenceScreen } from '@/features/warehouse/presence/VehiclePresenceScreen'
import { WAREHOUSE_LIST } from '@/features/warehouse/session-routes'
import { useWarehouseCapabilities } from '@/features/warehouse/useWarehouseQueries'

/** "Xe ở kho" của nhân viên kho. Kho mẫu không có việc này: nguồn `warehouse` không phải máy chủ thì về danh sách chuyến của kho. */
export default function VehiclePresenceRoute() {
  const { backend } = useWarehouseCapabilities()
  if (!backend) return <Redirect href={WAREHOUSE_LIST} />
  return (
    <OfflineGate feature="warehouse">
      <VehiclePresenceScreen />
    </OfflineGate>
  )
}
