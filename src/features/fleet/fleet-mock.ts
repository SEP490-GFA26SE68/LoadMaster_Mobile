import { getMockDb } from '@/data/mock-db'
import { tripStatus, type MockDb } from '@/lib/mock-db'

import type { FleetApi } from './fleet-api'
import type { FleetTrip } from './fleet-model'

export function mockFleetApi(db: () => MockDb = getMockDb): FleetApi {
  return {
    async fetchFleetTrips() {
      const trips = await db().listTrips()
      const users = await db().listUsers().catch(() => [])
      const nameOf = (id: string | null) => (id === null ? undefined : users.find((user) => user.id === id)?.fullName)
      const rows: FleetTrip[] = []
      for (const trip of trips) {
        const vehicle = await db().getVehicle(trip.vehicleId)
        rows.push({
          id: trip.id,
          code: trip.id,
          name: trip.name,
          vehicleName: vehicle.name,
          driverName: nameOf(trip.driverId),
          status: tripStatus(trip),
          departureAt: trip.departureAt,
        })
      }
      return rows
    },
  }
}
