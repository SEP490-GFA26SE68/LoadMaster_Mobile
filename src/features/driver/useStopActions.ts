import { useState } from 'react'

import { dataErrorMessage, useT } from '@/lib/i18n'

import type { StopScreen } from './driver-model'
import type { IssueFormValues } from './issue-form.schema'
import { useArriveMutation, useCompleteStopMutation, useReportIssueMutation, useStartDeliveryMutation } from './useDriverQueries'

/**
 * Câu báo ngay trên nút chính ở chân màn: lỗi của lần ghi vừa rồi, cảnh báo (khách từ chối), hoặc việc đã ghi mà màn không tự cho thấy
 * (sự cố trên đường). App không có toast: câu nằm trong luồng màn, ẩn được, và gắn với điểm đang giao — sang điểm khác là hết.
 */
export type Flash = { readonly tone: 'danger' | 'warning' | 'success'; readonly message: string }

/**
 * Thao tác của tài xế ở điểm giao (như `useDeliveryStop` của web): xuất phát, "Đã đến", báo sự cố, hoàn tất điểm. Dỡ hàng đi qua tờ đối
 * chiếu (`useUnloadVerify`). Ghi xong mà màn đã cho thấy kết quả (dòng kiện, bước kế tiếp) thì không có câu thành công.
 */
export function useStopActions(tripId: string, screen: StopScreen) {
  const t = useT()
  const start = useStartDeliveryMutation(tripId)
  const arrival = useArriveMutation(tripId)
  const report = useReportIssueMutation(tripId)
  const complete = useCompleteStopMutation(tripId)
  const [flash, setFlash] = useState<(Flash & { readonly stop: string }) | null>(null)

  const show = (next: Flash) => setFlash({ ...next, stop: screen.stop.ref })
  const fail = (error: unknown) => show({ tone: 'danger', message: dataErrorMessage(error, t) })

  function startDelivery() {
    setFlash(null)
    start.mutate(undefined, { onError: fail })
  }

  /** Ghi giờ đến điểm đang giao: từ lúc này mới dỡ hàng được. */
  function arrive() {
    setFlash(null)
    arrival.mutate(screen.stop, { onError: fail })
  }

  /** `null` khi nguồn đã ghi sự cố; lỗi thì trả câu để tờ báo sự cố hiện ngay trong tờ và giữ nguyên dữ liệu đang nhập. */
  async function reportIssue({ packageInstanceId, kind, note }: IssueFormValues): Promise<string | null> {
    try {
      await report.mutateAsync({ stop: screen.stop, itemId: packageInstanceId, kind, note: note === '' ? undefined : note })
      if (kind === 'refused') {
        const label = screen.items.find((item) => item.id === packageInstanceId)?.label ?? packageInstanceId
        show({ tone: 'warning', message: t('driver.issue.refusedRecorded', { id: label }) })
      }
      return null
    } catch (error) {
      return dataErrorMessage(error, t)
    }
  }

  /** `null` khi nguồn đã hoàn tất điểm — màn sang điểm kế tiếp hoặc tổng kết; lỗi thì trả câu để tờ hỏi lại hiện. */
  async function completeStop(): Promise<string | null> {
    try {
      await complete.mutateAsync(screen.stop)
      return null
    } catch (error) {
      return dataErrorMessage(error, t)
    }
  }

  return {
    flash: flash?.stop === screen.stop.ref ? flash : null,
    show,
    dismissFlash: () => setFlash(null),
    startDelivery,
    starting: start.isPending,
    arrive,
    arriving: arrival.isPending,
    reportIssue,
    reporting: report.isPending,
    completeStop,
    completing: complete.isPending,
  }
}

export type StopActions = ReturnType<typeof useStopActions>
