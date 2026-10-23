import { useEffect, useRef } from 'react'

import { Screen } from '@/components/Screen'
import { LoadingState } from '@/components/StateView'
import { dataErrorMessage, useT, type TFunction } from '@/lib/i18n'
import type { Trip } from '@/lib/mock-db'

import { LoadingFinishedView } from './LoadingFinishedView'
import { loadingStep, warehouseSession } from './loading-session'
import { LoadingStepView } from './LoadingStepView'
import { SessionExitButton } from './SessionExitButton'
import { StagingStepView } from './StagingStepView'
import { useStartLoadingMutation, useWarehouseTrip } from './useWarehouseQueries'
import { WarehouseNotice } from './WarehouseNotice'

/**
 * Phiên soạn → xếp một chuyến ở kho (như `LoadingStepPage` của web), theo pha và revision của chuyến trong kho (`warehouseSession`):
 * - vào chuyến đã duyệt mà chưa bắt đầu là bắt đầu ngay theo bản duyệt mới nhất (một lần), rồi sang bước Soạn hàng;
 * - đang ở kho: còn kiện chưa soạn là bước Soạn hàng (`StagingStepView`), soạn đủ là bước Xếp (`LoadingStepView`) — tiếp tục ở kiện
 *   chưa ghi đầu tiên; đã xếp xong là màn Xếp xong (`LoadingFinishedView`);
 * - không xếp được thì nói vì sao (`WarehouseNotice`): chưa có bản duyệt; bản duyệt lỗi thời chờ duyệt lại; chuyến vừa quay về chờ điều
 *   phối tối ưu lại (bỏ kiện thiếu, kiện hỏng có kiện tựa lên — kèm việc kho phải làm); chuyến đã huỷ (huỷ lúc đang xếp thì nhắc dỡ phần
 *   đã xếp); không tải được.
 * Mọi màn đều có lối về danh sách chuyến (`SessionExitButton`). Đã có chuyến mà một lần đọc lại lỗi thì màn giữ chuyến đang hiện, không
 * bỏ phiên giữa chừng.
 */
export function LoadingSessionScreen({ tripId }: { tripId: string }) {
  const t = useT()
  const query = useWarehouseTrip(tripId)

  if (query.isPending) return <SessionStatus tripId={tripId} label={t('warehouse.loading')} />
  if (query.data === undefined) {
    return (
      <WarehouseNotice
        tripId={tripId}
        title={t('warehouse.loadErrorTitle')}
        description={dataErrorMessage(query.error, t)}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    )
  }
  const { trip, revisions } = query.data
  const session = warehouseSession(trip, revisions)
  switch (session.kind) {
    case 'no-plan':
      return <WarehouseNotice tripId={tripId} title={t('warehouse.emptyTitle')} description={t('warehouse.emptyTripDescription', { tripId })} />
    case 'cancelled':
      return <WarehouseNotice tripId={tripId} title={t('warehouse.cancelledTitle')} description={cancelledText(trip, t)} />
    case 'stale':
      return trip.replan === undefined ? (
        <WarehouseNotice tripId={tripId} showTrip title={t('warehouse.staleTitle')} description={t('warehouse.staleDescription', { tripId })} />
      ) : (
        <WarehouseNotice tripId={tripId} showTrip title={t('warehouse.replan.title')} description={replanText(trip.replan, tripId, t)} />
      )
    case 'start':
      return <StartingSession tripId={tripId} />
    case 'loading':
      return loadingStep(trip, session.plan) === 'staging' ? <StagingStepView trip={trip} plan={session.plan} /> : <LoadingStepView trip={trip} plan={session.plan} />
    case 'finished':
      return <LoadingFinishedView trip={trip} plan={session.plan} />
  }
}

/** Chuyến đã huỷ: lý do của điều phối viên; huỷ lúc đang xếp thì thêm câu nhắc dỡ các kiện đã lên xe. */
function cancelledText(trip: Trip, t: TFunction): string {
  const loaded = trip.loading?.steps.filter((step) => step.outcome === 'loaded').length ?? 0
  const cancelled = t('warehouse.cancelledDescription', { tripId: trip.id, reason: trip.cancellation?.reason ?? '' })
  return loaded > 0 ? `${cancelled} ${t('warehouse.cancelledUnload', { count: loaded })}` : cancelled
}

/** Chuyến vừa từ Đang xếp hàng quay về Đã lập kế hoạch: lý do, và khi đã có kiện lên xe thì việc kho phải làm. */
function replanText(replan: NonNullable<Trip['replan']>, tripId: string, t: TFunction): string {
  const reason = t(`warehouse.replan.${replan.reason}`, { tripId })
  return replan.unload ? `${reason} ${t('warehouse.replan.unload')}` : reason
}

/** Đang tải / đang bắt đầu: dải trời mang mã chuyến và lối thoát (lúc chờ vẫn có đường ra), thân là vòng quay kèm câu nói đang làm gì. */
function SessionStatus({ tripId, label }: { tripId: string; label: string }) {
  return (
    <Screen title={tripId} leading={<SessionExitButton />}>
      <LoadingState label={label} />
    </Screen>
  )
}

/**
 * Vào phiên của chuyến đã duyệt là bắt đầu soạn hàng (Đã lập kế hoạch → Đang xếp hàng). Lệnh chỉ xong khi chuyến đã được đọc lại, nên
 * màn chuyển thẳng sang bước Soạn hàng. Bị từ chối vì máy khác vừa bắt đầu trước thì lần đọc lại đó cũng đưa vào phiên; lỗi khác thì nói
 * lỗi, cho thử lại và có lối về danh sách.
 */
function StartingSession({ tripId }: { tripId: string }) {
  const t = useT()
  const { mutate, isError, error } = useStartLoadingMutation(tripId)
  const requested = useRef(false)

  useEffect(() => {
    // Chế độ phát triển chạy effect hai lần: ref giữ để chỉ gửi một lệnh bắt đầu
    if (requested.current) return
    requested.current = true
    mutate()
  }, [mutate])

  if (isError) {
    return <WarehouseNotice tripId={tripId} title={t('warehouse.startErrorTitle')} description={dataErrorMessage(error, t)} onRetry={() => mutate()} />
  }
  return <SessionStatus tripId={tripId} label={t('warehouse.starting')} />
}
