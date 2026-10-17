import type { TripStatus } from '@/types/trip'

export type FleetTrip = {
  readonly id: string
  readonly code: string
  readonly name?: string
  readonly vehicleName: string
  readonly driverName?: string
  readonly status: TripStatus
  readonly departureAt?: string
}
