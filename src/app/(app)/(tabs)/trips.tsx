import { OfflineGate } from '@/components/OfflineGate'
import { MyTripsScreen } from '@/features/driver/MyTripsScreen'

/** Tab Chuyến của tôi (tài xế); mất mạng khi đọc ghi máy chủ thì có dải "Mất kết nối" và nút ghi mờ. */
export default function MyTripsRoute() {
  return (
    <OfflineGate feature="driver">
      <MyTripsScreen />
    </OfflineGate>
  )
}
