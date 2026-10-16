import { useLocalSearchParams } from 'expo-router'

import { TripScreen } from '@/features/driver/TripScreen'

/** Một chuyến của tài xế: điểm đang giao, tổng kết, hoặc vì sao chuyến không giao được. Đổi chuyến là dựng lại màn từ đầu. */
export default function TripRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>()
  return <TripScreen key={tripId} tripId={tripId} />
}
