import { useLocalSearchParams } from 'expo-router'

import { OfflineGate } from '@/components/OfflineGate'
import { TripScreen } from '@/features/driver/TripScreen'

/** Một chuyến của tài xế: điểm đang giao, tổng kết, hoặc vì sao chuyến không giao được. Đổi chuyến là dựng lại màn từ đầu. */
export default function TripRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>()
  return (
    <OfflineGate feature="driver">
      <TripScreen key={tripId} tripId={tripId} />
    </OfflineGate>
  )
}
