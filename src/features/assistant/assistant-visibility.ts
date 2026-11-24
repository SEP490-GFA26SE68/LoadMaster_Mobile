import { accountLockOf } from '@/features/auth/account-lock'
import type { User } from '@/types/user'

import { assistantCapabilities } from './assistant-api'

/**
 * Người này có nút trợ lý AI không — cùng điều kiện với `appAssistantShown` của bản web, thu về hai vai trò của app:
 * - nguồn `assistant` là máy chủ (đăng nhập bằng Keycloak); kho mẫu không có trợ lý nên không có nút;
 * - tài khoản không bị gắn cờ và công ty còn gói hiệu lực (`accountLockOf`): máy chủ từ chối trợ lý với họ như mọi API nghiệp vụ;
 * - tài xế hoặc nhân viên kho — hai vai trò có màn cảm ứng mang nút.
 */
export function assistantShown(user: User | null): boolean {
  if (user === null || !assistantCapabilities().available) return false
  if (accountLockOf(user) !== null) return false
  return user.role === 'driver' || user.role === 'warehouse'
}
