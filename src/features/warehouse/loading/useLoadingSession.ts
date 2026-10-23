import { useEffect, useMemo, useRef, useState } from 'react'

import type { ScenePlacement } from '@/features/viewer3d/scene-input'
import { dataErrorMessage, useT } from '@/lib/i18n'
import type { LoadingProgress } from '@/lib/mock-db'

import { loadingProgress } from '../loading-session'
import { useReportDamagedMutation } from '../useWarehouseQueries'

/** Thời gian tối thiểu hiện thẻ "Đã xếp" trước khi sang kiện kế tiếp (như web). */
export const CONFIRMED_OVERLAY_MS = 1200

/** Kiện vừa ghi "đã xếp": `nextStep` vắng khi vừa xếp kiện cuối; `manual` khi ghi bằng xác nhận tay, còn chờ điều phối viên duyệt. */
export type Confirmed = { readonly id: string; readonly nextStep: number | undefined; readonly manual: boolean }

/**
 * Bước xếp tại kho (như `useLoadingSession` của web): kiện hiện tại là kiện chưa có kết quả đầu tiên theo `loadingOrder`, đọc từ tiến độ
 * trong kho — mở lại màn là tiếp tục đúng chỗ. Kiện chỉ được ghi "đã xếp" qua tờ đối chiếu (`useLoadVerify`); ghi xong màn hiện thẻ "Đã
 * xếp" tối thiểu 1,2 giây và khoá các nút. Kiện hỏng thì báo hỏng: kho bỏ kiện lại, hoặc đưa chuyến về Đã lập kế hoạch khi có kiện tựa
 * lên nó. Kiện cuối có kết quả thì nguồn tự hoàn tất xếp (`warehouse-api`). Web báo kết quả kiện hỏng bằng toast; app không có toast nên
 * câu đó là `flash` — dải thông báo ở chân màn, người dùng ẩn được.
 */
export function useLoadingSession(tripId: string, placements: readonly ScenePlacement[], loading: LoadingProgress | undefined) {
  const t = useT()
  const progress = useMemo(() => loadingProgress(placements, loading), [placements, loading])
  const damaged = useReportDamagedMutation(tripId)
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null)
  const [holding, setHolding] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  /** Hiện thẻ "Đã xếp `id`" tối thiểu 1,2 giây sau khi tờ đối chiếu ghi xong. */
  function celebrate(id: string, nextStep: number | undefined, manual = false) {
    // Kiện cuối: phiên có thể đã sang màn Xếp xong (màn này gỡ ra) trước khi lệnh ghi trả về — không hẹn giờ cho màn đã gỡ
    if (!mounted.current) return
    setFlash(null)
    setConfirmed({ id, nextStep, manual })
    setHolding(true)
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      setHolding(false)
    }, CONFIRMED_OVERLAY_MS)
  }

  /**
   * Báo kiện `id` hỏng. Kho đã ghi thì trả `null` và dải ở chân màn nói kiện bị bỏ lại — xếp tiếp —, hay chuyến phải xếp lại theo phương
   * án mới (phiên khi đó sang màn "Chờ điều phối tối ưu lại"); kho từ chối thì trả câu lỗi để tờ hỏi lại hiện tại chỗ.
   */
  async function reportDamaged(id: string): Promise<string | null> {
    // Thẻ "Đã xếp" chỉ dành cho kiện vừa xếp: không để lần báo hỏng làm hiện lại thẻ của kiện trước
    setConfirmed(null)
    setFlash(null)
    try {
      const trip = await damaged.mutateAsync(id)
      setFlash(
        trip.phase === 'planning'
          ? `${t('warehouse.damaged.replan', { id })}\n${t('warehouse.damaged.replanDescription')}`
          : `${t('warehouse.damaged.recorded', { id })}\n${t('warehouse.damaged.recordedDescription')}`,
      )
      return null
    } catch (error) {
      return dataErrorMessage(error, t)
    }
  }

  return {
    ...progress,
    /** Đang hiện thẻ "Đã xếp" hoặc đang ghi kiện hỏng: các nút của bước chờ. */
    busy: holding || damaged.isPending,
    /** Thẻ "Đã xếp": giữ tới khi hết thời gian tối thiểu, để không lộ lại kiện vừa xác nhận. */
    confirmed: confirmed !== null && holding ? confirmed : null,
    reporting: damaged.isPending,
    flash,
    dismissFlash: () => setFlash(null),
    celebrate,
    reportDamaged,
  }
}

export type LoadingSession = ReturnType<typeof useLoadingSession>
