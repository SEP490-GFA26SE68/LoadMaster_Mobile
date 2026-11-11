import type { DeliveryIssueKind } from '@/lib/mock-db'

import type { CurrentStopDto, RoutePlanDetailDto, StopPackageDto } from './driver-http-dto'
import { routeMapOf, vnInstant } from './driver-http-mapping'
import type { DriverTripStop, StopItem, StopPickupItem, StopScreen, VerifyVia } from './driver-model'

/*
 * Điểm đang giao của backend (`current-stop`) đổi sang màn điểm giao, theo `driver-dto.ts` + `driver-item-progress.ts` của web: tiến độ
 * từng kiện đọc từ máy chủ, adapter không tự giữ gì ngoài lần đọc gần nhất.
 */

type StopPackage = StopPackageDto & { readonly packageId: number }

/** Bỏ dòng backend trả không kèm kiện. */
const withId = (rows: readonly StopPackageDto[] | null | undefined): StopPackage[] =>
  (rows ?? []).flatMap((pkg) => (pkg.packageId === null ? [] : [{ ...pkg, packageId: pkg.packageId }]))

/** Điểm nhận dọc đường: việc ở đây là đối chiếu kiện nhận lên xe, không dỡ kiện nào. */
const isPickupStop = (dto: CurrentStopDto): boolean => dto.stopType === 'PICKUP'

/** Kiện nhận phải đối chiếu lên xe ở điểm này (chỉ điểm nhận có). */
const pickupPackagesOf = (dto: CurrentStopDto): StopPackage[] => (isPickupStop(dto) ? withId(dto.pickupPackages) : [])

/** Kiện đối chiếu được ở điểm: kiện cần dỡ và kiện nhận lên xe. */
const stopPackagesOf = (dto: CurrentStopDto): StopPackage[] => [...withId(dto.packages), ...pickupPackagesOf(dto)]

/** Mã so được: bỏ khoảng trắng hai đầu, không phân biệt hoa thường. */
const normalized = (value: string | null | undefined) => value?.trim().toUpperCase() ?? ''

/** Mã của bên gửi của kiện, khi chỉ kiện đó của điểm mang nó (nhập file không cấm hai kiện trùng mã của bên gửi). */
function uniqueSenderCode(pkg: StopPackage, packages: readonly StopPackage[]): string | undefined {
  const code = normalized(pkg.packageCode)
  if (code === '') return undefined
  return packages.filter((other) => normalized(other.packageCode) === code).length === 1 ? pkg.packageCode?.trim() : undefined
}

/** Mã đứng đầu dòng kiện: mã của bên gửi khi nó duy nhất trong điểm; không thì mã vạch; không có mã vạch thì mã của kho kiện. */
const labelOf = (pkg: StopPackage, packages: readonly StopPackage[]) =>
  uniqueSenderCode(pkg, packages) ?? (pkg.trackingBarcode?.trim() || String(pkg.packageId))

/** Kiện của điểm ứng với mã tài xế quét hoặc gõ. `ambiguous`: mã khớp `count` kiện của điểm — không biết là kiện nào. */
export type StopCodeMatch =
  | { readonly kind: 'matched'; readonly packageId: number; readonly label: string; readonly pickup: boolean }
  | { readonly kind: 'ambiguous'; readonly count: number }
  | { readonly kind: 'unknown' }

function matchOf(dto: CurrentStopDto, found: readonly StopPackage[], packages: readonly StopPackage[]): StopCodeMatch | undefined {
  const [only] = found
  if (only === undefined) return undefined
  if (found.length > 1) return { kind: 'ambiguous', count: found.length }
  return { kind: 'matched', packageId: only.packageId, label: labelOf(only, packages), pickup: isPickupPackage(dto, only.packageId) }
}

/**
 * Kiện của điểm ứng với mã quét hoặc gõ (bỏ khoảng trắng hai đầu, không phân biệt hoa thường), như web: trước hết các mã riêng của một
 * kiện — mã QR, mã vạch, mã của kho kiện —; không khớp thì mã của bên gửi, chỉ nhận khi đúng một kiện của điểm mang nó.
 */
