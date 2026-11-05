import { useLocalSearchParams } from 'expo-router'

import { TripDetailScreen } from '@/features/trips/TripDetailScreen'

/** Chi tiết một chuyến của điều phối viên và quản lý công ty (đọc, kèm việc chờ duyệt). Đổi chuyến là dựng lại màn từ đầu. */
export default function TripDetailRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>()
  return <TripDetailScreen key={tripId} tripId={tripId} />
}
