import type { TripStatus } from '@/types/trip'

export type WarehouseCapabilities = {
  readonly deviation: boolean
  readonly scan: boolean
}

export type WarehouseTask = {
  readonly id: string
  readonly code: string
  readonly vehicleInfo: string
  readonly packageCount: number
  readonly departureAt?: string
  readonly status: TripStatus
  readonly inProgress: boolean
}

export type WarehousePlacement = {
  readonly id: string
  readonly packageName: string
  readonly barcode?: string
  readonly sequence: number
  readonly posX?: number
  readonly posY?: number
  readonly posZ?: number
  readonly confirmed: boolean
}

export type LoadingSession = {
  readonly tripId: string
  readonly tripCode: string
  readonly vehicleInfo: string
  readonly status: string
  readonly totalPackages: number
  readonly placements: readonly WarehousePlacement[]
  readonly nextId: string | null
}

export type LoadingComplete = {
  readonly tripId: string
  readonly tripCode: string
  readonly packageCount: number
  readonly deviationCount: number
}

export type DeviationInput = {
  readonly actualPosX: number
  readonly actualPosY: number
  readonly actualPosZ: number
  readonly reason: string
}

export type PackageLookup = {
  readonly id: string
  readonly code: string
  readonly status: string
  readonly destination: string
  readonly weightKg?: number
  readonly tripCode?: string
  readonly stopNumber?: number
  readonly stopName?: string
}