export function packageOfCode(dto: CurrentStopDto, code: string): StopCodeMatch {
  const wanted = normalized(code)
  if (wanted === '') return { kind: 'unknown' }
  const packages = stopPackagesOf(dto)
  const byOwnCode = packages.filter((pkg) => [pkg.qrToken, pkg.trackingBarcode, String(pkg.packageId)].some((value) => normalized(value) === wanted))
  const bySenderCode = packages.filter((pkg) => normalized(pkg.packageCode) === wanted)
  return matchOf(dto, byOwnCode, packages) ?? matchOf(dto, bySenderCode, packages) ?? { kind: 'unknown' }
}

/** Kiện cần dỡ `itemId` của điểm (mã nguồn trên màn), kèm mã in trên nhãn; vắng khi kiện không còn ở điểm theo lần đọc gần nhất. */
export function deliveryPackageOf(dto: CurrentStopDto, itemId: string): { readonly packageId: number; readonly label: string } | undefined {
  const packages = stopPackagesOf(dto)
  const pkg = withId(dto.packages).find((entry) => String(entry.packageId) === itemId)
  return pkg === undefined ? undefined : { packageId: pkg.packageId, label: labelOf(pkg, packages) }
}

/** Kiện `packageId` là kiện nhận phải đối chiếu lên xe ở điểm nhận này (không phải kiện cần dỡ). */
export function isPickupPackage(dto: CurrentStopDto, packageId: number): boolean {
  return pickupPackagesOf(dto).some((pkg) => pkg.packageId === packageId)
}

/** Kiện `packageId` của điểm đã xong theo lần đọc gần nhất của máy chủ: đã dỡ, hoặc — kiện nhận ở điểm nhận — đã lên xe. */
export function isUnloaded(dto: CurrentStopDto, packageId: number): boolean {
  return (
    (dto.packages ?? []).some((pkg) => pkg.packageId === packageId && pkg.unloaded === true) ||
    pickupPackagesOf(dto).some((pkg) => pkg.packageId === packageId && pkg.picked === true)
  )
}

/** Điểm sau khi máy chủ nhận lệnh dỡ (hoặc nhận lên xe) kiện `packageId` — giữ tới lần đọc lại kế tiếp. */
export function withUnloaded(dto: CurrentStopDto, packageId: number): CurrentStopDto {
  return {
    ...dto,
    packages: (dto.packages ?? []).map((pkg) => (pkg.packageId === packageId ? { ...pkg, unloaded: true } : pkg)),
    pickupPackages: (dto.pickupPackages ?? []).map((pkg) => (pkg.packageId === packageId ? { ...pkg, picked: true } : pkg)),
  }
}

const ISSUE_KINDS: Readonly<Record<string, DeliveryIssueKind>> = { DAMAGED: 'damaged', MISSING: 'missing', REFUSED: 'refused', OTHER: 'other' }

/**
 * Một kiện cần dỡ theo máy chủ (như `itemProgressOf` của web): sự cố mới nhất (khách từ chối mà kiện chưa dỡ thì kiện ở lại xe — hoàn
 * trả); xác nhận tay chờ / đã duyệt làm cách đối chiếu của kiện đã dỡ; bị từ chối và kiện về chưa dỡ thì lý do phải kiểm lại. Máy chủ
 * không trả kiện đã dỡ bằng quét hay gõ mã: cách đối chiếu để trống.
 */
function itemOf(pkg: StopPackage, index: number, packages: readonly StopPackage[]): StopItem {
  const id = String(pkg.packageId)
  const label = labelOf(pkg, packages)
  const unloaded = pkg.unloaded === true
  const issueKind = pkg.issueKind ? ISSUE_KINDS[pkg.issueKind] : undefined
  const via: VerifyVia | undefined =
    unloaded && pkg.manualStatus === 'PENDING' ? 'MANUAL_PENDING' : unloaded && pkg.manualStatus === 'APPROVED' ? 'MANUAL_APPROVED' : undefined
  return {
    id,
    label,
    name: pkg.packageName ?? label,
    weightKg: pkg.weight ?? undefined,
    unloadingOrder: pkg.unloadOrder ?? index + 1,
    place: undefined,
    unloaded,
    via,
    rejectedReason: !unloaded && pkg.manualStatus === 'REJECTED' ? (pkg.manualRejectReason ?? '') : undefined,
    issueKind,
    returned: !unloaded && issueKind === 'refused',
  }
}

