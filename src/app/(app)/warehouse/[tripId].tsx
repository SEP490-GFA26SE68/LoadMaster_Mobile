import { useLocalSearchParams } from 'expo-router'

import { WarehouseLoadingScreen } from '@/features/warehouse/WarehouseLoadingScreen'

export default function WarehouseTripRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>()
  return <WarehouseLoadingScreen key={tripId} tripId={tripId} />
}
