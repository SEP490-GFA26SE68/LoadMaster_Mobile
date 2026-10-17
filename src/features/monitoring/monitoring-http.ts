import { api, type ApiClient } from '@/data/http'

import type { MonitoringApi } from './monitoring-api'
import type { BoardTrip, LiveStop, MonitoringDetail, MonitoringLocation, RerouteProposal, TripExceptionRow } from './monitoring-model'

type LocationDto = { readonly lat: number | null; readonly lng: number | null; readonly recordedAt: string | null }

type ExceptionDto = {
  readonly id: string
  readonly type: string
  readonly description: string | null
  readonly delayMinutes: number | null
  readonly status: string
  readonly reportedAt: string | null
}

type StopDto = { readonly stopId: string | null; readonly number: number | null; readonly eta: string | null; readonly deadlineStatus: string | null }

type FleetDto = {
  readonly tripId: string
  readonly location: LocationDto | null
  readonly stops: readonly StopDto[] | null
  readonly exceptions: readonly ExceptionDto[] | null
  readonly refreshMs: number | null
  readonly isMockResult: boolean | null
}

type BoardDto = {
  readonly trips: readonly {
    readonly tripId: string
    readonly name: string | null
    readonly vehicleName: string | null
    readonly driverName: string | null
  }[] | null
}

type OptionDto = {
  readonly index: number | null
  readonly route: string | null
  readonly distanceKm: number | null
  readonly durationMinutes: number | null
  readonly eta: string | null
}

type ProposalDto = {
  readonly tripId: string
  readonly stopNumber: number | null
  readonly options: readonly OptionDto[] | null
  readonly isMockResult: boolean | null
}

type HttpDeps = { readonly client?: () => ApiClient }

function locationOf(dto: LocationDto | null): MonitoringLocation | null {
  if (dto === null || dto.lat === null || dto.lng === null) return null
  return { lat: dto.lat, lng: dto.lng, recordedAt: dto.recordedAt ?? undefined }
}

function exceptionOf(dto: ExceptionDto): TripExceptionRow {
  return {
    id: dto.id,
    type: dto.type,
    description: dto.description ?? '',
    delayMinutes: dto.delayMinutes ?? 0,
    status: dto.status,
    reportedAt: dto.reportedAt ?? undefined,
  }
}

function stopOf(dto: StopDto): LiveStop {
  return {
    id: dto.stopId ?? String(dto.number ?? ''),
    number: dto.number ?? 0,
    eta: dto.eta ?? undefined,
    deadlineStatus: dto.deadlineStatus ?? undefined,
  }
}

function detailOf(dto: FleetDto): MonitoringDetail {
  return {
    tripId: dto.tripId,
    location: locationOf(dto.location),
    stops: (dto.stops ?? []).map(stopOf),
    exceptions: (dto.exceptions ?? []).map(exceptionOf),
    refreshMs: dto.refreshMs,
    isMockResult: dto.isMockResult === true,
  }
}

export function httpMonitoringApi({ client = api }: HttpDeps = {}): MonitoringApi {
  return {
    capabilities: { resolve: true, escalate: true, reroute: true },

    async fetchBoard() {
      const [fleet, board] = await Promise.all([
        client().get<readonly FleetDto[] | null>('/api/trips/monitoring'),
        client()
          .get<BoardDto>('/api/dispatcher/dashboard')
          .catch(() => ({ trips: [] })),
      ])
      const names = new Map((board.trips ?? []).map((trip) => [trip.tripId, trip]))
      return (fleet ?? []).map((row): BoardTrip => {
        const named = names.get(row.tripId)
        const open = (row.exceptions ?? []).filter((item) => item.status !== 'RESOLVED').length
        return {
          tripId: row.tripId,
          name: named?.name ?? row.tripId,
          vehicleName: named?.vehicleName ?? '',
          driverName: named?.driverName ?? '',
          location: locationOf(row.location),
          exceptionCount: open,
          refreshMs: row.refreshMs,
        }
      })
    },

    async fetchTrip(tripId) {
      const dto = await client().get<FleetDto>(`/api/trips/${encodeURIComponent(tripId)}/monitoring`)
      return detailOf(dto)
    },

    async resolveException(tripId, exceptionId, input) {
      await client().post(`/api/trips/${encodeURIComponent(tripId)}/exceptions/${encodeURIComponent(exceptionId)}/resolve`, {
        body: { note: input?.note },
      })
    },

    async escalateException(tripId, exceptionId) {
      await client().post(`/api/trips/${encodeURIComponent(tripId)}/exceptions/${encodeURIComponent(exceptionId)}/escalate`)
    },

    async proposeReroute(tripId) {
      const dto = await client().post<ProposalDto>(`/api/trips/${encodeURIComponent(tripId)}/reroute`)
      return {
        tripId: dto.tripId,
        stopNumber: dto.stopNumber ?? undefined,
        isMockResult: dto.isMockResult === true,
        options: (dto.options ?? []).map(
          (option): RerouteProposal['options'][number] => ({
            index: option.index ?? 0,
            route: option.route ?? '',
            distanceKm: option.distanceKm ?? 0,
            durationMinutes: option.durationMinutes ?? 0,
            eta: option.eta ?? undefined,
          }),
        ),
      }
    },

    async confirmReroute(tripId, routeIndex) {
      await client().post(`/api/trips/${encodeURIComponent(tripId)}/reroute/${routeIndex}/confirm`)
    },
  }
}
