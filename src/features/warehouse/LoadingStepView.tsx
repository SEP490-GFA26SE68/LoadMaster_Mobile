import { PackageX } from 'lucide-react-native'
import { useMemo } from 'react'

import { Banner } from '@/components/Banner'
import { Screen } from '@/components/Screen'
import { restingOnIds } from '@/domain/constraints'
import { pendingManualConfirms, type Revision, type Trip } from '@/lib/mock-db'

import { ConfirmNotices } from './ConfirmNotices'
import { AllRecordedCard, CompleteAction } from './loading/AllRecorded'
import { ConfirmedPanel } from './loading/ConfirmedPanel'
import { InstructionCard } from './loading/InstructionCard'
import { LoadingActions } from './loading/LoadingActions'
import { useLoadingSession } from './loading/useLoadingSession'
import { useLoadVerify } from './loading/useLoadVerify'
import { PlanNotices } from './PlanNotices'
import { SessionExitButton } from './SessionExitButton'
import { StepHeader } from './StepHeader'
import { useSessionScene } from './useSessionScene'
import { useWarehouseCapabilities } from './useWarehouseQueries'

export type LoadingStepViewProps = {
  /** Chuyến đang ở bước Xếp (pha `loading`, mọi kiện của phương án đã soạn). */
  readonly trip: Trip
  /** Phương án kho chốt lúc bắt đầu (`warehousePlan`). */
  readonly plan: Revision
}

/**
 * Bước Xếp của phiên kho (như `LoadingSessionView` của web), một thao tác mỗi màn: đối chiếu kiện của bước hiện tại. Bước đi theo
 * `loadingOrder` của bản duyệt chốt lúc bắt đầu, tiến độ ghi vào kho — mở lại là tiếp tục ở kiện chưa ghi đầu tiên.
 * - Còn kiện: thẻ hướng dẫn (mã, điểm giao, vùng, sơ đồ thùng nhìn từ trên thay khung 3D, vị trí, hướng đặt, khoảng cách) và chân màn
 *   "Kiện hỏng" (phụ) · "Đối chiếu kiện" (chính). Mỗi kiện **phải đối chiếu**: quét / gõ đúng mã là "đã xếp", sai kiện thì tờ nói rõ cả
 *   hai kiện và không ghi gì, nhãn không đọc được thì xác nhận tay chờ điều phối viên duyệt. Ghi xong: thẻ "Đã xếp" tối thiểu 1,2 giây.
 * - Kiện cuối có kết quả: nguồn tự hoàn tất xếp, phiên sang màn Xếp xong. Còn xác nhận tay chờ duyệt (hoặc lần hoàn tất không thành) thì
 *   ở lại đây với "Hoàn tất xếp hàng" — mờ kèm lý do khi còn chờ duyệt.
 * Không có nút "Xác nhận đã xếp" không đối chiếu, không báo thiếu ở bước này: kiện thiếu đã xử lý ở bước soạn.
 */
export function LoadingStepView({ trip, plan }: LoadingStepViewProps) {
  const model = useSessionScene(trip, plan)
  const capabilities = useWarehouseCapabilities()
  const session = useLoadingSession(trip.id, model.placements, trip.loading)
  const verify = useLoadVerify({ tripId: trip.id, model, pending: session.pending, onConfirmed: session.celebrate })
  const { current, damaged } = session
  const pendingConfirms = pendingManualConfirms(trip, 'STAGING').length + pendingManualConfirms(trip, 'LOADING').length
  const loadedIds = useMemo(
    () => new Set(trip.loading?.steps.filter((step) => step.outcome === 'loaded').map((step) => step.packageInstanceId)),
    [trip.loading],
  )
  // Kiện tựa lên kiện đang hỏi trong phương án, trừ kiện cũng đã bị bỏ lại kho: tờ "Kiện hỏng" nói trước hệ quả. Đọc thẳng placement của
  // kết quả (không qua `model`) vì đó đúng là dữ liệu kho dùng để quyết bỏ kiện lại hay đưa chuyến về lập kế hoạch
  const resting = useMemo(() => {
    if (current === undefined) return 0
    const leftOut = new Set(damaged.map((placement) => placement.id))
    return restingOnIds(plan.result.placements, current.id).filter((id) => !leftOut.has(id)).length
  }, [current, damaged, plan.result.placements])

  return (
    <Screen
      title={trip.id}
      leading={<SessionExitButton />}
      below={<StepHeader kind="loading" step={current?.step ?? session.total} total={session.total} recorded={session.recorded} />}
      scroll
      footer={
        <>
          {/* Kết quả lần báo kiện hỏng vừa rồi (web: toast), trên mọi hàng nút: kiện hỏng là kiện cuối thì chân màn đã là nút hoàn tất */}
          {session.flash === null ? null : (
            <Banner tone="warning" icon={PackageX} onDismiss={session.dismissFlash}>
              {session.flash}
            </Banner>
          )}
          {current === undefined ? (
            <CompleteAction tripId={trip.id} pendingConfirms={pendingConfirms} busy={session.busy} />
          ) : (
            <LoadingActions current={current} session={session} verify={verify} manualAllowed={capabilities.manualConfirm} resting={resting} />
          )}
        </>
      }>
      <PlanNotices model={model} />
      <ConfirmNotices trip={trip} />
      {session.confirmed !== null ? (
        <ConfirmedPanel confirmed={session.confirmed} pendingConfirms={pendingConfirms} />
      ) : current === undefined ? (
        <AllRecordedCard pendingConfirms={pendingConfirms} />
      ) : (
        <InstructionCard placement={current} model={model} loadedIds={loadedIds} />
      )}
    </Screen>
  )
}
