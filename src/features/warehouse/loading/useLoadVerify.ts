import { useMemo, useState } from 'react'

import type { ManualValues, VerifyCandidate, VerifyController, VerifyOutcome } from '@/components/verify/verify-types'
import type { ViewerSceneModel } from '@/features/viewer3d/scene-input'
import { dataErrorMessage, useT, type TFunction } from '@/lib/i18n'
import type { LabelVerifyMethod } from '@/lib/mock-db'

import { useConfirmLoadingByQrMutation, useConfirmLoadingManuallyMutation } from '../useWarehouseQueries'

/** Kiện vừa đưa không phải kiện của bước (`WRONG_PACKAGE_SCANNED`): mã kiện bước cần và mã kiện vừa đưa; lỗi khác thì `undefined`. */
function wrongPackage(error: unknown): { readonly expected: string; readonly scanned: string } | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const { code, params } = error as { code?: unknown; params?: Record<string, unknown> }
  if (code !== 'WRONG_PACKAGE_SCANNED') return undefined
  const expected = params?.expected
  const scanned = params?.scanned
  return typeof expected === 'string' && typeof scanned === 'string' ? { expected, scanned } : undefined
}

/** Đưa sai kiện: câu riêng nêu cả hai mã kèm tên kiện; lỗi khác của nguồn dùng câu chung (`dataErrorMessage`). */
function errorMessage(error: unknown, names: ReadonlyMap<string, string>, t: TFunction): string {
  const wrong = wrongPackage(error)
  if (wrong === undefined) return dataErrorMessage(error, t)
  return t('warehouse.scan.wrongPackage', {
    scanned: wrong.scanned,
    scannedName: names.get(wrong.scanned) ?? wrong.scanned,
    expected: wrong.expected,
    expectedName: names.get(wrong.expected) ?? wrong.expected,
  })
}

type LoadVerifyOptions = {
  readonly tripId: string
  readonly model: Pick<ViewerSceneModel, 'placements' | 'unplaced'>
  /** Kiện chưa có kết quả theo thứ tự xếp; phần tử đầu là kiện của bước hiện tại. */
  readonly pending: ViewerSceneModel['placements']
  /** Nguồn đã ghi kiện `id`; `nextStep` là bước kế tiếp (vắng khi vừa xếp kiện cuối); `manual`: ghi bằng xác nhận tay, còn chờ duyệt. */
  readonly onConfirmed: (id: string, nextStep: number | undefined, manual: boolean) => void
}

/**
 * Bộ điều khiển tờ đối chiếu (`PackageVerifySheet`) khi xếp (như `useLoadingScan` của web) — cách duy nhất ghi một kiện "đã xếp": nguồn
 * chỉ nhận kiện của bước hiện tại. Quét hoặc gõ đúng mã thì nguồn ghi kèm cách đối chiếu, tờ đóng và màn hiện thẻ "Đã xếp"; mã của kiện
 * khác thì tờ ở lại và nói rõ kiện vừa đưa với kiện bước này cần — không ghi gì. Nhãn không đọc được: xác nhận tay kiện của bước hiện tại
 * kèm lý do — nguồn vẫn ghi "đã xếp" để làm tiếp, kèm một xác nhận tay chờ điều phối viên duyệt. Web có thêm lối in lại nhãn của kiện;
 * app không in nhãn nên không có lối đó.
 */
export function useLoadVerify({ tripId, model, pending, onConfirmed }: LoadVerifyOptions): VerifyController {
  const t = useT()
  const scan = useConfirmLoadingByQrMutation(tripId)
  const manual = useConfirmLoadingManuallyMutation(tripId)
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<VerifyOutcome | null>(null)

  // Tên kiện theo phương án của phiên (luôn có sẵn, không chờ tải nhãn): câu báo sai kiện nêu được tên cả kiện chưa xếp được
  const names = useMemo(
    () => new Map([...model.unplaced, ...model.placements].map((item) => [item.id, item.name] as const)),
    [model.unplaced, model.placements],
  )

  // Xếp theo thứ tự: chỉ kiện của bước hiện tại xác nhận tay được
  const [current] = pending
  // Hết kiện chưa có kết quả (kể cả khi lần ghi kiện cuối báo lỗi vì không hoàn tất xếp được): tờ không còn gì để đối chiếu — quên nó,
  // không để tờ cũ kèm câu lỗi cũ bật lại khi có kiện quay về bước xếp
  if (current === undefined && (open || result !== null)) {
    setOpen(false)
    setResult(null)
  }
  const candidates = useMemo(
    (): VerifyCandidate[] =>
      current === undefined ? [] : [{ id: current.id, label: current.id, name: current.name, description: t('common.stop', { number: current.stop }) }],
    [current, t],
  )

  function setOpenState(next: boolean) {
    setResult(null)
    setOpen(next)
  }

  /** `true` khi nguồn đã ghi kiện; lỗi thì tờ ở lại, giữ mã đã gõ để sửa. */
  async function verify(method: LabelVerifyMethod, code: string): Promise<boolean> {
    const nextStep = pending[1]?.step
    setResult(null)
    try {
      const { packageInstanceId } = await scan.mutateAsync({ method, code })
      setOpenState(false)
      onConfirmed(packageInstanceId, nextStep, false)
      return true
    } catch (error) {
      setResult({ tone: 'error', message: errorMessage(error, names, t) })
      return false
    }
  }

  async function confirmManually({ itemId, reason, note }: ManualValues): Promise<boolean> {
    const nextStep = pending[1]?.step
    setResult(null)
    try {
      const { packageInstanceId } = await manual.mutateAsync({ packageInstanceId: itemId, reason, ...(note === undefined ? {} : { note }) })
      setOpenState(false)
      onConfirmed(packageInstanceId, nextStep, true)
      return true
    } catch (error) {
      setResult({ tone: 'error', message: errorMessage(error, names, t) })
      return false
    }
  }

  return { open, setOpen: setOpenState, candidates, result, pending: scan.isPending || manual.isPending, verify, confirmManually }
}
