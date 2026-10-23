import { useMemo, useState } from 'react'

import type { ManualValues, VerifyCandidate, VerifyController, VerifyOutcome } from '@/components/verify/verify-types'
import type { ScenePlacement } from '@/features/viewer3d/scene-input'
import { dataErrorMessage, useT } from '@/lib/i18n'
import type { LabelVerifyMethod } from '@/lib/mock-db'

import { useConfirmStagingByQrMutation, useConfirmStagingManuallyMutation } from '../useWarehouseQueries'

type StagingVerifyInput = {
  readonly tripId: string
  /** Mọi kiện của phương án: tên kiện cho dòng kết quả, kể cả kiện vừa soạn (đã rời danh sách chờ). */
  readonly placements: readonly ScenePlacement[]
  /** Kiện chưa soạn: kiện chọn được ở mức xác nhận tay, và tờ đóng khi kiện cuối trong số này được ghi. */
  readonly pending: readonly ScenePlacement[]
}

/**
 * Bộ điều khiển tờ đối chiếu (`PackageVerifySheet`) khi soạn hàng (như `useStagingScan` của web): kho nhận mọi kiện chưa soạn của
 * chuyến, không cần thứ tự. Quét hoặc gõ đúng mã thì kiện sang "đã soạn" và tờ ở lại cho kiện kế tiếp — dòng kết quả nói kiện vừa soạn;
 * đối chiếu lại kiện đã soạn chỉ được nhắc "đã soạn rồi", kho không ghi gì; mã ngoài chuyến, mã của bên gửi trùng nhiều kiện thì nói lỗi
 * của nguồn. Ghi xong kiện cuối còn chờ thì hook đóng tờ — màn tự sang bước Xếp. Nhãn không đọc được: xác nhận tay một kiện chưa soạn kèm
 * lý do — kiện được tính là đã soạn để làm tiếp, chờ điều phối viên duyệt (web nói việc này bằng toast; ở đây câu đó là dòng kết quả của
 * tờ).
 */
export function useStagingVerify({ tripId, placements, pending }: StagingVerifyInput): VerifyController {
  const t = useT()
  const scan = useConfirmStagingByQrMutation(tripId)
  const manual = useConfirmStagingManuallyMutation(tripId)
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<VerifyOutcome | null>(null)

  const nameById = useMemo(() => new Map(placements.map((placement) => [placement.id, placement.name])), [placements])
  const candidates = useMemo(
    (): VerifyCandidate[] =>
      pending.map((placement) => ({
        id: placement.id,
        label: placement.id,
        name: placement.name,
        description: t('common.stop', { number: placement.stop }),
      })),
    [pending, t],
  )

  function setOpenState(next: boolean) {
    setResult(null)
    setOpen(next)
  }

  /** Nguồn đã trả lời về kiện `id`: nói kết quả; vừa ghi kiện cuối còn chờ thì đóng tờ — không còn gì để soạn. */
  function recorded(id: string, waiting: readonly string[], outcome: VerifyOutcome) {
    setResult(outcome)
    if (waiting.length > 0 && waiting.every((item) => item === id)) setOpenState(false)
  }

  function failed(error: unknown) {
    setResult({ tone: 'error', message: dataErrorMessage(error, t) })
  }

  /** `true` khi nguồn đã trả lời về một kiện của chuyến — ô gõ mã trống lại cho kiện kế tiếp; lỗi thì giữ mã đã gõ để sửa. */
  async function verify(method: LabelVerifyMethod, code: string): Promise<boolean> {
    const waiting = pending.map((placement) => placement.id)
    setResult(null)
    try {
      const { packageInstanceId: id, alreadyStaged } = await scan.mutateAsync({ method, code })
      const params = { id, name: nameById.get(id) ?? '' }
      // Kiện đã soạn từ trước: kho không ghi gì — nhắc bằng cảnh báo để người soạn biết lần này không có gì mới
      recorded(
        id,
        waiting,
        alreadyStaged
          ? { tone: 'warning', message: t('warehouse.staging.alreadyStaged', params) }
          : { tone: 'success', message: t('warehouse.staging.lastStaged', params) },
      )
      return true
    } catch (error) {
      failed(error)
      return false
    }
  }

  async function confirmManually({ itemId, reason, note }: ManualValues): Promise<boolean> {
    const waiting = pending.map((placement) => placement.id)
    setResult(null)
    try {
      const { packageInstanceId: id } = await manual.mutateAsync({ packageInstanceId: itemId, reason, ...(note === undefined ? {} : { note }) })
      // Câu của toast web (tiêu đề rồi mô tả), như dải xác nhận tay của thẻ "Đã xếp" ở bước Xếp
      const message = `${t('warehouse.staging.manualRecorded', { id })}\n${t('warehouse.scan.manualRecordedDescription')}`
      recorded(id, waiting, { tone: 'warning', message })
      return true
    } catch (error) {
      failed(error)
      return false
    }
  }

  return { open, setOpen: setOpenState, pending: scan.isPending || manual.isPending, result, candidates, verify, confirmManually }
}
