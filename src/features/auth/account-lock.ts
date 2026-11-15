import { isPlatformRole, type User } from '@/types/user'

/**
 * Vì sao tài khoản đang đăng nhập không dùng được màn nào của app (chỉ khi đăng nhập bằng backend — người dùng của kho mẫu không mang
 * các cờ này), như `AppShell` của bản web:
 *   flagged             — tài khoản dùng thử bị gắn cờ vì công ty chưa ký thoả thuận dịch vụ trong 72 giờ (mọi vai trò);
 *   subscriptionExpired — công ty chưa có gói cước còn hiệu lực. Máy chủ từ chối nhân sự công ty trừ quản trị công ty (việc gia hạn của họ
 *                         ở bản web, trên app họ chỉ có màn Tài khoản); ba vai trò nền tảng không thuộc công ty nào.
 */
export type AccountLock = 'flagged' | 'subscriptionExpired'

export function accountLockOf(user: User | null): AccountLock | null {
  if (user === null) return null
  if (user.status === 'flagged') return 'flagged'
  if (user.subscriptionExpired === true && !isPlatformRole(user.role) && user.role !== 'companyAdmin') return 'subscriptionExpired'
  return null
}

/** Người dùng sau khi máy chủ từ chối bằng mã khoá (`ACCOUNT_LOCK_CODES`) mà app không đọc lại được hồ sơ: tin mã máy chủ vừa trả. */
export function lockedUser(user: User, code: string): User {
  if (code === 'ACCOUNT_FLAGGED') return { ...user, status: 'flagged' }
  if (code === 'SUBSCRIPTION_EXPIRED') return { ...user, subscriptionExpired: true }
  return user
}
