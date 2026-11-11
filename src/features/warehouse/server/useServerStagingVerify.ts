import { useMemo, useState } from 'react'

import type { ManualValues, VerifyCandidate, VerifyController, VerifyOutcome } from '@/components/verify/verify-types'
import { dataErrorMessage, useT } from '@/lib/i18n'
import type { LabelVerifyMethod } from '@/lib/mock-db'

import { placementLabel, type ServerStagingView } from '../server-loading'
import { codeMatches, type ServerLoadingSession } from '../warehouse-server-model'
import { serverStopText } from './ServerPackageSummary'
import { useStageServerPackage, useStageServerPackageManually } from './useServerWarehouseQueries'

/**
 * Bộ điều khiển tờ đối chiếu khi soạn hàng ở phiên máy chủ (như `handleVerify` / `handleManual` của `ServerStagingStep` web, cách của
 * `useStagingVerify` bản kho mẫu): không cần thứ tự. Máy chủ không kiểm mã khi ghi, nên app tìm kiện khớp mã (mã QR, mã vạch, mã của bên
 * gửi, mã kho kiện) trong phiên trước khi gửi — không khớp kiện nào thì nói và không gửi gì. Quét lại kiện đã soạn: máy chủ không ghi, tờ
 * nhắc "đã soạn rồi". Tờ ở lại cho kiện kế tiếp; soạn đủ thì màn sang bước xếp và tờ rời đi cùng màn. Xác nhận tay: kiện chỉ tính là đã soạn
 * khi điều phối viên duyệt — câu kết quả nói vậy (web: toast); kiện đang chờ duyệt không chọn lại được.
 */
export function useServerStagingVerify(tripId: string, session: ServerLoadingSession, view: ServerStagingView): VerifyController {
  const t = useT()
  const stage = useStageServerPackage(tripId)
  const manual = useStageServerPackageManually(tripId)
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<VerifyOutcome | null>(null)

  const candidates = useMemo(
    (): VerifyCandidate[] =>
      view.pending
        .filter((row) => !row.manualPending)
        .map(({ placement }) => ({ id: placement.id, label: placementLabel(placement), name: placement.name, description: serverStopText(placement, t) })),
    [view.pending, t],
  )

  function setOpenState(next: boolean) {
    setResult(null)
    setOpen(next)
  }

  async function verify(method: LabelVerifyMethod, code: string): Promise<boolean> {
    setResult(null)
    const placement = session.placements.find((item) => item.packageId !== null && codeMatches(item, code))
    if (placement?.packageId == null) {
      setResult({ tone: 'error', message: t('serverWarehouse.staging.codeUnknown', { code: code.trim() }) })
      return false
    }
    try {
      const { alreadyStaged } = await stage.mutateAsync({ packageId: placement.packageId, method })
      const params = { id: placementLabel(placement), name: placement.name }
      // Kiện đã soạn từ trước: máy chủ không ghi gì — nhắc bằng cảnh báo để người soạn biết lần này không có gì mới
      setResult(
        alreadyStaged
          ? { tone: 'warning', message: t('warehouse.staging.alreadyStaged', params) }
          : { tone: 'success', message: t('warehouse.staging.lastStaged', params) },
      )
      return true
    } catch (error) {
      setResult({ tone: 'error', message: dataErrorMessage(error, t) })
      return false
    }
  }

  async function confirmManually({ itemId, reason, note }: ManualValues): Promise<boolean> {
    setResult(null)
    const placement = session.placements.find((item) => item.id === itemId)
    if (placement?.packageId == null) return false
    try {
      await manual.mutateAsync({ packageId: placement.packageId, input: { reason, ...(note === undefined ? {} : { note }) } })
      const message = `${t('warehouse.staging.manualRecorded', { id: placementLabel(placement) })}\n${t('serverWarehouse.staging.manualDescription')}`
      setResult({ tone: 'warning', message })
      return true
    } catch (error) {
      setResult({ tone: 'error', message: dataErrorMessage(error, t) })
      return false
    }
  }

  return { open, setOpen: setOpenState, pending: stage.isPending || manual.isPending, result, candidates, verify, confirmManually }
}
