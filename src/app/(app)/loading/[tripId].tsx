import { useLocalSearchParams } from 'expo-router'

import { OfflineGate } from '@/components/OfflineGate'
import { ServerLoadingSessionScreen } from '@/features/warehouse/server/ServerLoadingSessionScreen'
import { LoadingSessionScreen } from '@/features/warehouse/LoadingSessionScreen'
import { useWarehouseCapabilities } from '@/features/warehouse/useWarehouseQueries'

/**
 * Phiên soạn → xếp một chuyến của nhân viên kho: bước soạn hàng, bước xếp, màn xếp xong, hoặc vì sao chuyến chưa xếp được. Nguồn
 * `warehouse` là máy chủ thì phiên của máy chủ (`tripId` là mã số chuyến của máy chủ), không thì phiên dựng từ kho mẫu. Đổi chuyến là
 * dựng lại màn từ đầu.
 */
export default function LoadingRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>()
  const { backend } = useWarehouseCapabilities()
  return (
    <OfflineGate feature="warehouse">
      {backend ? <ServerLoadingSessionScreen key={tripId} tripId={tripId} /> : <LoadingSessionScreen key={tripId} tripId={tripId} />}
    </OfflineGate>
  )
}
