import { api, type ApiClient } from '@/data/http'
import { TRIP_STATUSES, type TripStatus } from '@/types/trip'

import type { FleetApi } from './fleet-api'
import type { FleetTrip } from './fleet-model'

type TripDto = {
  readonly id: number
  readonly tripCode: string | null
  readonly tripName: string | null
  readonly vehicleName: string | null
  readonly licensePlate: string | null
  readonly driverName: string | null
  readonly departureTime: string | null
  readonly status: string | null
}

type HttpDeps = { readonly client?: () => ApiClient }

const tripStatusOf = (value: string | null): TripStatus => TRIP_STATUSES.find((status) => status === value) ?? 'DRAFT'

export function httpFleetApi({ client = api }: HttpDeps = {}): FleetApi {
  return {
    async fetchFleetTrips() {
      const rows = await client().get<readonly TripDto[] | null>('/api/trips', { query: { page: 0, size: 50 } })
      return (rows ?? []).map(
        (dto): FleetTrip => ({
          id: String(dto.id),
          code: dto.tripCode ?? String(dto.id),
          name: dto.tripName ?? undefined,
          vehicleName: [dto.vehicleName, dto.licensePlate].filter(Boolean).join(' · '),
          driverName: dto.driverName ?? undefined,
          status: tripStatusOf(dto.status),
          departureAt: dto.departureTime ?? undefined,
        }),
      )
    },
  }
}
