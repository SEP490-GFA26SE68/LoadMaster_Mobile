import { useLocalSearchParams } from 'expo-router'

import { MonitoringTripScreen } from '@/features/monitoring/MonitoringTripScreen'

export default function MonitoringTripRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>()
  return <MonitoringTripScreen key={tripId} tripId={tripId} />
}
