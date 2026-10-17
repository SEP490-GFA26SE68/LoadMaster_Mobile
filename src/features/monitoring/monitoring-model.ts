import type { TripExceptionStatus, TripExceptionType } from '@/lib/mock-db'

export type MonitoringCapabilities = {
  readonly resolve: boolean
  readonly escalate: boolean
  readonly reroute: boolean
}

export type MonitoringLocation = {
  readonly lat: number
  readonly lng: number
  readonly recordedAt?: string
}

export type BoardTrip = {
  readonly tripId: string
  readonly name: string
  readonly vehicleName: string
  readonly driverName: string
  readonly location: MonitoringLocation | null
  readonly exceptionCount: number
  readonly refreshMs: number | null
}

export type LiveStop = {
  readonly id: string
  readonly number: number
  readonly eta?: string
  readonly deadlineStatus?: string
}

export type TripExceptionRow = {
  readonly id: string
  readonly type: TripExceptionType | string
  readonly description: string
  readonly delayMinutes: number
  readonly status: TripExceptionStatus | string
  readonly reportedAt?: string
}

export type RerouteChoice = {
  readonly index: number
  readonly route: string
  readonly distanceKm: number
  readonly durationMinutes: number
  readonly eta?: string
}

export type RerouteProposal = {
  readonly tripId: string
  readonly stopNumber?: number
  readonly options: readonly RerouteChoice[]
  readonly isMockResult: boolean
}

export type MonitoringDetail = {
  readonly tripId: string
  readonly location: MonitoringLocation | null
  readonly stops: readonly LiveStop[]
  readonly exceptions: readonly TripExceptionRow[]
  readonly refreshMs: number | null
  readonly isMockResult: boolean
}

export type ResolveInput = { readonly note?: string }
