import { useLocalSearchParams } from 'expo-router'

import { LiveTripScreen } from '@/features/monitoring/LiveTripScreen'

/**
 * Liên kết cũ `/monitoring/[tripId]` mở cùng màn giám sát một chuyến với `/live/[tripId]`.
 */
export default function MonitoringTripRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>()
  return <LiveTripScreen key={tripId} tripId={tripId} />
}
