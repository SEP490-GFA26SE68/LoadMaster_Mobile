import { useState } from 'react'

import type { ManualValues, VerifyCandidate, VerifyController, VerifyOutcome } from '@/components/verify/verify-types'
import { dataErrorMessage, useT, type TFunction } from '@/lib/i18n'
import type { LabelVerifyMethod } from '@/lib/mock-db'

import type { StopScreen } from './driver-model'
import { useConfirmManuallyMutation, useConfirmUnloadMutation } from './useDriverQueries'

/** Kiện của điểm khác (`QR_WRONG_STOP`, cùng mã ở kho mẫu và backend): mã kiện và số điểm đúng; lỗi khác thì `undefined`. */
function wrongStop(error: unknown): { readonly id: string; readonly stop: number } | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const { code, params } = error as { code?: unknown; params?: Record<string, unknown> }
  if (code !== 'QR_WRONG_STOP') return undefined
  const id = params?.packageInstanceId
  const stop = params?.stopNumber
  return typeof id === 'string' && typeof stop === 'number' ? { id, stop } : undefined
}

function errorMessage(error: unknown, screen: StopScreen, t: TFunction): string {
  const wrong = wrongStop(error)
  if (wrong === undefined) return dataErrorMessage(error, t)
  return t('driver.scan.wrongStop', {
    id: wrong.id,
    name: screen.names[wrong.id] ?? wrong.id,
    stop: wrong.stop,
    stopName: screen.stops.find((stop) => stop.number === wrong.stop)?.name ?? '',
  })
}

/**
 * Bộ điều khiển tờ đối chiếu (`PackageVerifySheet`) khi dỡ hoặc nhận (như `useUnloadScan` của web) — cách duy nhất ghi một kiện "đã
 * dỡ": quét hoặc gõ đúng mã thì nguồn ghi kèm cách đối chiếu và tờ ở lại cho kiện kế tiếp; xong kiện cuối còn chờ của điểm thì hook đóng
 * tờ. Kiện của điểm khác: nói kiện đó thuộc điểm nào, không ghi gì. Nhãn không đọc được: xác nhận tay một kiện kèm lý do, chờ điều phối
 * viên duyệt — còn chờ thì chưa hoàn tất điểm.
 */
export function useUnloadVerify(tripId: string, screen: StopScreen): VerifyController {
  const t = useT()
  const scan = useConfirmUnloadMutation(tripId)
  const manual = useConfirmManuallyMutation(tripId)
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<VerifyOutcome | null>(null)

  const candidates: VerifyCandidate[] = [
    ...screen.items
      .filter((item) => !item.unloaded && !item.returned)
      .map((item) => ({ id: item.id, label: item.label, name: item.name, description: t('driver.item.order', { order: item.unloadingOrder }) })),
    ...screen.pickupItems
      .filter((item) => !item.done)
      .map((item) => ({ id: item.id, label: item.id, name: item.name, description: t('driver.pickup.candidate', { request: item.requestId }) })),
  ]

  function setOpenState(next: boolean) {
    setResult(null)
    setOpen(next)
  }

  /** Nguồn đã ghi kiện `id`: nói kết quả; kiện vừa ghi là kiện cuối còn chờ của điểm thì đóng tờ — không còn gì để đối chiếu. */
  function recorded(id: string, waiting: readonly string[], outcome: VerifyOutcome) {
    setResult(outcome)
    if (waiting.every((item) => item === id)) setOpenState(false)
  }

  function recordedOutcome(id: string): VerifyOutcome {
    const pickup = screen.pickupItems.find((item) => item.id === id)
    const item = screen.items.find((entry) => entry.id === id)
    const label = item?.label ?? id
    const name = item?.name ?? pickup?.name ?? screen.names[id] ?? ''
    return {
      tone: 'success',
      message: pickup?.role === 'pick' ? t('driver.pickup.lastPicked', { id: label, name }) : t('driver.scan.lastUnloaded', { id: label, name }),
    }
  }

  /** `true` khi nguồn đã ghi kiện — ô gõ mã trống lại cho kiện kế tiếp; lỗi thì giữ mã đã gõ để sửa. */
  async function verify(method: LabelVerifyMethod, code: string): Promise<boolean> {
    const waiting = candidates.map((candidate) => candidate.id)
    setResult(null)
    try {
      const { id } = await scan.mutateAsync({ stop: screen.stop, method, code })
      recorded(id, waiting, recordedOutcome(id))
      return true
    } catch (error) {
      setResult({ tone: 'error', message: errorMessage(error, screen, t) })
      return false
    }
  }

  async function confirmManually({ itemId, reason, note }: ManualValues): Promise<boolean> {
    const waiting = candidates.map((candidate) => candidate.id)
    setResult(null)
    try {
      const { id } = await manual.mutateAsync({ stop: screen.stop, itemId, reason, note })
      const label = candidates.find((candidate) => candidate.id === id)?.label ?? id
      // Còn chờ duyệt thì chưa hoàn tất điểm được: câu cảnh báo; tờ đóng thì dải "còn xác nhận tay chờ duyệt" ở chân màn nói tiếp
      recorded(id, waiting, { tone: 'warning', message: t('driver.scan.manualRecorded', { id: label }) })
      return true
    } catch (error) {
      setResult({ tone: 'error', message: errorMessage(error, screen, t) })
      return false
    }
  }

  return { open, setOpen: setOpenState, candidates, result, pending: scan.isPending || manual.isPending, verify, confirmManually }
}
