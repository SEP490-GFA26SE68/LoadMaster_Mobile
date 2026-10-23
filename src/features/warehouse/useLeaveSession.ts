import { useRouter } from 'expo-router'

import { WAREHOUSE_LIST } from './session-routes'

/**
 * Rời phiên soạn → xếp, về tab Kho (như `TripScreen` của tài xế về "Chuyến của tôi"). `dismissTo` đóng mọi màn chồng phía trên tới thanh
 * tab rồi chọn tab Kho — kể cả khi phiên được mở thẳng từ một thông báo (`/notifications` → `/loading/…`) hay một liên kết sâu: nhóm
 * `(app)` khai `initialRouteName: '(tabs)'` nên dưới phiên luôn có thanh tab để về. Mọi nút thoát và nút "Về danh sách chuyến" của phiên
 * gọi hàm này; không dùng `router.back()` (từ thông báo, lùi một bước là về màn thông báo).
 */
export function useLeaveSession(): () => void {
  const router = useRouter()
  return () => router.dismissTo(WAREHOUSE_LIST)
}
