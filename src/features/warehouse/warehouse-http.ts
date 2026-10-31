import { api, ApiError, currentUserId, isApiError, type ApiClient } from '@/data/http'
import { TRIP_STATUSES, type TripStatus } from '@/types/trip'

import type { WarehouseApi } from './warehouse-api'
import type { LoadingSession, PackageLookup, WarehousePlacement, WarehouseTask } from './warehouse-model'

type TaskDto = {
  readonly tripId: number
  readonly tripCode: string | null
  readonly vehicleInfo: string | null
  readonly totalPackages: number | null
  readonly departureTime: string | null
  readonly status: string | null
}

type PlacementDto = {
  readonly placementId: number
  readonly packageName: string | null
  readonly trackingBarcode: string | null
  readonly posX: number | null
  readonly posY: number | null
  readonly posZ: number | null
  readonly sequence: number | null
}

type StartDto = {
  readonly tripId: number
  readonly tripCode: string | null
  readonly vehicleInfo: string | null
  readonly totalPackages: number | null
  readonly status: string | null
  readonly placements: readonly PlacementDto[] | null
}

type ConfirmDto = { readonly nextPlacement: PlacementDto | null }
type DeviationDto = { readonly nextPlacement: PlacementDto | null }
type CompleteDto = {
  readonly tripId: number
  readonly tripCode: string | null
  readonly totalPackages: number | null
  readonly totalDeviations: number | null
}

type ScanDto = {
  readonly id: number
  readonly packageCode: string | null
  readonly status: string | null
  readonly destination: string | null
  readonly actualWeightKg: number | null
  readonly trip: { readonly name: string | null } | null
  readonly stop: { readonly number: number | null; readonly name: string | null } | null
}

type HttpDeps = { readonly client?: () => ApiClient; readonly userId?: () => string | null }

const uncoded = (error: unknown, status: number) => isApiError(error) && error.status === status && error.code === 'SERVER_ERROR'

const tripStatusOf = (value: string | null): TripStatus => TRIP_STATUSES.find((status) => status === value) ?? 'PLANNED'

function placementOf(dto: PlacementDto, confirmed: boolean): WarehousePlacement {
  return {
    id: String(dto.placementId),
    packageName: dto.packageName ?? String(dto.placementId),
    barcode: dto.trackingBarcode ?? undefined,
    sequence: dto.sequence ?? 0,
    posX: dto.posX ?? undefined,
    posY: dto.posY ?? undefined,
    posZ: dto.posZ ?? undefined,
    confirmed,
  }
}

function sessionOf(dto: StartDto, confirmed = new Set<string>()): LoadingSession {
  const placements = (dto.placements ?? []).map((item) => placementOf(item, confirmed.has(String(item.placementId))))
  const next = placements.find((item) => !item.confirmed)
  return {
    tripId: String(dto.tripId),
    tripCode: dto.tripCode ?? String(dto.tripId),
    vehicleInfo: dto.vehicleInfo ?? '',
    status: dto.status ?? 'IN_PROGRESS',
    totalPackages: dto.totalPackages ?? placements.length,
    placements,
    nextId: next?.id ?? null,
  }
}

function applyNext(session: LoadingSession, placementId: string, next: PlacementDto | null): LoadingSession {
  const placements = session.placements.map((item) => (item.id === placementId ? { ...item, confirmed: true } : item))
  const extra = next === null || placements.some((item) => item.id === String(next.placementId)) ? [] : [placementOf(next, false)]
  const all = [...placements, ...extra]
  return { ...session, placements: all, nextId: next === null ? null : String(next.placementId) }
}

export function httpWarehouseApi({ client = api, userId = currentUserId }: HttpDeps = {}): WarehouseApi {
  const sessions = new Map<string, LoadingSession>()

  function workerId(): string {
    const id = userId()
    if (id === null) throw new ApiError('UNAUTHENTICATED')
    return id
  }

  return {
    capabilities: { deviation: true, scan: true },

    async fetchTasks() {
      const dtos = await client().get<readonly TaskDto[] | null>('/api/warehouse/tasks', { query: { workerId: workerId() } })
      return (dtos ?? []).map(
        (dto): WarehouseTask => ({
          id: String(dto.tripId),
          code: dto.tripCode ?? String(dto.tripId),
          vehicleInfo: dto.vehicleInfo ?? '',
          packageCount: dto.totalPackages ?? 0,
          departureAt: dto.departureTime ?? undefined,
          status: tripStatusOf(dto.status),
          inProgress: false,
        }),
      )
    },

    async startLoading(tripId) {
      const dto = await client().post<StartDto>(`/api/warehouse/tasks/${encodeURIComponent(tripId)}/start`, {
        body: { workerId: Number(workerId()) },
      })
      const session = sessionOf(dto)
      sessions.set(tripId, session)
      return session
    },

    async fetchLoading(tripId) {
      const session = sessions.get(tripId)
      if (session === undefined) throw new ApiError('LOADING_NOT_STARTED', { params: { tripId } })
      return session
    },

    async confirmPlacement(tripId, placementId) {
      const current = sessions.get(tripId)
      if (current === undefined) throw new ApiError('LOADING_NOT_STARTED', { params: { tripId } })
      try {
        const dto = await client().post<ConfirmDto>(`/api/warehouse/placements/${encodeURIComponent(placementId)}/confirm`, {
          query: { workerId: workerId() },
        })
        const next = applyNext(current, placementId, dto.nextPlacement)
        sessions.set(tripId, next)
        return next
      } catch (error) {
        if (uncoded(error, 400) || uncoded(error, 409)) throw new ApiError('PLACEMENT_ALREADY_CONFIRMED', { status: isApiError(error) ? error.status : 400 })
        throw error
      }
    },

    async recordDeviation(tripId, placementId, input) {
      const current = sessions.get(tripId)
      if (current === undefined) throw new ApiError('LOADING_NOT_STARTED', { params: { tripId } })
      const dto = await client().post<DeviationDto>(`/api/warehouse/placements/${encodeURIComponent(placementId)}/deviation`, {
        body: { ...input, reportedBy: Number(workerId()) },
      })
      const next = applyNext(current, placementId, dto.nextPlacement)
      sessions.set(tripId, next)
      return next
    },

    async completeLoading(tripId) {
      const dto = await client().post<CompleteDto>(`/api/warehouse/tasks/${encodeURIComponent(tripId)}/complete`)
      sessions.delete(tripId)
      return {
        tripId: String(dto.tripId),
        tripCode: dto.tripCode ?? tripId,
        packageCount: dto.totalPackages ?? 0,
        deviationCount: dto.totalDeviations ?? 0,
      }
    },

    async scanPackage(code) {
      try {
        const dto = await client().get<ScanDto>(`/api/packages/scan/${encodeURIComponent(code.trim())}`)
        return {
          id: String(dto.id),
          code: dto.packageCode ?? String(dto.id),
          status: dto.status ?? '',
          destination: dto.destination ?? '',
          weightKg: dto.actualWeightKg ?? undefined,
          tripCode: dto.trip?.name ?? undefined,
          stopNumber: dto.stop?.number ?? undefined,
          stopName: dto.stop?.name ?? undefined,
        } satisfies PackageLookup
      } catch (error) {
        if (uncoded(error, 404)) throw new ApiError('PACKAGE_LOOKUP_UNKNOWN', { status: 404, params: { code } })
        throw error
      }
    },
  }
}
