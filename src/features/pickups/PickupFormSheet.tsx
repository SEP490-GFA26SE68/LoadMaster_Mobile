import { Sheet } from '@/components/Sheet'

import type { PickupCreate } from './pickup-model'
import { usePickupFormView } from './usePickupFormView'

type PickupFormSheetProps = {
  open: boolean
  onClose: () => void
  /** Mã chuyến hiện cho người dùng. */
  tripCode: string
  create: PickupCreate
}

/**
 * Tờ "Nhận hàng dọc đường" đứng riêng — điều phối viên mở từ thẻ yêu cầu của màn giám sát một chuyến. Nơi gọi đổi `key` mỗi lần mở để
 * form bắt đầu lại. Tài xế mở cùng form từ tờ "Thêm" của màn điểm giao (`StopMoreActions`).
 */
export function PickupFormSheet({ open, onClose, tripCode, create }: PickupFormSheetProps) {
  const view = usePickupFormView({ tripCode, create, onClose })
  return (
    <Sheet open={open} onClose={onClose} busy={view.busy} title={view.title} description={view.description} footer={view.footer}>
      {view.body}
    </Sheet>
  )
}
