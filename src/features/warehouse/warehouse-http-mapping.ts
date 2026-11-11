import { ApiError } from '@/data/http'
import { isoFromBackend } from '@/lib/office-backend'

import type { PlacementStepDto, StartLoadingDto, WarehouseTaskDto } from './warehouse-http-dto'
import type {
  PlacementOutcome,
  ServerCargoBox,
  ServerLoadingSession,
  ServerManualState,
  ServerPlacement,
  ServerSeal,
  ServerStagingState,
  ServerWarehouseStage,
  ServerWarehouseTrip,
} from './warehouse-server-model'

/*
 * DTO của máy chủ → kiểu màn kho (như `taskOf`, `placementOf`, `sessionOf` của `warehouse-dto.ts` web). Số bắt buộc (vị trí, kích thước,
 * thứ tự xếp) mà máy chủ không trả là lỗi của máy chủ, không điền 0.
 */

const numberOf = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ApiError('SERVER_ERROR')
  return value
}

const finiteOrNull = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null)

const positive = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0

const text = (value: string | null | undefined) => value?.trim() || null

function stageOf(dto: WarehouseTaskDto): ServerWarehouseStage {
  if (dto.awaitingReplan === true) return 'stale'
  if (dto.status !== 'LOADING') return 'waiting'
  return dto.executionStatus === 'COMPLETED' ? 'loaded' : 'loading'
}

function replanOf(dto: WarehouseTaskDto): ServerWarehouseTrip['replanReason'] {
  if (dto.awaitingReplan !== true) return null
  if (dto.replanReason === 'STAGING_SHORTAGE') return 'shortage'
  return dto.replanReason === 'DAMAGED_PACKAGE' ? 'damaged' : null
}

export function taskOf(dto: WarehouseTaskDto): ServerWarehouseTrip {
  const id = String(dto.tripId)
  return {
    id,
    code: text(dto.tripCode) ?? id,
    vehicle: text(dto.vehicleInfo) ?? '',
    departureAt: dto.departureTime ? isoFromBackend(dto.departureTime) : null,
    packageCount: finiteOrNull(dto.totalPackages),
    stage: stageOf(dto),
    status: dto.status === 'LOADING' ? 'LOADING' : dto.status === 'DRAFT' ? 'DRAFT' : 'PLANNED',
    replanReason: replanOf(dto),
  }
}

export function placementOf(dto: PlacementStepDto): ServerPlacement {
  const barcode = text(dto.trackingBarcode)
  const packageId = dto.packageId === null ? null : String(dto.packageId)
  return {
    id: String(dto.placementId),
    packageId,
    name: text(dto.packageName) ?? barcode ?? packageId ?? String(dto.placementId),
    barcode,
    packageCode: text(dto.packageCode),
    qrToken: text(dto.qrToken),
    x: numberOf(dto.posX),
    y: numberOf(dto.posY),
    z: numberOf(dto.posZ),
    lengthCm: numberOf(dto.packedLength),
    widthCm: numberOf(dto.packedWidth),
    heightCm: numberOf(dto.packedHeight),
    weightKg: finiteOrNull(dto.weightKg),
    sequence: numberOf(dto.sequence),
    stopSequence: typeof dto.stopSequence === 'number' ? dto.stopSequence : null,
    stopName: text(dto.stopName),
  }
}

function boxOf(dto: StartLoadingDto): ServerCargoBox | null {
  const { innerLength, innerWidth, innerHeight } = dto
  if (!positive(innerLength) || !positive(innerWidth) || !positive(innerHeight)) return null
  return { innerLengthCm: innerLength, innerWidthCm: innerWidth, innerHeightCm: innerHeight }
}

const OUTCOMES: Readonly<Record<string, PlacementOutcome>> = { CONFIRMED: 'confirmed', DEVIATION: 'deviation', DAMAGED: 'damaged' }
const MANUAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
const MANUAL_STEPS = ['STAGING', 'LOADING'] as const

function manualOf(dto: PlacementStepDto): ServerManualState | null {
  const status = MANUAL_STATUSES.find((value) => value === dto.manualStatus)
  const step = MANUAL_STEPS.find((value) => value === dto.manualStep)
  if (status === undefined || step === undefined) return null
  return { status, step, rejectReason: text(dto.manualRejectReason) }
}

function stagingOf(dto: PlacementStepDto): ServerStagingState {
  const shortage = dto.shortageStatus === 'OPEN' ? 'open' : dto.shortageStatus === 'KEEP_SEARCHING' ? 'keepSearching' : null
  return { staged: dto.staged === true, shortage, manual: manualOf(dto) }
}

function sealOf(dto: StartLoadingDto): ServerSeal | null {
  const number = text(dto.sealNumber)
  if (number === null) return null
  return { number, at: dto.sealedAt ? isoFromBackend(dto.sealedAt) : null, byName: text(dto.sealedByName) }
}

export function sessionOf(dto: StartLoadingDto): ServerLoadingSession {
  const id = String(dto.tripId)
  const steps = (dto.placements ?? []).map((step) => ({ status: step.status, placement: placementOf(step), staging: stagingOf(step) }))
  const stagingRequired = dto.stagingRequired === true
  return {
    tripId: id,
    code: text(dto.tripCode) ?? id,
    vehicle: text(dto.vehicleInfo) ?? text(dto.licensePlate) ?? '',
    box: boxOf(dto),
    placements: steps.map((item) => item.placement).sort((a, b) => a.sequence - b.sequence),
    outcomes: Object.fromEntries(
      steps.flatMap(({ status, placement }) => {
        const outcome = status ? OUTCOMES[status] : undefined
        return outcome === undefined ? [] : [[placement.id, outcome] as const]
      }),
    ),
    staging: Object.fromEntries(steps.map((item) => [item.placement.id, item.staging] as const)),
    stagingRequired,
    stagingComplete: !stagingRequired || dto.stagingComplete === true,
    pendingManual:
      typeof dto.pendingManualCount === 'number' ? dto.pendingManualCount : steps.filter((item) => item.staging.manual?.status === 'PENDING').length,
    seal: sealOf(dto),
    completed: dto.status === 'COMPLETED',
  }
}
