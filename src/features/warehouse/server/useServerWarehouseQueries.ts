import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { lookupKeys } from '@/features/lookup/useLookupQueries'

import {
  completeServerLoading,
  confirmServerPlacement,
  confirmServerPlacementManually,
  fetchServerSession,
  fetchServerTasks,
  recordServerDeviation,
  recordServerSeal,
  reportServerDamaged,
  reportServerShortage,
  stageServerPackage,
  stageServerPackageManually,
  startServerLoading,
} from '../warehouse-server-api'
import type { DeviationInput, ServerLoadingSession, ServerManualInput } from '../warehouse-server-model'

/** Khoá truy vấn của màn kho bản máy chủ, dưới `['warehouse']` như bản kho mẫu (cache xoá sạch lúc đăng nhập, đăng xuất). */
export const serverWarehouseKeys = {
  trips: ['warehouse', 'server', 'trips'] as const,
  session: (tripId: string) => ['warehouse', 'server', 'session', tripId] as const,
}

/** Danh sách chuyến của kho; `staleTime: 0` — điều phối viên vừa duyệt ở máy khác thì mở lại màn là thấy. */
export function useServerWarehouseTrips() {
  return useQuery({ queryKey: serverWarehouseKeys.trips, queryFn: fetchServerTasks, staleTime: 0 })
}

/** Phiên xếp của chuyến, đọc lại từ máy chủ ở thiết bị nào cũng được; `retry: false` — chuyến không còn đang xếp thì đọc lại vẫn vậy. */
export function useServerSession(tripId: string) {
  return useQuery({ queryKey: serverWarehouseKeys.session(tripId), queryFn: () => fetchServerSession(tripId), staleTime: 0, retry: false })
}

/**
 * Sau một lệnh ghi: phiên máy chủ trả về đặt thẳng vào cache (không phải đọc lại); danh sách chuyến và kết quả tra cứu kiện (trạng thái,
 * cờ của kiện vừa đổi) đọc lại sau, không bắt người xếp chờ. Không có phiên (kiện hỏng đưa chuyến về lập kế hoạch) thì đọc lại phiên để màn
 * nói chuyến không còn ở kho — cũng không chờ: lệnh xong ngay để màn kịp giữ câu kết quả trước khi phiên biến mất.
 */
function settle(client: QueryClient, tripId: string, session: ServerLoadingSession | undefined) {
  if (session === undefined) void client.invalidateQueries({ queryKey: serverWarehouseKeys.session(tripId) })
  else client.setQueryData(serverWarehouseKeys.session(tripId), session)
  void client.invalidateQueries({ queryKey: serverWarehouseKeys.trips })
  void client.invalidateQueries({ queryKey: lookupKeys.all })
}

/**
 * Một lệnh ghi của kho. Máy chủ từ chối (máy khác vừa ghi trước, chuyến vừa đổi pha) thì đọc lại phiên để màn theo đúng điều máy chủ đang
 * giữ; câu lỗi do màn hiện.
 */
function useWrite<Input, Result>(tripId: string, write: (input: Input) => Promise<Result>, sessionOf: (result: Result) => ServerLoadingSession | undefined) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: write,
    onSuccess: (result) => settle(client, tripId, sessionOf(result)),
    onError: () => void client.invalidateQueries({ queryKey: serverWarehouseKeys.session(tripId) }),
  })
}

const itself = (session: ServerLoadingSession) => session

/** Bắt đầu phiên (kèm bước soạn hàng); đã bắt đầu ở máy khác thì mở lại phiên đó. */
export function useStartServerLoading(tripId: string) {
  return useWrite(tripId, () => startServerLoading(tripId), itself)
}

/** Soạn một kiện bằng nhãn (quét hoặc gõ mã). */
export function useStageServerPackage(tripId: string) {
  return useWrite(
    tripId,
    ({ packageId, method }: { packageId: string; method: 'QR' | 'CODE' }) => stageServerPackage(tripId, packageId, method),
    (result) => result.session,
  )
}

export function useStageServerPackageManually(tripId: string) {
  return useWrite(
    tripId,
    ({ packageId, input }: { packageId: string; input: ServerManualInput }) => stageServerPackageManually(tripId, packageId, input),
    itself,
  )
}

export function useReportServerShortage(tripId: string) {
  return useWrite(tripId, (packageId: string) => reportServerShortage(tripId, packageId), itself)
}

export function useConfirmServerPlacement(tripId: string) {
  return useWrite(tripId, (placementId: string) => confirmServerPlacement(tripId, placementId), itself)
}

export function useConfirmServerPlacementManually(tripId: string) {
  return useWrite(
    tripId,
    ({ placementId, input }: { placementId: string; input: ServerManualInput }) => confirmServerPlacementManually(tripId, placementId, input),
    itself,
  )
}

export function useRecordServerDeviation(tripId: string) {
  return useWrite(
    tripId,
    ({ placementId, input }: { placementId: string; input: DeviationInput }) => recordServerDeviation(tripId, placementId, input),
    itself,
  )
}

/** Kiện hỏng: chuyến về Đã lập kế hoạch thì không còn phiên — đọc lại phiên để màn nói điều đó. */
export function useReportServerDamaged(tripId: string) {
  return useWrite(tripId, (placementId: string) => reportServerDamaged(tripId, placementId), (result) =>
    result.outcome === 'leftOut' ? result.session : undefined,
  )
}

export function useCompleteServerLoading(tripId: string) {
  return useWrite(tripId, () => completeServerLoading(tripId), itself)
}

export function useRecordServerSeal(tripId: string) {
  return useWrite(tripId, (sealNumber: string) => recordServerSeal(tripId, sealNumber), itself)
}
