import { useRouter } from 'expo-router'

import { useAuth } from '@/features/auth/AuthProvider'
import { homeOf } from '@/features/auth/landing'

/**
 * Nút "Về màn chính" của màn lỗi: mở màn chính của người đang dùng (`homeOf`) bằng `replace`. Route đang lỗi được thay bằng một route
 * mới, nên màn chính dựng lại từ đầu — `navigate` / `dismissTo` tới nhóm đang lỗi chỉ đổi tham số của route cũ và màn lỗi vẫn nằm đó —
 * và nút quay lại không đưa người dùng về màn vừa rời.
 */
export function useReplaceWithHome(): () => void {
  const router = useRouter()
  const { user } = useAuth()
  return () => router.replace(homeOf(user))
}

/**
 * Nút "Về màn chính" của màn không tìm thấy: về màn chính ngay trong nhóm đang mở. Liên kết lạ mở lúc app đang chạy chồng màn này lên
 * nhóm đó (`(app)` hoặc `sign-in`): gỡ mọi màn chồng lên nhóm (`dismissAll`), rồi `dismissTo` lùi về màn chính đã có và gỡ cả màn mở
 * chồng trong nhóm (một chuyến, thông báo). `replace` ở đây dựng thêm một bản thứ hai của nhóm: bản cũ vẫn chạy ngầm (truy vấn đọc lại
 * theo nhịp, GPS) và nút quay lại đưa về nó. Mở lạnh bằng địa chỉ lạ thì bên dưới không có gì: `dismissTo` thay màn này bằng màn chính.
 */
export function useReturnHome(): () => void {
  const router = useRouter()
  const { user } = useAuth()
  return () => {
    if (router.canDismiss()) router.dismissAll()
    router.dismissTo(homeOf(user))
  }
}
