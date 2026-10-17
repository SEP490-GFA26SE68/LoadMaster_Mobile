import { useQuery } from '@tanstack/react-query'

import { fetchFleetTrips } from './fleet-api'

export const fleetKeys = {
  all: ['fleet'] as const,
  trips: ['fleet', 'trips'] as const,
}

export function useFleetTripsQuery() {
  return useQuery({ queryKey: fleetKeys.trips, queryFn: fetchFleetTrips })
}