/** Kiện nhận của điểm nhận: tên là tên kiện hoặc mã của bên gửi, xong khi đã lên xe. */
function pickupItemOf(pkg: StopPackage, packages: readonly StopPackage[]): StopPickupItem {
  const label = labelOf(pkg, packages)
  return {
    id: String(pkg.packageId),
    label,
    name: pkg.packageName ?? pkg.packageCode ?? label,
    weightKg: pkg.weight ?? undefined,
    requestId: pkg.pickupRequestId === null || pkg.pickupRequestId === undefined ? '' : String(pkg.pickupRequestId),
    role: 'pick',
    done: pkg.picked === true,
    via: undefined,
    rejectedReason: undefined,
  }
}

/**
 * Màn điểm giao từ điểm hiện tại của backend: giờ đến và tiến độ từng kiện (đã dỡ, sự cố, xác nhận tay, đã nhận lên xe) đọc từ máy chủ, nên
 * mở lại app hay đổi máy vẫn đúng. Chỉ giờ đến máy chủ ghi khi bấm "Đã đến" mới là đã đến. Chỉ biết điểm hiện tại nên các điểm khác của dải
 * tiến độ chỉ có số và đã xong hay chưa (backend hoàn tất điểm theo thứ tự), và không biết điểm kế tiếp. Toạ độ lấy từ plan active khi có.
 */
export function stopScreenOf(dto: CurrentStopDto, tripStopCount: number, plan: RoutePlanDetailDto | null = null): StopScreen {
  const number = dto.stopSequence
  const name = dto.stopName ?? ''
  const kind = isPickupStop(dto) ? 'PICKUP' : 'DELIVERY'
  const packages = stopPackagesOf(dto)
  const items = withId(dto.packages).map((pkg, index) => itemOf(pkg, index, packages))
  const pickupItems = pickupPackagesOf(dto).map((pkg) => pickupItemOf(pkg, packages))
  const pickupWaiting = pickupItems.filter((item) => !item.done).length
  const picked = pickupItems.length - pickupWaiting
  const delivered = items.filter((item) => item.unloaded).length
  const issueCount = items.filter((item) => item.issueKind !== undefined).length
  // Kiện chưa dỡ mà đã báo sự cố không phải dỡ (máy chủ hoàn tất điểm thì kiện đó là hoàn trả)
  const remaining = items.filter((item) => !item.unloaded && item.issueKind === undefined).length + pickupWaiting
  const verifiable = items.filter((item) => !item.unloaded && !item.returned).length + pickupWaiting
  const pendingConfirms = items.filter((item) => item.via === 'MANUAL_PENDING').length
  const arrivedAt = vnInstant(dto.actualArrival)
  const stopCount = Math.max(tripStopCount, number)
  const stops = Array.from({ length: stopCount }, (_, index): DriverTripStop => {
    const current = index + 1 === number
    return {
      number: index + 1,
      name: current ? name : '',
      kind: current ? kind : 'DELIVERY',
      packageCount: current && kind === 'DELIVERY' ? items.length : undefined,
      done: index + 1 < number,
      timing: undefined,
    }
  })
  const routeMap = routeMapOf(plan, { number, name })
  const here = routeMap?.stops.find((stop) => stop.number === number)
  return {
    mode: 'delivering',
    stop: {
      number,
      ref: String(dto.stopId),
      name,
      address: dto.address ?? '',
      phone: undefined,
      contactName: undefined,
      kind,
      lat: here?.lat,
      lng: here?.lng,
    },
    stops,
    stopCount,
    arrived: arrivedAt !== undefined,
    arrivedAt,
    timing: undefined,
    items,
    pickupItems,
    leftAtWarehouse: 0,
    total: items.length + pickupItems.length,
    doneCount: delivered + picked,
    issueCount,
    remaining,
    verifiable,
    pendingConfirms,
    completion: {
      delivered,
      returned: items.filter((item) => !item.unloaded).map(({ id, label, name: itemName }) => ({ id, label, name: itemName })),
      picked,
      issues: issueCount,
      next: undefined,
      nextKnown: false,
    },
    names: Object.fromEntries([...items, ...pickupItems].map((item) => [item.id, item.name])),
    hasPickupStops: false,
    refreshMs: null,
    routeMap,
  }
}
