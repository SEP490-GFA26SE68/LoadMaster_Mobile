import { useLocalSearchParams } from 'expo-router'

import { OfflineGate } from '@/components/OfflineGate'
import { DriverTripDetailScreen } from '@/features/driver/detail/DriverTripDetailScreen'

/** Chi tiết chuyến đi của tài xế: thông tin xe, kho, bản đồ tuyến, danh sách điểm dừng và kiện hàng. */
export default function DriverTripRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>()
  return (
    <OfflineGate feature="driver">
      <DriverTripDetailScreen key={tripId} tripId={tripId} />
    </OfflineGate>
  )
}
