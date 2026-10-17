import { getMockDb } from '@/data/mock-db'
import { isActiveException, type MockDb } from '@/lib/mock-db'

import type { MonitoringApi } from './monitoring-api'
import type { BoardTrip, MonitoringDetail, MonitoringLocation } from './monitoring-model'

export function mockMonitoringApi(db: () => MockDb = getMockDb): MonitoringApi {
  function locationOf(point: { lat: number; lng: number; recordedAt: string } | null): MonitoringLocation | null {
    return point === null ? null : { lat: point.lat, lng: point.lng, recordedAt: point.recordedAt }
  }

  async function named(tripId: string) {
    const trip = await db().getTrip(tripId)
    const vehicle = await db().getVehicle(trip.vehicleId)
    const driver = trip.driverId === null ? undefined : await db().getUser(trip.driverId).catch(() => undefined)
    return { name: trip.name, vehicleName: vehicle.name, driverName: driver?.fullName ?? '' }
  }

  return {
    capabilities: { resolve: true, escalate: true, reroute: true },

    async fetchBoard() {
      const fleet = await db().listTripMonitoring()
      const rows: BoardTrip[] = []
      for (const item of fleet) {
        const head = await named(item.tripId)
        rows.push({
          tripId: item.tripId,
          name: head.name,
          vehicleName: head.vehicleName,
          driverName: head.driverName,
          location: locationOf(item.location),
          exceptionCount: item.exceptions.filter(isActiveException).length,
          refreshMs: item.refreshMs,
        })
      }
      return rows
    },

    async fetchTrip(tripId) {
      const item = await db().getTripMonitoring(tripId)
      return {
        tripId: item.tripId,
        location: locationOf(item.location),
        stops: item.stops.map((stop) => ({ id: stop.stopId, number: stop.number, eta: stop.eta, deadlineStatus: stop.deadlineStatus })),
        exceptions: item.exceptions.map((row) => ({
          id: row.id,
          type: row.type,
          description: row.description,
          delayMinutes: row.delayMinutes,
          status: row.status,
          reportedAt: row.reportedAt,
        })),
        refreshMs: item.refreshMs,
        isMockResult: item.isMockResult,
      } satisfies MonitoringDetail
    },

    async resolveException(tripId, exceptionId, input) {
      await db().resolveTripException(tripId, exceptionId, input?.note)
    },

    async escalateException(tripId, exceptionId) {
      await db().escalateTripException(tripId, exceptionId)
    },

    async proposeReroute(tripId) {
      const proposal = await db().requestReroute(tripId)
      return {
        tripId: proposal.tripId,
        stopNumber: proposal.stopNumber,
        isMockResult: true,
        options: proposal.options.map((option) => ({
          index: option.index,
          route: String(option.route),
          distanceKm: option.distanceKm,
          durationMinutes: option.durationMinutes,
          eta: option.eta,
        })),
      }
    },

    async confirmReroute(tripId, routeIndex) {
      await db().confirmReroute(tripId, routeIndex)
    },
  }
}
