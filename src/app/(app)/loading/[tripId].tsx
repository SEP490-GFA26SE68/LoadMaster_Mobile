import { useLocalSearchParams } from 'expo-router'

import { LoadingSessionScreen } from '@/features/warehouse/LoadingSessionScreen'

/**
 * Phiên soạn → xếp một chuyến của nhân viên kho: bước soạn hàng, bước xếp, màn xếp xong, hoặc vì sao chuyến chưa xếp được. Đổi chuyến là
 * dựng lại màn từ đầu.
 */
export default function LoadingRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>()
  return <LoadingSessionScreen key={tripId} tripId={tripId} />
}
