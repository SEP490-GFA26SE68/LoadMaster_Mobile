import { useLocalSearchParams } from 'expo-router'

import { LiveTripScreen } from '@/features/monitoring/LiveTripScreen'

/**
 * Giám sát một chuyến đang chạy của điều phối viên và quản lý công ty: vị trí xe, giờ đến từng điểm, sự cố cấp chuyến, nhận hàng dọc
 * đường. Đổi chuyến là dựng lại màn từ đầu.
 */
export default function LiveTripRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>()
  return <LiveTripScreen key={tripId} tripId={tripId} />
}
