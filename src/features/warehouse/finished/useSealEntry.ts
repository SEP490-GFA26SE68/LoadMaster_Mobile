import { useState } from 'react'

import { dataErrorMessage, useT } from '@/lib/i18n'
import type { Trip } from '@/lib/mock-db'

import { useRecordSealMutation, useWarehouseCapabilities } from '../useWarehouseQueries'

export type SealEntry = {
  /** Nguồn dữ liệu ghi được số seal (`useWarehouseCapabilities().seal`); không thì màn không có phần niêm phong. */
  readonly available: boolean
  /** Còn ghi / đổi được: nguồn ghi được và chuyến còn ở kho (`loaded`). Xe đã rời kho thì chỉ đọc. */
  readonly editable: boolean
  /** Tờ nhập số seal đang mở. */
  readonly open: boolean
  /** Lần mở tờ thứ mấy: nơi gọi đặt làm `key` của tờ để form bắt đầu lại mỗi lần mở. */
  readonly session: number
  readonly pending: boolean
  /** Câu lỗi của lần ghi gần nhất (`dataErrorMessage`): hiện trong tờ khi tờ còn mở, ở thẻ niêm phong khi tờ đã đóng. */
  readonly failure: string | null
  readonly start: () => void
  readonly cancel: () => void
  readonly submit: (sealNumber: string) => Promise<void>
}

/**
 * Việc ghi số seal của màn Xếp xong (như `SealCard` của web, nhập trong tờ trượt từ đáy): mở tờ, ghi, lỗi của lần ghi. Ghi xong thì tờ
 * đóng — lệnh ghi chỉ xong khi chuyến đã được đọc lại, nên thẻ niêm phong đã hiện số vừa ghi. Kho từ chối thì tờ giữ chữ đang nhập kèm câu
 * lỗi. Xe rời kho trong lúc tờ mở (tài xế vừa xuất phát, lần ghi bị từ chối rồi đọc lại) thì tờ tự đóng, không tự mở lại, và câu lỗi
 * chuyển xuống thẻ niêm phong.
 */
export function useSealEntry(trip: Pick<Trip, 'id' | 'phase'>): SealEntry {
  const t = useT()
  const { seal: available } = useWarehouseCapabilities()
  const record = useRecordSealMutation(trip.id)
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState(0)
  const [failure, setFailure] = useState<string | null>(null)
  const editable = available && trip.phase === 'loaded'
  // Tờ đã tự đóng vì xe rời kho: quên lần mở, để tờ không mở lại
  if (open && !editable) setOpen(false)

  return {
    available,
    editable,
    open: open && editable,
    session,
    pending: record.isPending,
    failure,
    start: () => {
      setFailure(null)
      setSession((value) => value + 1)
      setOpen(true)
    },
    cancel: () => {
      setOpen(false)
      setFailure(null)
    },
    submit: async (sealNumber) => {
      setFailure(null)
      try {
        await record.mutateAsync(sealNumber)
        setOpen(false)
      } catch (error) {
        setFailure(dataErrorMessage(error, t))
      }
    },
  }
}
