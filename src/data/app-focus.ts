import { focusManager } from '@tanstack/react-query'
import { AppState, type AppStateStatus } from 'react-native'

/** App đang ở tiền cảnh: chỉ `active`. `background` và `inactive` (iOS đang chuyển app, kéo thanh thông báo) coi là không nhìn thấy. */
export function isForeground(status: AppStateStatus): boolean {
  return status === 'active'
}

/**
 * Nối `focusManager` của TanStack Query với `AppState` của React Native (mặc định nó nghe sự kiện của cửa sổ trình duyệt — trên điện
 * thoại không có): app xuống nền thì nhịp đọc lại (`refetchInterval`) dừng, không tốn pin và dữ liệu; quay lại tiền cảnh thì truy vấn đã
 * cũ đọc lại ngay. Gọi một lần ở `Providers`; trả hàm gỡ.
 */
export function connectAppFocus(): () => void {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (status) => setFocused(isForeground(status)))
    return () => subscription.remove()
  })
  return () => focusManager.setEventListener(() => undefined)
}
