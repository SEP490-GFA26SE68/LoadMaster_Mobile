import { useMemo, useState } from 'react'

import type { ManualValues, VerifyCandidate, VerifyController, VerifyOutcome } from '@/components/verify/verify-types'
import { dataErrorMessage, useT } from '@/lib/i18n'
import type { LabelVerifyMethod } from '@/lib/mock-db'

import { placementLabel } from '../server-loading'
import { codeMatches, type ServerPlacement } from '../warehouse-server-model'
import { serverStopText } from './ServerPackageSummary'
import { useConfirmServerPlacement, useConfirmServerPlacementManually } from './useServerWarehouseQueries'

/** Kết quả của một lần ghi kiện, màn nói ở chân màn (web: toast hoặc dòng kết quả trong hộp). */
export type LoadFlash = VerifyOutcome

/**
 * Bộ điều khiển tờ đối chiếu khi xếp ở phiên máy chủ (như `handleVerify` / `handleManual` của `ServerLoadingSession` web): chỉ kiện của bước
 * hiện tại — máy chủ từ chối xác nhận sai thứ tự. Máy chủ không kiểm mã khi ghi, nên app đối chiếu mã với kiện của bước trước khi gửi: mã của
 * kiện khác thì tờ ở lại, nói kiện bước này cần, không gửi gì. Đúng kiện thì máy chủ ghi đã xếp, tờ đóng và màn sang kiện kế tiếp; câu kết
 * quả đưa ra chân màn (`onRecorded`). Nhãn không đọc được: xác nhận tay kiện của bước, tính là đã xếp và chờ điều phối viên duyệt.
 */
export function useServerLoadVerify(
  tripId: string,
  current: ServerPlacement | undefined,
  onRecorded: (flash: LoadFlash) => void,
): VerifyController {
  const t = useT()
  const confirm = useConfirmServerPlacement(tripId)
  const manual = useConfirmServerPlacementManually(tripId)
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<VerifyOutcome | null>(null)

  // Kiện cuối đã có kết quả (máy khác vừa ghi): không còn gì để đối chiếu — quên tờ cũ và câu cũ
  if (current === undefined && (open || result !== null)) {
    setOpen(false)
    setResult(null)
  }
  const candidates = useMemo(
    (): VerifyCandidate[] =>
      current === undefined ? [] : [{ id: current.id, label: placementLabel(current), name: current.name, description: serverStopText(current, t) }],
    [current, t],
  )

  function setOpenState(next: boolean) {
    setResult(null)
    setOpen(next)
  }

  // Máy chủ ghi đã xếp không kèm cách đối chiếu: quét hay gõ mã như nhau
  async function verify(_method: LabelVerifyMethod, code: string): Promise<boolean> {
    setResult(null)
    if (current === undefined) return false
    if (!codeMatches(current, code)) {
      setResult({ tone: 'error', message: t('serverWarehouse.session.codeUnmatched', { code: code.trim(), name: current.name }) })
      return false
    }
    try {
      await confirm.mutateAsync(current.id)
      setOpenState(false)
      onRecorded({ tone: 'success', message: t('serverWarehouse.session.confirmed', { name: current.name }) })
      return true
    } catch (error) {
      setResult({ tone: 'error', message: dataErrorMessage(error, t) })
      return false
    }
  }

  async function confirmManually({ itemId, reason, note }: ManualValues): Promise<boolean> {
    setResult(null)
    if (current === undefined || current.id !== itemId) return false
    try {
      await manual.mutateAsync({ placementId: current.id, input: { reason, ...(note === undefined ? {} : { note }) } })
      setOpenState(false)
      const message = `${t('warehouse.scan.manualRecorded', { id: placementLabel(current) })}\n${t('warehouse.scan.manualRecordedDescription')}`
      onRecorded({ tone: 'warning', message })
      return true
    } catch (error) {
      setResult({ tone: 'error', message: dataErrorMessage(error, t) })
      return false
    }
  }

  return { open, setOpen: setOpenState, pending: confirm.isPending || manual.isPending, result, candidates, verify, confirmManually }
}
