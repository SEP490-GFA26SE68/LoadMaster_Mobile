import { getMockDb } from '@/data/mock-db'
import { ApiError } from '@/data/http'
import { isStale, latestApproved, tripStatus, type MockDb } from '@/lib/mock-db'

import type { WarehouseApi } from './warehouse-api'
import type { LoadingSession, PackageLookup, WarehousePlacement, WarehouseTask } from './warehouse-model'

export function mockWarehouseApi(db: () => MockDb = getMockDb): WarehouseApi {
  async function sessionOf(tripId: string): Promise<LoadingSession> {
    const trip = await db().getTrip(tripId)
    const plan = latestApproved(await db().listRevisions(tripId))
    const labels = await db().listTripLabels(tripId)
    const recorded = new Set(trip.loading?.steps.map((step) => step.packageInstanceId) ?? [])
    const placements: WarehousePlacement[] = (plan?.result.placements ?? [])
      .toSorted((a, b) => a.loadingOrder - b.loadingOrder)
      .map((item) => {
        const label = labels.find((entry) => entry.packageInstanceId === item.packageInstanceId)
        return {
          id: item.packageInstanceId,
          packageName: label?.name ?? item.packageInstanceId,
          barcode: label?.packageCode ?? label?.qrToken,
          sequence: item.loadingOrder,
          posX: Math.round(item.xCm),
          posY: Math.round(item.yCm),
          posZ: Math.round(item.zCm),
          confirmed: recorded.has(item.packageInstanceId),
        }
      })
    const vehicle = await db().getVehicle(trip.vehicleId)
    const next = placements.find((item) => !item.confirmed)
    return {
      tripId: trip.id,
      tripCode: trip.id,
      vehicleInfo: vehicle.name,
      status: trip.phase,
      totalPackages: placements.length,
      placements,
      nextId: next?.id ?? null,
    }
  }

  async function stageAll(tripId: string) {
    const labels = await db().listTripLabels(tripId)
    for (const label of labels) {
      await db().confirmStagingByQr(tripId, label.qrToken).catch(() => undefined)
    }
  }

  return {
    capabilities: { deviation: false, scan: true },

    async fetchTasks() {
      const trips = await db().listTrips()
      const tasks: WarehouseTask[] = []
      for (const trip of trips) {
        if (trip.phase !== 'planning' && trip.phase !== 'loading') continue
        const revisions = await db().listRevisions(trip.id)
        const approved = latestApproved(revisions)
        if (approved === undefined) continue
        if (trip.phase === 'planning' && isStale(approved, trip)) continue
        const vehicle = await db().getVehicle(trip.vehicleId)
        tasks.push({
          id: trip.id,
          code: trip.id,
          vehicleInfo: vehicle.name,
          packageCount: trip.packages.length,
          departureAt: trip.departureAt,
          status: tripStatus(trip),
          inProgress: trip.phase === 'loading',
        })
      }
      return tasks
    },

    async startLoading(tripId) {
      const trip = await db().getTrip(tripId)
      if (trip.phase === 'planning') await db().startLoading(tripId)
      await stageAll(tripId)
      return sessionOf(tripId)
    },

    fetchLoading: sessionOf,

    async confirmPlacement(tripId, placementId) {
      const labels = await db().listTripLabels(tripId)
      const label = labels.find((item) => item.packageInstanceId === placementId)
      if (label === undefined) throw new ApiError('PACKAGE_LOOKUP_UNKNOWN', { params: { code: placementId } })
      await db().confirmLoadingByQr(tripId, label.qrToken)
      return sessionOf(tripId)
    },

    async recordDeviation() {
      throw new ApiError('NOT_SUPPORTED')
    },

    async completeLoading(tripId) {
      const before = await sessionOf(tripId)
      const trip = await db().completeLoading(tripId)
      return { tripId: trip.id, tripCode: trip.id, packageCount: before.totalPackages, deviationCount: 0 }
    },

    async scanPackage(code) {
      const matches = await db().lookupPackages(code)
      const pkg = matches[0]
      if (pkg === undefined) throw new ApiError('PACKAGE_LOOKUP_UNKNOWN', { params: { code } })
      return {
        id: pkg.id,
        code: pkg.packageCode,
        status: pkg.status,
        destination: pkg.destination,
        weightKg: pkg.weightKg,
      } satisfies PackageLookup
    },
  }
}
