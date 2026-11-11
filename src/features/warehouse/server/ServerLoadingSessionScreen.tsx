import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Screen } from '@/components/Screen'
import { LoadingState } from '@/components/StateView'
import { isApiError } from '@/data/http'
import { dataErrorMessage, useT } from '@/lib/i18n'

import { SessionExitButton } from '../SessionExitButton'
import { WarehouseNotice } from '../WarehouseNotice'
import type { ServerWarehouseTrip } from '../warehouse-server-model'
import { ServerFinishedView } from './ServerFinishedView'
import { ServerLoadingView, type SessionNotice } from './ServerLoadingView'
import { ServerStagingView } from './ServerStagingView'
import { serverWarehouseKeys, useServerSession } from './useServerWarehouseQueries'

/** Phiên không còn để mở: chuyến không ở Đang xếp hàng (xe đã rời kho, chuyến quay về lập kế hoạch), hoặc máy chủ không thấy phiên xếp. */
const UNAVAILABLE_CODES = new Set(['TRIP_NOT_LOADING', 'LOADING_EXECUTION_NOT_FOUND'])

const unavailable = (error: unknown) => isApiError(error) && UNAVAILABLE_CODES.has(error.code)

/**
 * Phiên soạn → xếp một chuyến khi nguồn `warehouse` là máy chủ (như `ServerLoadingSession` của web): phiên đọc lại từ máy chủ ở thiết bị nào
 * cũng được (`GET /api/warehouse/tasks/{tripId}`, `tripId` là mã số chuyến của máy chủ). Phiên đã xếp xong là màn Xếp xong (số seal); còn
 * bước soạn là bước Soạn hàng; soạn đủ là bước Xếp. Phiên không còn (xe đã rời kho, kiện hỏng đưa chuyến về lập kế hoạch) thì nói vì sao —
 * kiện hỏng vừa ghi trên máy này thì nói đúng lý do đó. Đã có phiên mà một lần đọc lại lỗi vì lý do khác thì giữ phiên đang hiện.
 */
export function ServerLoadingSessionScreen({ tripId }: { tripId: string }) {
  const t = useT()
  const query = useServerSession(tripId)
  const code = useTripCode(tripId)
  const [stopped, setStopped] = useState<SessionNotice | null>(null)

  if (query.isPending) {
    return (
      <Screen title={code} leading={<SessionExitButton />}>
        <LoadingState label={t('warehouse.loading')} />
      </Screen>
    )
  }
  if (query.isError && (query.data === undefined || unavailable(query.error))) {
    if (stopped !== null && unavailable(query.error)) return <WarehouseNotice tripId={code} title={stopped.title} description={stopped.description} />
    return unavailable(query.error) ? (
      <WarehouseNotice tripId={code} title={t('serverWarehouse.session.unavailableTitle')} description={dataErrorMessage(query.error, t)} />
    ) : (
      <WarehouseNotice
        tripId={code}
        title={t('warehouse.loadErrorTitle')}
        description={dataErrorMessage(query.error, t)}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    )
  }
  const session = query.data
  if (session.completed) return <ServerFinishedView tripId={tripId} session={session} />
  if (!session.stagingComplete) return <ServerStagingView tripId={tripId} session={session} />
  return <ServerLoadingView tripId={tripId} session={session} onStopped={setStopped} />
}

/** Mã chuyến để hiện ở dải trời trước khi có phiên: lấy từ danh sách chuyến đã tải (không đọc lại), không có thì mã số của máy chủ. */
function useTripCode(tripId: string): string {
  const client = useQueryClient()
  return client.getQueryData<ServerWarehouseTrip[]>(serverWarehouseKeys.trips)?.find((row) => row.id === tripId)?.code ?? tripId
}
