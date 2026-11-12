import { OfflineGate } from '@/components/OfflineGate'
import { PackageLookupScreen } from '@/features/lookup/PackageLookupScreen'

/** Tab Tra cứu kiện; mất mạng khi đọc ghi máy chủ thì có dải "Mất kết nối" và nút ghi mờ. */
export default function LookupRoute() {
  return (
    <OfflineGate feature="packages">
      <PackageLookupScreen />
    </OfflineGate>
  )
}
