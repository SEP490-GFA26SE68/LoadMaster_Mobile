import { OfflineGate } from '@/components/OfflineGate'
import { OpenTripsScreen } from '@/features/driver/OpenTripsScreen'

/** Tab Chuyến đang mở (tài xế); mất mạng khi đọc ghi máy chủ thì có dải "Mất kết nối" và nút ghi mờ. */
export default function OpenTripsRoute() {
  return (
    <OfflineGate feature="driver">
      <OpenTripsScreen />
    </OfflineGate>
  )
}
